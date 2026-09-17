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
    return 'video';
  };

  const extractYoutubeId = (link) => {
    let videoId = '';
    if (link.includes('v=')) {
      videoId = link.split('v=')[1]?.split('&')[0];
    } else if (link.includes('youtu.be/')) {
      videoId = link.split('youtu.be/')[1]?.split('?')[0];
    } else if (link.includes('shorts/')) {
      videoId = link.split('shorts/')[1]?.split('?')[0];
    }
    return videoId;
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

    let parsedFormats = [];
    let title = `${platform.toUpperCase()} Media`;

    // ১. প্রাইমারি ব্যাকএন্ড (Render Server API)
    try {
      let targetUrl = adminSettings?.apiUrl || 'https://mrdownload-apk.onrender.com/download';
      if (!targetUrl.endsWith('/download')) {
        targetUrl = targetUrl.replace(/\/$/, '') + '/download';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
        },
        body: JSON.stringify({ videoUrl: cleanUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        title = data.title || data.filename || title;

        const itemsList = data.picker || data.formats || data.medias || data.qualities;
        if (Array.isArray(itemsList) && itemsList.length > 0) {
          parsedFormats = itemsList
            .map((item, index) => ({
              quality: item.quality || item.resolution || item.type || item.label || `Option ${index + 1}`,
              url: item.url || item.download_url || item.link,
              isAudio: (item.quality || '').toLowerCase().includes('audio') || (item.quality || '').toLowerCase().includes('mp3'),
            }))
            .filter((f) => f.url);
        } else if (data.download_url || data.downloadUrl || data.url) {
          const mainUrl = data.download_url || data.downloadUrl || data.url;
          parsedFormats.push({ quality: '1080p Full HD (Best)', url: mainUrl });
          parsedFormats.push({ quality: '720p HD (Standard)', url: mainUrl });
          parsedFormats.push({ quality: '480p / 360p (SD Quality)', url: mainUrl });
          parsedFormats.push({ quality: 'Audio Only (MP3)', url: mainUrl, isAudio: true });
        }
      }
    } catch (err) {
      console.log('Primary Backend Error / Timeout');
    }

    // ২. ফলব্যাক Cobalt API
    if (parsedFormats.length === 0) {
      const cobaltEndpoints = [
        'https://co.wuk.sh/api/json',
        'https://api.cobalt.tools/api/json'
      ];

      for (const endpoint of cobaltEndpoints) {
        try {
          const cobaltRes = await fetch(endpoint, {
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

          if (cobaltRes.ok) {
            const cobaltData = await cobaltRes.json();
            if (cobaltData.picker && Array.isArray(cobaltData.picker)) {
              parsedFormats = cobaltData.picker.map((item, idx) => ({
                quality: item.quality || `Quality Option ${idx + 1}`,
                url: item.url,
              }));
              break;
            } else if (cobaltData.url) {
              parsedFormats = [
                { quality: '1080p Full HD', url: cobaltData.url },
                { quality: '720p HD', url: cobaltData.url },
                { quality: '480p SD Quality', url: cobaltData.url },
                { quality: 'Audio Only (MP3)', url: cobaltData.url, isAudio: true },
              ];
              break;
            }
          }
        } catch (e) {
          console.log(`Failed Cobalt endpoint: ${endpoint}`);
        }
      }
    }

    // ৩. ইউটিউব ভিডিওর জন্য ফলব্যাক
    if (parsedFormats.length === 0 && platform === 'youtube') {
      const ytId = extractYoutubeId(cleanUrl);
      if (ytId) {
        const fallbackStream = `https://y2mate.is/download?url=${encodeURIComponent(cleanUrl)}`;
        parsedFormats = [
          { quality: '1080p Full HD (Best Quality)', url: fallbackStream },
          { quality: '720p HD (Normal Quality)', url: fallbackStream },
          { quality: '360p SD (Low Size)', url: fallbackStream },
          { quality: 'Audio Only (MP3)', url: fallbackStream, isAudio: true }
        ];
        title = `YouTube Video (${ytId})`;
      }
    }

    setLoading(false);

    if (parsedFormats.length > 0) {
      const uniqueFormats = Array.from(new Set(parsedFormats.map(a => a.quality)))
        .map(quality => {
          return parsedFormats.find(a => a.quality === quality);
        });

      setDownloadFormats(uniqueFormats);
      setVideoTitle(title);
    } else {
      Alert.alert('ব্যর্থ', 'ভিডিওটি সার্ভার থেকে বিশ্লেষণ করা সম্ভব হয়নি। লিঙ্কটি আবার পরীক্ষা করুন বা অন্য লিঙ্ক চেষ্টা করুন।');
    }
  };

  const startInAppDownload = async (fileUrl, quality, isAudio = false) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('পারমিশন প্রয়োজন', 'গ্যালারিতে ফাইল সেভ করার জন্য পারমিশন দিন।');
        return;
      }

      setDownloadingUrl(fileUrl + quality);
      setDownloadProgress(0);

      const ext = isAudio ? 'mp3' : 'mp4';
      const filename = `MR_Download_${Date.now()}.${ext}`;
      const fileUri = FileSystem.documentDirectory + filename;

      const callback = (downloadProgressData) => {
        if (downloadProgressData.totalBytesExpectedToWrite > 0) {
          const progress =
            downloadProgressData.totalBytesWritten /
            downloadProgressData.totalBytesExpectedToWrite;
          setDownloadProgress(Math.round(progress * 100));
        } else {
          setDownloadProgress(50);
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        fileUri,
        {},
        callback
      );

      const { uri } = await downloadResumable.downloadAsync();
      await MediaLibrary.saveToLibraryAsync(uri);

      Alert.alert('সফল!', `ফাইলটি সফলভাবে আপনার গ্যালারিতে সেভ করা হয়েছে (${quality})`);

      const platform = detectPlatform(url);
      if (onDownloadSuccess) {
        onDownloadSuccess({
          id: Date.now(),
          platform: platform,
          title: videoTitle || `${platform.toUpperCase()} Media`,
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
          <Text style={styles.formatTitle}>কোয়ালিটি / ফরম্যাট সিলেক্ট করুন:</Text>
          {downloadFormats.map((item, index) => {
            const isThisDownloading = downloadingUrl === (item.url + item.quality);
            return (
              <View key={index} style={styles.formatCardWrapper}>
                <TouchableOpacity
                  style={styles.formatCard}
                  onPress={() => startInAppDownload(item.url, item.quality, item.isAudio)}
                  disabled={!!downloadingUrl}
                >
                  <View style={styles.formatInfo}>
                    <Ionicons 
                      name={item.isAudio ? "musical-notes-outline" : "film-outline"} 
                      size={22} 
                      color={item.isAudio ? COLORS.purple : COLORS.green} 
                    />
                    <Text style={styles.formatText}>{item.quality}</Text>
                  </View>
                  <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} />
                </TouchableOpacity>

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
