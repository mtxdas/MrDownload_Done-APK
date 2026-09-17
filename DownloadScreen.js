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

// Render/Heroku-এর মতো ফ্রি-টায়ার সার্ভার কোল্ড-স্টার্টে বেশি সময় নিতে পারে,
// তাই টাইমআউট বাড়িয়ে ৪৫ সেকেন্ড করা হয়েছে।
const FETCH_TIMEOUT_MS = 45000;

export default function DownloadScreen(props) {
  const settingsContext = useSettings();
  const adminSettings = settingsContext ? settingsContext.adminSettings : null;

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState([]);
  const [videoTitle, setVideoTitle] = useState('');

  const [downloadingUrl, setDownloadingUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  // ডাউনলোড শেষ হয়ে গ্যালারি/স্টোরেজে সেভ করার পর্যায়ে আছে কিনা —
  // এই পর্যায়ে ক্যান্সেল বাটন লুকানো থাকবে, যাতে সেভ-চলাকালীন
  // ক্যান্সেল করে race condition তৈরি না হয়।
  const [isSaving, setIsSaving] = useState(false);

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
      // Ignore error during cleanup
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
        // cancelAsync() একটি Promise রিটার্ন করে — এখানে await করা যাবে না
        // (cleanup ফাংশন sync), তাই .catch() দিয়ে rejection ধরে
        // unhandled-promise-rejection warning এড়ানো হলো।
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

  // ইউনিকোড প্রপার্টি এসকেপ (\p{L}, \p{N}) পুরনো Hermes ইঞ্জিনে
  // সাপোর্টেড না-ও থাকতে পারে, তাই try/catch দিয়ে সেফ ASCII fallback রাখা হলো।
  const sanitizeFileName = useCallback((rawName) => {
    let cleaned = rawName;
    try {
      cleaned = rawName.replace(/[^\p{L}\p{N}_\- ]/gu, '_');
    } catch (e) {
      // Unicode property escape সাপোর্ট না থাকলে বেসিক ASCII-only ক্লিনআপ
      cleaned = rawName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
    }
    cleaned = cleaned.trim().replace(/\s+/g, '_').substring(0, 25);
    return cleaned || 'Media_File';
  }, []);

  // ১. টাইমআউট (৪৫ সেকেন্ড) এবং স্পষ্ট এরর মেসেজ সহ ফেচ ফাংশন
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
        // সার্ভার 200 OK দিয়েও HTML/প্লেইন-টেক্সট (যেমন প্রক্সি এরর পেজ)
        // রিটার্ন করতে পারে — response.json() তখন থ্রো করবে, তাই এটা
        // আলাদাভাবে try/catch করে স্পষ্ট মেসেজ দেওয়া হলো (নেটওয়ার্ক এরর
        // হিসেবে ভুলভাবে দেখানো এড়াতে)।
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
            // সব ফরম্যাটেই url মিসিং থাকলে ইউজারকে জেনেরিক মেসেজের বদলে
            // আসল কারণ জানানো দরকার।
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
        // সার্ভার নন-2xx রেসপন্স দিলে স্ট্যাটাস কোড সহ স্পষ্ট মেসেজ
        errorMessage = `সার্ভার এরর (কোড: ${response.status})। কিছুক্ষণ পর আবার চেষ্টা করুন।`;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        errorMessage = 'সার্ভার থেকে রেসপন্স পেতে দেরি হচ্ছে (টাইমআউট)। কিছুক্ষণ পর পুনরায় চেষ্টা করুন।';
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

  // ২. পারমিশন হ্যান্ডলিং
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

    // এই নির্দিষ্ট ডাউনলোডের জন্য একটি লোকাল ক্যান্সেল-টোকেন, যাতে
    // আগের ডাউনলোডের isCancelled ফ্ল্যাগ পরবর্তী ডাউনলোডকে প্রভাবিত না করে।
    let localCancelled = false;
    // ডাউনলোড সফলভাবে শেষ হয়েছে কিনা তার ট্র্যাক — finally ব্লকে
    // UI ক্লিয়ার করার সিদ্ধান্ত নিতে ব্যবহার হবে (এরর/exception হলেও যেন আটকে না থাকে)।
    let succeeded = false;
    isCancelled.current = false;

    try {
      // MediaLibrary গ্যালারি মূলত ছবি/ভিডিওর জন্য — অডিও ফাইল গ্যালারিতে
      // যায় না, তাই সেক্ষেত্রে গ্যালারি পারমিশনের প্রয়োজন নেই।
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

      // থ্রটলড প্রোগ্রেস আপডেট (অপ্রয়োজনীয় রি-রেন্ডার কমাবে)
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

      // ডাউনলোড নেটওয়ার্ক-পর্যায়ে ক্যান্সেল হয়েছিল কিনা এখানেই চেক করা হচ্ছে।
      // এর পরে আর isCancelled.current চেক করা হবে না — কারণ ফাইল এখন
      // ডিস্কে লেখা শেষ, এবং সেভ-পর্যায়ে ক্যান্সেল করাটা অর্থহীন এবং
      // ভুল "ব্যর্থ" স্টেট তৈরি করে (ফাইল আসলে সেভ হয়ে যাওয়া সত্ত্বেও)।
      if (isCancelled.current || !downloadResult || !downloadResult.uri) {
        localCancelled = true;
        return;
      }

      // সেভ-পর্যায়ে প্রবেশ — cancelDownload বাটন এখন থেকে লুকানো থাকবে,
      // যাতে সেভ চলাকালীন ক্যান্সেল চাপলে race condition তৈরি না হয়।
      if (isMounted.current) {
        setIsSaving(true);
      }

      if (isAudio) {
        // MediaLibrary অডিও অ্যাসেট সাপোর্ট করে না (মূলত ছবি/ভিডিওর জন্য
        // তৈরি), তাই অডিও ফাইল গ্যালারির বদলে অ্যাপের নিজস্ব ডকুমেন্ট
        // ফোল্ডারে স্থায়ীভাবে সেভ করা হচ্ছে।
        const persistentUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.moveAsync({ from: downloadResult.uri, to: persistentUri });
        // moveAsync ইতিমধ্যে ফাইলটা cache থেকে সরিয়ে নিয়েছে, তাই আলাদা
        // করে cleanupTempFile কল করার দরকার নেই।
        currentTempUri.current = null;
      } else {
        // গ্যালারিতে সেভ করা (ছবি/ভিডিও)
        if (Platform.OS === 'android') {
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
        await cleanupTempFile(downloadResult.uri);
      }

      succeeded = true;

      if (isMounted.current) {
        // ১০০% দেখানোর জন্য সংক্ষিপ্ত বিরতি — এরপর UI ক্লিয়ার হবে
        setDownloadProgress(100);
        setDownloadComplete(true);
        Alert.alert(
          'সফল!',
          isAudio
            ? 'অডিওটি সফলভাবে অ্যাপের স্টোরেজে সেভ করা হয়েছে।'
            : 'ভিডিওটি সফলভাবে গ্যালারিতে সেভ করা হয়েছে।'
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

      if (props && typeof props.onDownloadSuccess === 'function') {
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
        Alert.alert('ডাউনলোড ব্যর্থ', 'ডাউনলোড সম্পন্ন করা যায়নি। মেমোরি পারমিশন বা নেটওয়ার্ক চেক করুন।');
      }
    } finally {
      activeDownloadResumable.current = null;
      await cleanupTempFile();
      // সফলভাবে শেষ হওয়া ডাউনলোডের ক্ষেত্রে ১০০% স্টেট কিছুক্ষণ দেখানোর জন্য
      // এখানে downloadingUrl রিসেট করা হচ্ছে না (উপরের setTimeout তা করবে)।
      // অন্য যেকোনো ক্ষেত্রে — ক্যান্সেল, নেটওয়ার্ক এরর, পারমিশন ব্যর্থতা,
      // বা যেকোনো exception — succeeded false থাকবে, তাই UI এখানেই রিসেট হবে
      // এবং প্রোগ্রেস বার/বাটন স্ক্রিনে আটকে থাকবে না।
      if (isMounted.current && !succeeded) {
        setDownloadingUrl(null);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setIsSaving(false);
      }
      isCancelled.current = false;
    }
  }, [cleanupTempFile, detectPlatform, getFileExtension, props, requestMediaPermissions, sanitizeFileName, sanitizeUrl, url, videoTitle]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.appTitle}>MR DOWNLOAD</Text>
        <Text style={styles.subtitle}>সোশ্যাল মিডিয়া ভিডিও ডাউনলোডার</Text>
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
                      <Text style={styles.progressText}>
                        {downloadComplete
                          ? 'সম্পন্ন হয়েছে ✓'
                          : isSaving
                          ? 'সেভ করা হচ্ছে...'
                          : `ডাউনলোড হচ্ছে: ${downloadProgress}%`}
                      </Text>
                    </View>
                    {!downloadComplete && !isSaving ? (
                      <TouchableOpacity style={styles.cancelBtn} onPress={cancelDownload}>
                        <Text style={styles.cancelBtnText}>বাতিল</Text>
                      </TouchableOpacity>
                    ) : null}
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
