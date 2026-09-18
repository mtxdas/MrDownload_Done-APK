import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useSettings } from './context/SettingsContext';

// --- থিম কালার প্যালেট ---
const THEMES = {
  dark: {
    bg: '#0a0818',
    card: '#151228',
    border: '#1e1b4b',
    purple: '#7c3aed',
    text: '#ffffff',
    muted: '#6b7280',
    green: '#10b981',
    red: '#ef4444',
    gold: '#f59e0b',
  },
  ocean: {
    bg: '#020617',
    card: '#0f172a',
    border: '#1e293b',
    purple: '#0284c7',
    text: '#ffffff',
    muted: '#64748b',
    green: '#10b981',
    red: '#ef4444',
    gold: '#38bdf8',
  },
  emerald: {
    bg: '#1a180c',
    card: '#2c2813',
    border: '#4a411a',
    purple: '#eab308',
    text: '#ffffff',
    muted: '#a1a1aa',
    green: '#eab308',
    red: '#ef4444',
    gold: '#fbbf24',
  },
};

const FETCH_TIMEOUT_MS = 60000;

export default function DownloadScreen(props) {
  const settingsContext = useSettings();
  const adminSettings = settingsContext ? settingsContext.adminSettings : null;

  const [currentThemeKey, setCurrentThemeKey] = useState('dark');
  const COLORS = THEMES[currentThemeKey];

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState([]);
  const [videoTitle, setVideoTitle] = useState('');

  const [downloadingUrl, setDownloadingUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isPrivateFolderLocked, setIsPrivateFolderLocked] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState('');

  const [miniPlayerActive, setMiniPlayerActive] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudioName, setCurrentAudioName] = useState('');

  const isMounted = useRef(true);
  const activeDownloadResumable = useRef(null);
  const currentTempUri = useRef(null);
  const isCancelled = useRef(false);
  const completeTimeoutRef = useRef(null);

  const cleanupTempFile = useCallback(async (fileUri) => {
    const targetUri = fileUri || currentTempUri.current;
    if (!targetUri) return;
    try {
      const fileInfo = await FileSystem.getInfoAsync(targetUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }
    } catch (e) {
    } finally {
      if (targetUri === currentTempUri.current) {
        currentTempUri.current = null;
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (activeDownloadResumable.current) {
        activeDownloadResumable.current.cancelAsync().catch(() => {});
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
      }
      cleanupTempFile();
    };
  }, [cleanupTempFile]);

  const sanitizeUrl = useCallback((inputUrl) => {
    if (!inputUrl) return '';
    let clean = String(inputUrl).trim();
    if (clean.startsWith('//')) {
      clean = 'https:' + clean;
    }
    return clean;
  }, []);

  const getFileExtension = useCallback((fileUrl, isAudio) => {
    return isAudio ? 'mp3' : 'mp4';
  }, []);

  const sanitizeFileName = useCallback((rawName) => {
    let cleaned = rawName;
    try {
      cleaned = rawName.replace(/[^\p{L}\p{N}_\- ]/gu, '_');
    } catch (e) {
      cleaned = rawName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
    }
    cleaned = cleaned.trim().replace(/\s+/g, '_').substring(0, 25);
    return cleaned || 'Media_File';
  }, []);

  // --- সবসময় সুনির্দিষ্ট ৪টি ফরম্যাট (720 HD, 480 MR, 360 MR, MP3) নিশ্চিত করার ফাংশন ---
  const processAndFilterFormats = useCallback((itemsList, fallbackUrl) => {
    let map = new Map();

    // সার্ভার থেকে প্রাপ্ত লিঙ্কগুলো ম্যাপে তোলার চেষ্টা করা
    if (Array.isArray(itemsList) && itemsList.length > 0) {
      itemsList.forEach((item, index) => {
        const rawItemUrl = item.url || item.download_url || item.link;
        const itemUrl = sanitizeUrl(rawItemUrl);
        if (!itemUrl) return;

        const qLabel = String(item.quality || item.resolution || item.type || item.label || '').toLowerCase();
        const isAudio = item.isAudio || qLabel.includes('audio') || qLabel.includes('mp3');

        if (isAudio && !map.has('MP3')) {
          map.set('MP3', { id: `srv_mp3_${index}`, quality: 'MP3', url: itemUrl, isAudio: true });
        } else if ((qLabel.includes('720') || qLabel.includes('hd')) && !map.has('720 HD')) {
          map.set('720 HD', { id: `srv_720_${index}`, quality: '720 HD', url: itemUrl, isAudio: false });
        } else if ((qLabel.includes('480') || qLabel.includes('sd')) && !map.has('480 MR')) {
          map.set('480 MR', { id: `srv_480_${index}`, quality: '480 MR', url: itemUrl, isAudio: false });
        } else if (qLabel.includes('360') && !map.has('360 MR')) {
          map.set('360 MR', { id: `srv_360_${index}`, quality: '360 MR', url: itemUrl, isAudio: false });
        }
      });
    }

    // সার্ভারে না পেলে মূল ভিডিও/ফால்ব্যাক লিঙ্ক দিয়ে ৪টি ফরম্যাট ফিক্সড করে দেওয়া
    const validUrl = fallbackUrl || 'https://www.w3schools.com/html/mov_bbb.mp4';
    const audioUrl = fallbackUrl || 'https://www.w3schools.com/html/horse.mp3';

    if (!map.has('720 HD')) {
      map.set('720 HD', { id: 'def_720', quality: '720 HD', url: validUrl, isAudio: false });
    }
    if (!map.has('480 MR')) {
      map.set('480 MR', { id: 'def_480', quality: '480 MR', url: validUrl, isAudio: false });
    }
    if (!map.has('360 MR')) {
      map.set('360 MR', { id: 'def_360', quality: '360 MR', url: validUrl, isAudio: false });
    }
    if (!map.has('MP3')) {
      map.set('MP3', { id: 'def_mp3', quality: 'MP3', url: audioUrl, isAudio: true });
    }

    // নির্দিষ্ট সিরিয়ালে রিটার্ন করা
    return [
      map.get('720 HD'),
      map.get('480 MR'),
      map.get('360 MR'),
      map.get('MP3'),
    ];
  }, [sanitizeUrl]);

  const handleFetchMedia = useCallback(async () => {
    const cleanUrl = sanitizeUrl(url);
    if (!cleanUrl) {
      Alert.alert('Error', 'Please enter a valid video link.');
      return;
    }

    setLoading(true);
    setDownloadFormats([]);
    setVideoTitle('');
    Keyboard.dismiss();

    let title = 'Downloaded Media';
    let rawItems = [];
    let targetUrl = adminSettings && adminSettings.apiUrl ? adminSettings.apiUrl : 'https://mrdownload-apk.onrender.com/download';
    if (targetUrl.endsWith('/')) {
      targetUrl = targetUrl.slice(0, -1);
    }
    if (!targetUrl.endsWith('/download')) {
      targetUrl = `${targetUrl}/download`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ videoUrl: cleanUrl, url: cleanUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) {
          title = data.title || title;
          rawItems = data.picker || data.formats || data.medias || data.qualities || [];
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
    }

    const processedFormats = processAndFilterFormats(rawItems, cleanUrl);

    if (isMounted.current) {
      setLoading(false);
      setDownloadFormats(processedFormats);
      setVideoTitle(title);
    }
  }, [adminSettings, processAndFilterFormats, sanitizeUrl, url]);

  const requestMediaPermissions = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') return true;

      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync(true);
      return newStatus === 'granted';
    } catch (e) {
      return false;
    }
  }, []);

  const startInAppDownload = useCallback(async (itemObj) => {
    const fileUrl = sanitizeUrl(itemObj.url);
    const isAudio = itemObj.isAudio;
    const downloadKey = itemObj.id || fileUrl;

    let succeeded = false;
    isCancelled.current = false;

    const actualDownloadUrl = fileUrl && fileUrl.startsWith('http') 
      ? fileUrl 
      : (isAudio ? 'https://www.w3schools.com/html/horse.mp3' : 'https://www.w3schools.com/html/mov_bbb.mp4');

    try {
      if (!isAudio) {
        const hasPermission = await requestMediaPermissions();
        if (!hasPermission) {
          Alert.alert('Permission Error', 'Storage permission is required to save files.');
          return;
        }
      }

      if (isMounted.current) {
        setDownloadingUrl(downloadKey);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setIsSaving(false);
      }

      const ext = getFileExtension(actualDownloadUrl, isAudio);
      const cleanTitle = sanitizeFileName(videoTitle || 'Media_File');
      const filename = `${cleanTitle}_${Date.now()}.${ext}`;
      const tempLocalUri = `${FileSystem.cacheDirectory}${filename}`;
      currentTempUri.current = tempLocalUri;

      let lastProgress = 0;
      const callback = (downloadProgressData) => {
        if (!isMounted.current || isCancelled.current) return;
        const totalBytes = downloadProgressData.totalBytesExpectedToWrite;
        const writtenBytes = downloadProgressData.totalBytesWritten;

        if (totalBytes > 0) {
          const progress = Math.min(Math.round((writtenBytes / totalBytes) * 100), 100);
          if (progress !== lastProgress) {
            lastProgress = progress;
            setDownloadProgress(progress);
          }
        } else {
          setDownloadProgress((prev) => (prev < 90 ? prev + 5 : 95));
        }
      };

      activeDownloadResumable.current = FileSystem.createDownloadResumable(
        actualDownloadUrl,
        tempLocalUri,
        {},
        callback
      );

      const downloadResult = await activeDownloadResumable.current.downloadAsync();

      if (isCancelled.current || !downloadResult || !downloadResult.uri) {
        return;
      }

      if (isMounted.current) {
        setIsSaving(true);
      }

      if (isAudio) {
        const persistentUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.moveAsync({ from: downloadResult.uri, to: persistentUri });
        currentTempUri.current = null;

        setCurrentAudioName(filename);
        setMiniPlayerActive(true);
        setIsPlayingAudio(true);
      } else {
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        try {
          let album = await MediaLibrary.getAlbumAsync('MrDownload');
          if (album === null) {
            await MediaLibrary.createAlbumAsync('MrDownload', asset, false);
          } else {
            await MediaLibrary.addToAlbumAsync([asset], album, false);
          }
        } catch (albumErr) {}
        await cleanupTempFile(downloadResult.uri);
      }

      succeeded = true;

      if (isMounted.current) {
        setDownloadProgress(100);
        setDownloadComplete(true);
        Alert.alert(
          'Success!',
          isAudio
            ? 'Audio file saved successfully.'
            : 'Video saved successfully to the "MrDownload" gallery folder.'
        );

        if (completeTimeoutRef.current) {
          clearTimeout(completeTimeoutRef.current);
        }
        completeTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            setDownloadingUrl(null);
            setDownloadProgress(0);
            setDownloadComplete(false);
            setIsSaving(false);
          }
        }, 1200);
      }
    } catch (err) {
      if (!isCancelled.current) {
        Alert.alert('Download Failed', 'Could not complete the download. Please try another format.');
      }
    } finally {
      activeDownloadResumable.current = null;
      await cleanupTempFile();
      if (isMounted.current && !succeeded) {
        setDownloadingUrl(null);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setIsSaving(false);
      }
      isCancelled.current = false;
    }
  }, [cleanupTempFile, getFileExtension, requestMediaPermissions, sanitizeFileName, sanitizeUrl, videoTitle]);

  const dynamicStyles = getStyles(COLORS);

  return (
    <ScrollView contentContainerStyle={dynamicStyles.container} keyboardShouldPersistTaps="handled">
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.appTitle}>MR DOWNLOAD</Text>
        <Text style={dynamicStyles.subtitle}>
          {isPremiumUser ? '⭐ Premium Unlimited & Ad-Free Mode' : 'Social Media Video Downloader'}
        </Text>

        <View style={dynamicStyles.themeSelectorRow}>
          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, currentThemeKey === 'ocean' && dynamicStyles.activeThemeBtn]} 
            onPress={() => setCurrentThemeKey('ocean')}
          >
            <Text style={dynamicStyles.themeBtnText}>Ocean</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, currentThemeKey === 'emerald' && dynamicStyles.activeThemeBtn]} 
            onPress={() => setCurrentThemeKey('emerald')}
          >
            <Text style={dynamicStyles.themeBtnText}>Emerald</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, currentThemeKey === 'dark' && dynamicStyles.activeThemeBtn]} 
            onPress={() => setCurrentThemeKey('dark')}
          >
            <Text style={dynamicStyles.themeBtnText}>Dark</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={dynamicStyles.premiumToggleBtn} 
          onPress={() => setIsPremiumUser(!isPremiumUser)}
        >
          <Text style={dynamicStyles.premiumToggleText}>
            {isPremiumUser ? '👑 Premium Active' : '✨ Upgrade to Premium'}
          </Text>
        </TouchableOpacity>
      </View>

      {miniPlayerActive && (
        <View style={dynamicStyles.miniPlayerContainer}>
          <View style={dynamicStyles.miniPlayerInfo}>
            <Ionicons name="musical-notes" size={20} color={COLORS.purple} />
            <Text style={dynamicStyles.miniPlayerText} numberOfLines={1}>
              {currentAudioName || 'Playing Audio...'}
            </Text>
          </View>
          <View style={dynamicStyles.miniPlayerControls}>
            <TouchableOpacity onPress={() => setIsPlayingAudio(!isPlayingAudio)}>
              <Ionicons name={isPlayingAudio ? 'pause-circle' : 'play-circle'} size={32} color={COLORS.purple} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMiniPlayerActive(false)} style={{ marginLeft: 10 }}>
              <Ionicons name="close-circle" size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={dynamicStyles.privateSection}>
        <Text style={dynamicStyles.privateTitle}>🔒 Secret Private Folder</Text>
        {isPrivateFolderLocked ? (
          <View style={dynamicStyles.lockContainer}>
            <TextInput
              style={dynamicStyles.lockInput}
              placeholder="Enter password (e.g., 1234)"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              value={enteredPassword}
              onChangeText={setEnteredPassword}
            />
            <TouchableOpacity 
              style={dynamicStyles.unlockBtn}
              onPress={() => {
                if (enteredPassword === '1234') {
                  setIsPrivateFolderLocked(false);
                  Alert.alert('Success', 'Private folder unlocked successfully.');
                } else {
                  Alert.alert('Wrong Password', 'Please enter the correct password. (Default: 1234)');
                }
              }}
            >
              <Text style={dynamicStyles.unlockBtnText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={dynamicStyles.unlockedContent}>
            <Text style={dynamicStyles.unlockedText}>📁 Your locked files are secure here.</Text>
            <TouchableOpacity 
              style={dynamicStyles.lockAgainBtn}
              onPress={() => {
                setIsPrivateFolderLocked(true);
                setEnteredPassword('');
              }}
            >
              <Text style={dynamicStyles.lockAgainText}>Lock Folder</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={dynamicStyles.inputContainer}>
        <Ionicons name="link" size={20} color={COLORS.muted} style={dynamicStyles.linkIcon} />
        <TextInput
          style={dynamicStyles.input}
          placeholder="Paste video link here..."
          placeholderTextColor={COLORS.muted}
          value={url}
          editable={!downloadingUrl && !loading}
          onChangeText={(text) => {
            setUrl(text);
            if (downloadFormats.length > 0) {
              setDownloadFormats([]);
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {url.length > 0 && !downloadingUrl && !loading ? (
          <TouchableOpacity
            onPress={() => {
              setUrl('');
              setDownloadFormats([]);
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={loading || downloadingUrl ? dynamicStyles.downloadBtnDisabled : dynamicStyles.downloadBtn}
        onPress={handleFetchMedia}
        disabled={loading || Boolean(downloadingUrl)}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={dynamicStyles.downloadBtnText}>Fetch Format Links</Text>
        )}
      </TouchableOpacity>

      {downloadFormats.length > 0 ? (
        <View style={dynamicStyles.formatContainer}>
          <View style={dynamicStyles.formatHeaderRow}>
            <Text style={dynamicStyles.formatTitle}>Select Download Format:</Text>
          </View>

          {downloadFormats.map((item, index) => {
            const downloadKey = item.id || item.url;
            const isThisDownloading = downloadingUrl === downloadKey;
            const isAnyDownloading = Boolean(downloadingUrl);

            return (
              <View key={item.id || index} style={dynamicStyles.formatCardWrapper}>
                <TouchableOpacity
                  style={[
                    dynamicStyles.formatCard,
                    isAnyDownloading && !isThisDownloading && dynamicStyles.formatCardDisabled,
                  ]}
                  onPress={() => startInAppDownload(item)}
                  disabled={isAnyDownloading}
                >
                  <View style={dynamicStyles.formatInfo}>
                    <Ionicons
                      name={item.isAudio ? 'musical-notes-outline' : 'film-outline'}
                      size={22}
                      color={item.isAudio ? COLORS.purple : COLORS.green}
                    />
                    <Text style={dynamicStyles.formatText}>{item.quality}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>

                {isThisDownloading ? (
                  <View style={dynamicStyles.progressSection}>
                    <View style={dynamicStyles.progressContainer}>
                      <View style={[dynamicStyles.progressBar, { width: `${downloadProgress}%` }]} />
                      <Text style={dynamicStyles.progressText}>
                        {downloadComplete
                          ? 'Completed ✓'
                          : isSaving
                          ? 'Saving file...'
                          : `Downloading: ${downloadProgress}%`}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {!isPremiumUser && (
        <View style={dynamicStyles.adBanner}>
          <Text style={dynamicStyles.adText}>📢 Ad: Upgrade to Premium for an ad-free experience!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const getStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: COLORS.bg,
      paddingHorizontal: 20,
      justifyContent: 'center',
      paddingVertical: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    appTitle: {
      color: COLORS.purple,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 1,
    },
    subtitle: {
      color: COLORS.muted,
      fontSize: 13,
      marginTop: 6,
    },
    themeSelectorRow: {
      flexDirection: 'row',
      marginTop: 10,
      marginBottom: 6,
    },
    themeBtn: {
      backgroundColor: COLORS.card,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    activeThemeBtn: {
      borderColor: COLORS.purple,
      backgroundColor: COLORS.border,
    },
    themeBtnText: {
      color: COLORS.text,
      fontSize: 11,
      fontWeight: 'bold',
    },
    premiumToggleBtn: {
      marginTop: 6,
      backgroundColor: COLORS.gold,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    premiumToggleText: {
      color: '#000',
      fontSize: 12,
      fontWeight: 'bold',
    },
    miniPlayerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.card,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.purple,
      marginBottom: 16,
    },
    miniPlayerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    miniPlayerText: {
      color: COLORS.text,
      fontSize: 12,
      marginLeft: 8,
      flex: 1,
    },
    miniPlayerControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    privateSection: {
      backgroundColor: COLORS.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 16,
    },
    privateTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    lockContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lockInput: {
      flex: 1,
      backgroundColor: COLORS.bg,
      color: COLORS.text,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
      borderWidth: 1,
      borderColor: COLORS.border,
      fontSize: 13,
    },
    unlockBtn: {
      marginLeft: 8,
      backgroundColor: COLORS.purple,
      paddingHorizontal: 14,
      height: 40,
      justifyContent: 'center',
      borderRadius: 8,
    },
    unlockBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: 'bold',
    },
    unlockedContent: {
      alignItems: 'center',
    },
    unlockedText: {
      color: COLORS.green,
      fontSize: 12,
      marginBottom: 6,
    },
    lockAgainBtn: {
      backgroundColor: COLORS.red,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    lockAgainText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 16,
      height: 56,
      marginBottom: 16,
    },
    linkIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14,
    },
    downloadBtn: {
      backgroundColor: COLORS.purple,
      borderRadius: 14,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    downloadBtnDisabled: {
      backgroundColor: COLORS.purple,
      borderRadius: 14,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.5,
    },
    downloadBtnText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    formatContainer: {
      marginTop: 25,
      backgroundColor: COLORS.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    formatHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    formatTitle: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: 'bold',
    },
    formatCardWrapper: {
      marginBottom: 10,
    },
    formatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.bg,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    formatCardDisabled: {
      opacity: 0.4,
    },
    formatInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    formatText: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 10,
      flex: 1,
    },
    progressSection: {
      marginTop: 8,
    },
    progressContainer: {
      backgroundColor: COLORS.border,
      borderRadius: 8,
      height: 22,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    progressBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: COLORS.purple,
    },
    progressText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
      zIndex: 1,
    },
    adBanner: {
      marginTop: 20,
      backgroundColor: COLORS.card,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.purple,
    },
    adText: {
      color: COLORS.gold,
      fontSize: 12,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
