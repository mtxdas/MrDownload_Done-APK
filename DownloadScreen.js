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
import { useSettings } from './context/SettingsContext';

const COLORS = {
  bg: '#0a0818',
  card: '#151228',
  border: '#1e1b4b',
  purple: '#7c3aed',
  text: '#ffffff',
  muted: '#6b7280',
  green: '#10b981',
  red: '#ef4444',
};

// ১. HTTP requests এবং Download-এর জন্য গ্লোবাল হেডার
const CUSTOM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

export default function DownloadScreen(props) {
  const settingsContext = useSettings();
  const adminSettings = settingsContext ? settingsContext.adminSettings : null;

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState([]);
  const [videoTitle, setVideoTitle] = useState('');

  const [downloadingUrl, setDownloadingUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const isMounted = useRef(true);
  const activeDownloadResumable = useRef(null);
  const currentTempUri = useRef(null);
  const isCancelled = useRef(false);

  // ২. সেফ ক্যাশ ফাইল ক্লিনআপ
  const cleanupTempFile = useCallback(async (fileUri) => {
    const targetUri = fileUri || currentTempUri.current;
    if (!targetUri) return;
    try {
      const fileInfo = await FileSystem.getInfoAsync(targetUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }
    } catch (e) {
      // সাইলেন্ট এরর হ্যান্ডলিং
    } finally {
      if (targetUri === currentTempUri.current) {
        currentTempUri.current = null;
      }
    }
  }, []);

  // ৩. কম্পোনেন্ট আনমাউন্ট ও মেমোরি লিক প্রটেকশন
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (activeDownloadResumable.current) {
        try {
          activeDownloadResumable.current.cancelAsync();
        } catch (e) {}
      }
      cleanupTempFile();
    };
  }, [cleanupTempFile]);

  // ৪. ইনপুট স্যানিটাইজেশন ও প্ল্যাটফর্ম ডিটেকশন
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

  const extractYoutubeId = useCallback((link) => {
    if (!link) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = link.match(regExp);
    return match && match[2] && match[2].length === 11 ? match[2] : '';
  }, []);

  // ৫. সেফ ফাইল এক্সটেনশন ডিটেক্টর
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

  // ৬. নেটওয়ার্ক রিকুয়েস্ট হ্যান্ডলার (Custom Headers সহ)
  const fetchWithTimeout = useCallback(async (resource, options = {}, timeout = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        headers: {
          ...CUSTOM_HEADERS,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }, []);

  // ৭. মিডিয়া ফেচিং ও ফলব্যাক হ্যান্ডলিং
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
    let title = `${platform.toUpperCase()} Video`;

    let targetUrl = adminSettings && adminSettings.apiUrl ? adminSettings.apiUrl : 'https://mrdownload-apk.onrender.com/download';
    if (targetUrl.endsWith('/')) {
      targetUrl = targetUrl.slice(0, -1);
    }
    if (!targetUrl.endsWith('/download')) {
      targetUrl = `${targetUrl}/download`;
    }

    // ব্যাকএন্ড এপিআই রিকুয়েস্ট
    try {
      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ videoUrl: cleanUrl, url: cleanUrl }),
        },
        20000
      );

      if (response.ok && isMounted.current) {
        const data = await response.json();
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
              }
            });
          } else if (data.download_url || data.downloadUrl || data.url) {
            const mainUrl = sanitizeUrl(data.download_url || data.downloadUrl || data.url);
            parsedFormats.push(
              { id: `1080p_${Date.now()}`, quality: '1080p Full HD', url: mainUrl, isAudio: false },
              { id: `720p_${Date.now()}`, quality: '720p HD', url: mainUrl, isAudio: false },
              { id: `480p_${Date.now()}`, quality: '480p SD Quality', url: mainUrl, isAudio: false },
              { id: `mp3_${Date.now()}`, quality: 'Audio Only (MP3)', url: mainUrl, isAudio: true }
            );
          }
        }
      }
    } catch (err) {}

    // ফলব্যাক ১: Cobalt API
    if (parsedFormats.length === 0 && isMounted.current) {
      const cobaltInstances = ['https://api.cobalt.tools', 'https://cobalt-api.kwiatek.xyz'];
      for (let i = 0; i < cobaltInstances.length; i++) {
        if (!isMounted.current) break;
        try {
          const cobRes = await fetchWithTimeout(
            cobaltInstances[i],
            {
              method: 'POST',
              headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: cleanUrl }),
            },
            7000
          );

          if (cobRes.ok) {
            const cobData = await cobRes.json();
            if (cobData.status === 'stream' || cobData.status === 'redirect' || cobData.url) {
              parsedFormats.push({
                id: `cobalt_${i}_${Date.now()}`,
                quality: 'HD Quality',
                url: sanitizeUrl(cobData.url),
                isAudio: false,
              });
              break;
            }
          }
        } catch (e) {}
      }
    }

    // ফলব্যাক ২: VKR API
    if (parsedFormats.length === 0 && isMounted.current) {
      try {
        const aioRes = await fetchWithTimeout(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(cleanUrl)}`, {}, 7000);
        if (aioRes.ok && isMounted.current) {
          const aioData = await aioRes.json();
          if (aioData && aioData.data) {
            title = aioData.data.title || title;
            if (Array.isArray(aioData.data.downloads)) {
              aioData.data.downloads.forEach((item, index) => {
                const itemUrl = sanitizeUrl(item.url);
                if (itemUrl) {
                  const qLabel = item.quality || item.format || 'HD Quality';
                  parsedFormats.push({
                    id: `vkr_${index}_${Date.now()}`,
                    quality: String(qLabel),
                    url: itemUrl,
                    isAudio: Boolean(item.isAudio) || item.format === 'mp3' || String(qLabel).toLowerCase().includes('audio'),
                  });
                }
              });
            }
          }
        }
      } catch (e) {}
    }

    // ফলব্যাক ৩: ইউটিউব ব্যাকআপ লিংক
    if (parsedFormats.length === 0 && platform === 'youtube' && isMounted.current) {
      const ytId = extractYoutubeId(cleanUrl);
      if (ytId) {
        title = `YouTube Video (${ytId})`;
        parsedFormats = [
          { id: `yt_720_${Date.now()}`, quality: '720p HD Quality', url: `https://yt.artemislena.eu/latest_version?id=${ytId}&itag=22`, isAudio: false },
          { id: `yt_360_${Date.now()}`, quality: '360p SD Quality', url: `https://yt.artemislena.eu/latest_version?id=${ytId}&itag=18`, isAudio: false },
          { id: `yt_140_${Date.now()}`, quality: 'Audio Only (MP3)', url: `https://yt.artemislena.eu/latest_version?id=${ytId}&itag=140`, isAudio: true },
        ];
      }
    }

    if (isMounted.current) {
      setLoading(false);
      if (parsedFormats.length > 0) {
        setDownloadFormats(parsedFormats);
        setVideoTitle(title);
      } else {
        Alert.alert('ব্যর্থ', 'ভিডিওটি প্রক্রিয়া করা সম্ভব হয়নি। লিংকটি সঠিক আছে কিনা তা নিশ্চিত করুন।');
      }
    }
  }, [adminSettings, detectPlatform, extractYoutubeId, fetchWithTimeout, sanitizeUrl, url]);

  // ৮. ডাউনলোড ক্যানসেলেশন লজিক
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
      }
      Alert.alert('বাতিল করা হয়েছে', 'ডাউনলোড সম্পূর্ণ হওয়ার পূর্বেই বাতিল করা হয়েছে।');
    }
  }, [cleanupTempFile]);

  // ৯. অ্যান্ড্রয়েড ১৩+ ও iOS পারমিশন
  const requestMediaPermissions = useCallback(async () => {
    try {
      const { status: existingStatus, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      if (existingStatus === 'granted') return true;

      if (canAskAgain) {
        const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
        return newStatus === 'granted';
      }

      Alert.alert(
        'অনুমতি প্রয়োজন',
        'গ্যালারিতে ভিডিও সেভ করতে স্টোরেজ পারমিশন প্রয়োজন। দয়া করে অ্যাপ সেটিংস থেকে পারমিশন অ্যালাউ করুন।',
        [
          { text: 'বাতিল', style: 'cancel' },
          { text: 'সেটিংস খুলুন', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  // ১০. কোর ডাউনলোড প্রসেস (Scoped Storage & Header 403 Solution সহ)
  const startInAppDownload = useCallback(async (itemObj) => {
    const fileUrl = sanitizeUrl(itemObj.url);
    const quality = itemObj.quality;
    const isAudio = itemObj.isAudio;
    const downloadKey = itemObj.id || (fileUrl + quality);

    isCancelled.current = false;

    try {
      const hasPermission = await requestMediaPermissions();
      if (!hasPermission) return;

      if (isMounted.current) {
        setDownloadingUrl(downloadKey);
        setDownloadProgress(0);
      }

      const ext = getFileExtension(fileUrl, isAudio);

      // নিরাপদ ফাইল নেমিং প্রসেস
      let cleanTitle = (videoTitle || 'Media_File')
        .replace(/[^\p{L}\p{N}_\- ]/gu, '_')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 20);

      if (!cleanTitle) cleanTitle = 'Media_File';

      const randomId = Math.random().toString(36).substring(2, 6);
      const filename = `${cleanTitle}_${Date.now()}_${randomId}.${ext}`;

      const tempLocalUri = `${FileSystem.documentDirectory}${filename}`;
      currentTempUri.current = tempLocalUri;

      const callback = (downloadProgressData) => {
        if (!isMounted.current || isCancelled.current) return;
        const totalBytes = downloadProgressData.totalBytesExpectedToWrite;
        const writtenBytes = downloadProgressData.totalBytesWritten;

        if (totalBytes > 0) {
          const progress = Math.min(Math.round((writtenBytes / totalBytes) * 100), 99);
          setDownloadProgress(progress);
        } else {
          setDownloadProgress((prev) => (prev < 90 ? prev + 2 : prev));
        }
      };

      // 403 Forbidden রোডব্লক এড়াতে Headers অবজেক্ট সহ DownloadResumable তৈরি
      activeDownloadResumable.current = FileSystem.createDownloadResumable(
        fileUrl,
        tempLocalUri,
        { headers: CUSTOM_HEADERS },
        callback
      );

      const downloadResult = await activeDownloadResumable.current.downloadAsync();

      if (isCancelled.current) return;

      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Download failed: No file URI generated');
      }

      // ১১. Scoped Storage কমপ্যাটিবল মিডিয়া গ্যালারি সেভিং
      if (Platform.OS === 'android') {
        // অ্যান্ড্রয়েড ১০+ ও কাস্টম রম (MIUI/OneUI)-এ স্ক্যানার নিশ্চিত করতে direct save
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
      } else {
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        let album = await MediaLibrary.getAlbumAsync('MrDownload');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('MrDownload', asset, false);
        } else {
          await MediaLibrary.addToAlbumAsync([asset], album, false);
        }
      }

      if (isMounted.current && !isCancelled.current) {
        setDownloadProgress(100);
        Alert.alert('সফল!', 'ফাইলটি সফলভাবে আপনার গ্যালারিতে সেভ হয়েছে।');
      }

      if (props && typeof props.onDownloadSuccess === 'function' && !isCancelled.current) {
        props.onDownloadSuccess({
          id: Date.now(),
          platform: detectPlatform(url),
          title: videoTitle || 'Media',
          quality: quality || 'HD',
          size: 'Auto',
          time: 'এখনই',
        });
      }
    } catch (err) {
      if (!isCancelled.current) {
        Alert.alert('ডাউনলোড ব্যর্থ', 'ফাইলটি ডাউনলোড বা সেভ করা সম্ভব হয়নি। নেটওয়ার্ক কানেকশন অথবা লিংকটি পরীক্ষা করুন।');
      }
    } finally {
      activeDownloadResumable.current = null;
      await cleanupTempFile();
      if (isMounted.current) {
        setDownloadingUrl(null);
        setDownloadProgress(0);
      }
      isCancelled.current = false;
    }
  }, [cleanupTempFile, detectPlatform, getFileExtension, props, requestMediaPermissions, sanitizeUrl, url, videoTitle]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.appTitle}>MR DOWNLOAD</Text>
        <Text style={styles.subtitle}>সোশ্যাল মিডিয়া ভিডিও ডাউনলোডার</Text>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="link" size={20} color={COLORS.muted} style={styles.linkIcon} />
        <TextInput
          style={styles.input}
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
        style={loading || downloadingUrl ? styles.downloadBtnDisabled : styles.downloadBtn}
        onPress={handleFetchMedia}
        disabled={loading || Boolean(downloadingUrl)}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.downloadBtnText}>ফরম্যাট লিংক ফেচ করুন</Text>
        )}
      </TouchableOpacity>

      {downloadFormats.length > 0 ? (
        <View style={styles.formatContainer}>
          <Text style={styles.formatTitle}>ডাউনলোড ফরম্যাট বেছে নিন:</Text>
          {downloadFormats.map((item, index) => {
            const downloadKey = item.id || (item.url + item.quality);
            const isThisDownloading = downloadingUrl === downloadKey;
            const isAnyDownloading = Boolean(downloadingUrl);

            return (
              <View key={item.id || index} style={styles.formatCardWrapper}>
                <TouchableOpacity
                  style={[
                    styles.formatCard,
                    isAnyDownloading && !isThisDownloading && styles.formatCardDisabled,
                  ]}
                  onPress={() => startInAppDownload(item)}
                  disabled={isAnyDownloading}
                >
                  <View style={styles.formatInfo}>
                    <Ionicons
                      name={item.isAudio ? 'musical-notes-outline' : 'film-outline'}
                      size={22}
                      color={item.isAudio ? COLORS.purple : COLORS.green}
                    />
                    <Text style={styles.formatText}>{item.quality}</Text>
                  </View>
                  <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} />
                </TouchableOpacity>

                {isThisDownloading ? (
                  <View style={styles.progressSection}>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
                      <Text style={styles.progressText}>ডাউনলোড হচ্ছে: {downloadProgress}%</Text>
                    </View>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelDownload}>
                      <Text style={styles.cancelBtnText}>বাতিল</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
  formatTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
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
  },
  formatText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  progressSection: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    backgroundColor: '#1f1b3a',
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
});
