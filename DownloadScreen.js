import React, { useState } from 'react';
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

const COLORS = {
  bg: '#0a0818',
  card: '#151228',
  border: '#1e1b4b',
  purple: '#7c3aed',
  text: '#ffffff',
  muted: '#6b7280',
  green: '#10b981',
};

export default function DownloadScreen({ onDownloadSuccess }) {
  const { adminSettings } = useSettings();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState([]);
  const [videoTitle, setVideoTitle] = useState('');

  // ব্যাকগ্রাউন্ড ডাউনলোড ও প্রোগ্রেস স্টেট
  const [downloadingUrl, setDownloadingUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const detectPlatform = (link) => {
    const l = link.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube';
    if (l.includes('tiktok.com')) return 'tiktok';
    if (l.includes('instagram.com')) return 'instagram';
    if (l.includes('facebook.com') || l.includes('fb.watch')) return 'facebook';
    if (l.includes('twitter.com') || l.includes('x.com')) return 'twitter';
    if (l.includes('vimeo.com')) return 'vimeo';
    if (l.includes('xhamster.com')) return 'xhamster';
    if (l.includes('xnxx.com')) return 'xnxx';
    return 'video';
  };

  const handleFetchMedia = async () => {
    if (!url || !url.trim()) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে একটি সঠিক ভিডিও লিঙ্ক লিখুন।');
      return;
    }

    const cleanUrl = url.trim();
    const platform = detectPlatform(cleanUrl);

    setLoading(true);
    setDownloadFormats([]);
    setVideoTitle('');
    Keyboard.dismiss();

    try {
      let targetUrl = adminSettings?.apiUrl || 'https://mrdownload-apk.onrender.com/download';
      if (!targetUrl.endsWith('/download')) {
        targetUrl = targetUrl.replace(/\/$/, '') + '/download';
      }

      let response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl: cleanUrl }),
      });

      let data = await response.json();

      // Cobalt API Fallback
      if (!response.ok || (!data.download_url && !data.downloadUrl && !data.url && !data.picker && !data.formats && !data.medias)) {
        const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: cleanUrl,
            vQuality: 'max',
          }),
        });
        data = await cobaltRes.json();
      }

      let parsedFormats = [];
      const itemsList = data.picker || data.formats || data.medias || data.qualities;

      if (Array.isArray(itemsList) && itemsList.length > 0) {
        parsedFormats = itemsList
          .map((item, index) => ({
            quality: item.quality || item.resolution || item.type || item.label || `Option ${index + 1}`,
            url: item.url || item.download_url || item.link,
          }))
          .filter((f) => f.url);
      }

      if (parsedFormats.length === 0) {
        if (data.hd || data.hd_url) parsedFormats.push({ quality: 'HD Quality (1080p)', url: data.hd || data.hd_url });
        if (data.sd || data.sd_url) parsedFormats.push({ quality: 'SD Quality (720p/360p)', url: data.sd || data.sd_url });
      }

      const singleUrl = data.download_url || data.downloadUrl || data.url;
      if (parsedFormats.length === 0 && singleUrl) {
        parsedFormats.push({ quality: 'HD / Best Quality', url: singleUrl });
      }

      if (parsedFormats.length > 0) {
        setDownloadFormats(parsedFormats);
        setVideoTitle(data.title || data.filename || `${platform.toUpperCase()} Video`);
      } else {
        Alert.alert('ত্রুটি', data.message || 'ভিডিওটি বিশ্লেষণ করা সম্ভব হয়নি। লিঙ্কটি আবার পরীক্ষা করুন।');
      }
    } catch (error) {
      Alert.alert('ব্যর্থ', error.message || 'নেটওয়ার্ক সমস্যা অথবা সার্ভার সাড়া দিচ্ছে না।');
    } finally {
      setLoading(false);
    }
  };

  // expo-file-system দিয়ে সরাসরি মেমোরিতে ভিডিও ডাউনলোড ফাংশন
  const startInAppDownload = async (fileUrl, quality) => {
    try {
      // ১. মেমোরি পারমিশন চাওয়া
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('পারমিশন প্রয়োজন', 'গ্যালারিতে ভিডিও সেভ করার জন্য পারমিশন দিন।');
        return;
      }

      setDownloadingUrl(fileUrl);
      setDownloadProgress(0);

      const filename = `MR_Download_${Date.now()}.mp4`;
      const fileUri = FileSystem.documentDirectory + filename;

      // ২. ডাউনলোডের প্রোগ্রেস ট্র্যাক করা
      const callback = (downloadProgressData) => {
        const progress =
          downloadProgressData.totalBytesWritten /
          downloadProgressData.totalBytesExpectedToWrite;
        setDownloadProgress(Math.round(progress * 100));
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        fileUri,
        {},
        callback
      );

      // ৩. ব্যাকগ্রাউন্ড ডাউনলোড শুরু
      const { uri } = await downloadResumable.downloadAsync();

      // ৪. গ্যালারি/মিডিয়া লাইব্রেরিতে সেভ করা
      await MediaLibrary.saveToLibraryAsync(uri);

      Alert.alert('সফল!', 'ভিডিওটি সফলভাবে আপনার ফোনের গ্যালারিতে সেভ হয়েছে।');

      const platform = detectPlatform(url);
      if (onDownloadSuccess) {
        onDownloadSuccess({
          id: Date.now(),
          platform: platform,
          title: videoTitle || `${platform.toUpperCase()} Video`,
          quality: quality || 'HD',
          size: 'Auto',
          time: 'এখনই',
        });
      }
    } catch (err) {
      Alert.alert('ডাউনলোড ব্যর্থ', 'ভিডিওটি ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setDownloadingUrl(null);
      setDownloadProgress(0);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MR DOWNLOAD</Text>
        <Text style={styles.subtitle}>যেকোনো সোশ্যাল মিডিয়া ভিডিও ডাউনলোড করুন</Text>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="link" size={20} color={COLORS.muted} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.input}
          placeholder="ভিডিও লিংক পেস্ট করুন..."
          placeholderTextColor={COLORS.muted}
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (downloadFormats.length > 0) setDownloadFormats([]);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {url.length > 0 && (
          <TouchableOpacity onPress={() => { setUrl(''); setDownloadFormats([]); }}>
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.downloadBtn, loading && { opacity: 0.7 }]}
        onPress={handleFetchMedia}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.downloadBtnText}>ভিডিও ফরম্যাট ফেচ করুন</Text>
        )}
      </TouchableOpacity>

      {downloadFormats.length > 0 && (
        <View style={styles.formatContainer}>
          <Text style={styles.formatTitle}>ডাউনলোড ফরম্যাট সিলেক্ট করুন:</Text>
          {downloadFormats.map((item, index) => {
            const isThisDownloading = downloadingUrl === item.url;
            return (
              <View key={index} style={styles.formatCardWrapper}>
                <TouchableOpacity
                  style={styles.formatCard}
                  onPress={() => startInAppDownload(item.url, item.quality)}
                  disabled={!!downloadingUrl}
                >
                  <View style={styles.formatInfo}>
                    <Ionicons name="download-outline" size={22} color={COLORS.green} />
                    <Text style={styles.formatText}>{item.quality}</Text>
                  </View>
                  <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} />
                </TouchableOpacity>

                {/* প্রোগ্রেস বার (Progress Bar) */}
                {isThisDownloading && (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
                    <Text style={styles.progressText}>ডাউনলোড হচ্ছে: {downloadProgress}%</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
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
  progressContainer: {
    marginTop: 6,
    backgroundColor: '#1f1b3a',
    borderRadius: 8,
    height: 18,
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
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 1,
  },
});
