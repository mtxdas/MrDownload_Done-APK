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
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard'; // ক্লিপবোর্ড অটো-ডিটেক্ট করার জন্য
import { useSettings } from './context/SettingsContext';

// --- থিম কাস্টমাইজার কালার প্যালেট ---
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
    bg: '#022c22',
    card: '#064e3b',
    border: '#065f46',
    purple: '#059669',
    text: '#ffffff',
    muted: '#6ee7b7',
    green: '#34d399',
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

  // --- প্রিমিয়াম ও নতুন ফিচার স্টেটসমূহ ---
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [selectedBatchItems, setSelectedBatchItems] = useState([]);
  const [isPrivateFolderLocked, setIsPrivateFolderLocked] = useState(true);
  const [privatePassword, setPrivatePassword] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');

  // ফিউচার ১: মিনি অডিও প্লেয়ার স্টেট
  const [miniPlayerActive, setMiniPlayerActive] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudioName, setCurrentAudioName] = useState('');

  // ফিউচার ৪: শেয়ার শিট লিংক স্টোরেজ
  const [sharedIncomingUrl, setSharedIncomingUrl] = useState('');

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

  // --- ফিউচার ৩: স্মার্ট ক্লিপবোর্ড ডিটেকশন ও ফিউচার ৪: শেয়ার শিট ইন্টিগ্রেশন হ্যান্ডলার ---
  useEffect(() => {
    isMounted.current = true;

    const checkClipboardAndShare = async () => {
      try {
        // ক্লিপবোর্ড থেকে লিংক চেক করা
        const clipboardContent = await Clipboard.getStringAsync();
        if (clipboardContent && (clipboardContent.startsWith('http://') || clipboardContent.startsWith('https://'))) {
          if (
            clipboardContent.includes('youtube.com') ||
            clipboardContent.includes('youtu.be') ||
            clipboardContent.includes('tiktok.com') ||
            clipboardContent.includes('instagram.com') ||
            clipboardContent.includes('facebook.com')
          ) {
            setUrl(clipboardContent);
          }
        }

        // শেয়ার শিট বা ডিপ লিংকের মাধ্যমে ইনকামিং লিংক চেক করা
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          setSharedIncomingUrl(initialUrl);
          setUrl(initialUrl);
        }
      } catch (e) {}
    };

    checkClipboardAndShare();

    const handleDeepLink = (event) => {
      if (event.url) {
        setUrl(event.url);
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    const wakeUpServer = async () => {
      try {
        let targetUrl = adminSettings && adminSettings.apiUrl ? adminSettings.apiUrl : 'https://mrdownload-apk.onrender.com/';
        if (targetUrl.endsWith('/download')) {
          targetUrl = targetUrl.replace('/download', '');
        }
        await fetch(targetUrl);
      } catch (e) {}
    };
    wakeUpServer();

    return () => {
      isMounted.current = false;
      linkingSubscription.remove();
      if (activeDownloadResumable.current) {
        activeDownloadResumable.current.cancelAsync().catch(() => {});
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
      }
      cleanupTempFile();
    };
  }, [adminSettings, cleanupTempFile]);

  const sanitizeUrl = useCallback((inputUrl) => {
    if (!inputUrl) return '';
    let clean = String(inputUrl).trim();
    if (clean.startsWith('//')) {
      clean = 'https:' + clean;
    }
    return clean;
  }, []);

  const detectPlatform = useCallback((link) => {
    if (!link) return 'video';
    const l = String(link).toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube';
    if (l.includes('tiktok.com')) return 'tiktok';
    if (l.includes('instagram.com')) return 'instagram';
    if (l.includes('facebook.com') || l.includes('fb.watch')) return 'facebook';
    if (l.includes('twitter.com') || l.includes('x.com')) return 'twitter';
    if (l.includes('vimeo.com')) return 'vimeo';
    return 'video';
  }, []);

  const getFileExtension = useCallback((fileUrl, isAudio) => {
    try {
      const urlWithoutQuery = fileUrl.split('?')[0].split('#')[0];
      const matchedExt = urlWithoutQuery.match(/\.([a-z0-9]+)$/i);
      if (matchedExt && matchedExt[1]) {
        const ext = matchedExt[1].toLowerCase();
        if (['mp4', 'm4a', 'webm', 'mp3', 'mkv', 'mov', 'avi', 'flv', 'aac', 'ogg', '3gp'].includes(ext)) {
          return ext;
        }
      }
    } catch (e) {}
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

  const handleFetchMedia = useCallback(async () => {
    const cleanUrl = sanitizeUrl(url);
    if (!cleanUrl) {
      Alert.alert('ত্রুটি', 'একটি সঠিক ভিডিও লিংক দিন।');
      return;
    }

    const platform = detectPlatform(cleanUrl);

    setLoading(true);
    setDownloadFormats([]);
    setVideoTitle('');
    Keyboard.dismiss();

    let parsedFormats = [];
    let skippedCount = 0;
    let title = `${platform.toUpperCase()} Video`;

    let targetUrl = adminSettings && adminSettings.apiUrl ? adminSettings.apiUrl : 'https://mrdownload-apk.onrender.com/download';
    if (targetUrl.endsWith('/')) {
      targetUrl = targetUrl.slice(0, -1);
    }
    if (!targetUrl.endsWith('/download')) {
      targetUrl = `${targetUrl}/download`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let errorMessage = null;

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
        let data = null;
        try {
          data = await response.json();
        } catch (parseErr) {
          errorMessage = 'সার্ভার থেকে অপ্রত্যাশিত রেসপন্স পাওয়া গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
        }

        if (data && !data.error) {
          title = data.title || data.filename || title;
          const itemsList = data.picker || data.formats || data.medias || data.qualities;

          if (Array.isArray(itemsList) && itemsList.length > 0) {
            itemsList.forEach((item, index) => {
              const rawItemUrl = item.url || item.download_url || item.link;
              const itemUrl = sanitizeUrl(rawItemUrl);
              if (itemUrl) {
                const qLabel = item.quality || item.resolution || item.type || item.label || `Option ${index + 1}`;
                const qLower = String(qLabel).toLowerCase();
                parsedFormats.push({
                  id: `p_${index}_${Date.now()}`,
                  quality: String(qLabel),
                  url: itemUrl,
                  isAudio: item.isAudio || qLower.includes('audio') || qLower.includes('mp3'),
                });
              } else {
                skippedCount += 1;
              }
            });

            parsedFormats.push({
              id: `p_mp3_conv_${Date.now()}`,
              quality: 'MP3 (High Quality Audio Converter)',
              url: parsedFormats[0]?.url || cleanUrl,
              isAudio: true,
            });

            if (parsedFormats.length === 0) {
              errorMessage = 'পাওয়া ফরম্যাটগুলোর কোনোটিতেই সঠিক ডাউনলোড লিংক পাওয়া যায়নি।';
            }
          } else {
            errorMessage = 'সার্ভার কোনো ডাউনলোড ফরম্যাট রিটার্ন করেনি।';
          }
        } else if (data && data.error) {
          errorMessage = String(data.error);
        }
      } else {
        errorMessage = `সার্ভার এরর (কোড: ${response.status})। কিছুক্ষণ পর আবার চেষ্টা করুন।`;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        errorMessage = 'সার্ভার থেকে রেসপন্স পেতে দেরি হচ্ছে (টাইমআউট)। রেন্ডার সার্ভার সজাগ হতে একটু সময় নিতে পারে, দয়া করে আবার চেষ্টা করুন।';
      } else {
        errorMessage = 'নেটওয়ার্ক সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।';
      }
    }

    if (isMounted.current) {
      setLoading(false);
      if (parsedFormats.length > 0) {
        setDownloadFormats(parsedFormats);
        setVideoTitle(title);
        if (skippedCount > 0) {
          Alert.alert(
            'কিছু ফরম্যাট বাদ পড়েছে',
            `${skippedCount}টি ফরম্যাটের লিংক পাওয়া যায়নি, তাই সেগুলো দেখানো হয়নি।`
          );
        }
      } else {
        Alert.alert('ব্যর্থ', errorMessage || 'ভিডিও লিংক ফেচ করা যায়নি। ব্যাকএন্ড রেসপন্স এবং লিংকটি চেক করুন।');
      }
    }
  }, [adminSettings, detectPlatform, sanitizeUrl, url]);

  const cancelDownload = useCallback(async () => {
    isCancelled.current = true;
    try {
      if (activeDownloadResumable.current) {
        await activeDownloadResumable.current.cancelAsync();
        activeDownloadResumable.current = null;
      }
    } catch (e) {
    } finally {
      await cleanupTempFile();
      if (isMounted.current) {
        setDownloadingUrl(null);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setIsSaving(false);
      }
      Alert.alert('বাতিল', 'ডাউনলোড বাতিল করা হয়েছে।');
    }
  }, [cleanupTempFile]);

  const requestMediaPermissions = useCallback(async () => {
    try {
      const { status: existingStatus, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      if (existingStatus === 'granted') return true;

      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync(true);
      if (newStatus === 'granted') return true;

      if (!canAskAgain) {
        Alert.alert(
          'অনুমতি প্রয়োজন',
          'গ্যালারিতে ভিডিও সেভ করতে ডিভাইস পারমিশন সেটিংসে গিয়ে অ্যালাউ করুন।',
          [
            { text: 'বাতিল', style: 'cancel' },
            { text: 'সেটিংস', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  const startInAppDownload = useCallback(async (itemObj) => {
    const fileUrl = sanitizeUrl(itemObj.url);
    const quality = itemObj.quality;
    const isAudio = itemObj.isAudio;
    const downloadKey = itemObj.id || (fileUrl + quality);

    let succeeded = false;
    isCancelled.current = false;

    try {
      if (!isAudio) {
        const hasPermission = await requestMediaPermissions();
        if (!hasPermission) return;
      }

      if (isMounted.current) {
        setDownloadingUrl(downloadKey);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setIsSaving(false);
      }

      const ext = getFileExtension(fileUrl, isAudio);
      const cleanTitle = sanitizeFileName(videoTitle || 'Media_File');

      const randomId = Math.random().toString(36).substring(2, 6);
      const filename = `${cleanTitle}_${Date.now()}_${randomId}.${ext}`;
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
        fileUrl,
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

        // --- ফিউচার ১: মিনি অডিও প্লেয়ার ট্রিগার করা ---
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
          'সফল!',
          isAudio
            ? 'অডিও বা MP3 ফাইল সফলভাবে সেভ ও মিনি প্লেয়ারে লোড হয়েছে।'
            : 'ভিডিওটি সফলভাবে গ্যালারির "MrDownload" ফোল্ডারে সেভ করা হয়েছে।'
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
        Alert.alert('ডাউনলোড ব্যর্থ', 'ডাউনলোড সম্পন্ন করা যায়নি। নেটওয়ার্ক চেক করুন।');
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

  const handleBatchDownload = useCallback(async () => {
    if (!isPremiumUser) {
      Alert.alert('প্রিমিয়াম ফিচার', 'একসাথে একাধিক (Batch) ডাউনলোড করতে প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন।');
      return;
    }
    if (selectedBatchItems.length === 0) {
      Alert.alert('সতর্কতা', 'কোনো ফরম্যাট সিলেক্ট করা হয়নি।');
      return;
    }
    Alert.alert('শুরু হচ্ছে', `${selectedBatchItems.length}টি ফাইল একসাথে ডাউনলোড শুরু হচ্ছে...`);
    for (const item of selectedBatchItems) {
      await startInAppDownload(item);
    }
    setSelectedBatchItems([]);
  }, [isPremiumUser, selectedBatchItems, startInAppDownload]);

  // ডাইনামিক স্টাইল শিট জেনারেটর থিমের ওপর ভিত্তি করে
  const dynamicStyles = getStyles(COLORS);

  return (
    <ScrollView contentContainerStyle={dynamicStyles.container} keyboardShouldPersistTaps="handled">
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.appTitle}>MR DOWNLOAD</Text>
        <Text style={dynamicStyles.subtitle}>
          {isPremiumUser ? '⭐ প্রিমিয়াম আনলিমিটেড ও অ্যাড-ফ্রি মোড' : 'সোশ্যাল মিডিয়া ভিডিও ডাউনলোডার'}
        </Text>

        {/* --- ফিউচার ২: থিম কাস্টমাইজার বাটনসমূহ --- */}
        <View style={dynamicStyles.themeSelectorRow}>
          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, currentThemeKey === 'dark' && dynamicStyles.activeThemeBtn]} 
            onPress={() => setCurrentThemeKey('dark')}
          >
            <Text style={dynamicStyles.themeBtnText}>Dark</Text>
          </TouchableOpacity>
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
        </View>

        <TouchableOpacity 
          style={dynamicStyles.premiumToggleBtn} 
          onPress={() => setIsPremiumUser(!isPremiumUser)}
        >
          <Text style={dynamicStyles.premiumToggleText}>
            {isPremiumUser ? '👑 প্রিমিয়াম সক্রিয় আছে' : '✨ প্রিমিয়াম নিন (Upgrade)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- ফিউচার ১: মিনি অডিও প্লেয়ার কম্পোনেন্ট --- */}
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

      {/* পাসওয়ার্ড প্রটেক্টেড প্রাইভেট ফোল্ডার সেকশন */}
      <View style={dynamicStyles.privateSection}>
        <Text style={dynamicStyles.privateTitle}>🔒 সিক্রেট প্রাইভেট ফোল্ডার</Text>
        {isPrivateFolderLocked ? (
          <View style={dynamicStyles.lockContainer}>
            <TextInput
              style={dynamicStyles.lockInput}
              placeholder="পাসওয়ার্ড দিন (যেমন: 1234)"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              value={enteredPassword}
              onChangeText={setEnteredPassword}
            />
            <TouchableOpacity 
              style={dynamicStyles.unlockBtn}
              onPress={() => {
                if (enteredPassword === (privatePassword || '1234')) {
                  setIsPrivateFolderLocked(false);
                  Alert.alert('সফল', 'প্রাইভেট ফোল্ডার আনলক করা হয়েছে।');
                } else {
                  Alert.alert('ভুল পাসওয়ার্ড', 'সঠিক পাসওয়ার্ড দিন। (ডিফল্ট: 1234)');
                }
              }}
            >
              <Text style={dynamicStyles.unlockBtnText}>আনলক</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={dynamicStyles.unlockedContent}>
            <Text style={dynamicStyles.unlockedText}>📁 আপনার লক করা ফাইলগুলো এখানে সুরক্ষিত আছে।</Text>
            <TouchableOpacity 
              style={dynamicStyles.lockAgainBtn}
              onPress={() => {
                setIsPrivateFolderLocked(true);
                setEnteredPassword('');
              }}
            >
              <Text style={dynamicStyles.lockAgainText}>লক করুন</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={dynamicStyles.inputContainer}>
        <Ionicons name="link" size={20} color={COLORS.muted} style={dynamicStyles.linkIcon} />
        <TextInput
          style={dynamicStyles.input}
          placeholder="ভিডিও লিংক পেস্ট করুন..."
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
          <Text style={dynamicStyles.downloadBtnText}>ফরম্যাট লিংক ফেচ করুন</Text>
        )}
      </TouchableOpacity>

      {downloadFormats.length > 0 ? (
        <View style={dynamicStyles.formatContainer}>
          <View style={dynamicStyles.formatHeaderRow}>
            <Text style={dynamicStyles.formatTitle}>ডাউনলোড ফরম্যাট বেছে নিন:</Text>
            {isPremiumUser && (
              <TouchableOpacity style={dynamicStyles.batchDownloadBtn} onPress={handleBatchDownload}>
                <Text style={dynamicStyles.batchBtnText}>ব্যাস ডাউনলোড (Batch)</Text>
              </TouchableOpacity>
            )}
          </View>

          {downloadFormats.map((item, index) => {
            const downloadKey = item.id || (item.url + item.quality);
            const isThisDownloading = downloadingUrl === downloadKey;
            const isAnyDownloading = Boolean(downloadingUrl);
            const isSelectedForBatch = selectedBatchItems.some((i) => i.id === item.id);

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
                    {isPremiumUser && (
                      <TouchableOpacity
                        onPress={() => {
                          if (isSelectedForBatch) {
                            setSelectedBatchItems(selectedBatchItems.filter((i) => i.id !== item.id));
                          } else {
                            setSelectedBatchItems([...selectedBatchItems, item]);
                          }
                        }}
                        style={[dynamicStyles.checkbox, isSelectedForBatch && dynamicStyles.checkboxSelected]}
                      >
                        {isSelectedForBatch && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </TouchableOpacity>
                    )}
                    <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>

                {isThisDownloading ? (
                  <View style={dynamicStyles.progressSection}>
                    <View style={dynamicStyles.progressContainer}>
                      <View style={[dynamicStyles.progressBar, { width: `${downloadProgress}%` }]} />
                      <Text style={dynamicStyles.progressText}>
                        {downloadComplete
                          ? 'সম্পন্ন হয়েছে ✓'
                          : isSaving
                          ? 'সেভ করা হচ্ছে...'
                          : `গতিশীল ডাউনলোড: ${downloadProgress}%`}
                      </Text>
                    </View>
                    {!downloadComplete && !isSaving ? (
                      <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={cancelDownload}>
                        <Text style={dynamicStyles.cancelBtnText}>বাতিল</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {!isPremiumUser && (
        <View style={dynamicStyles.adBanner}>
          <Text style={dynamicStyles.adText}>📢 বিজ্ঞাপন: প্রিমিয়াম নিন এবং বিজ্ঞাপন মুক্ত অভিজ্ঞতা উপভোগ করুন!</Text>
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
    batchDownloadBtn: {
      backgroundColor: COLORS.green,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    batchBtnText: {
      color: '#fff',
      fontSize: 10,
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
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: COLORS.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: COLORS.purple,
      borderColor: COLORS.purple,
    },
    progressSection: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressContainer: {
      flex: 1,
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
    cancelBtn: {
      marginLeft: 10,
      backgroundColor: COLORS.red,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    cancelBtnText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
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
