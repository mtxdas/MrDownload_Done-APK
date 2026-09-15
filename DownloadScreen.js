import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Render Backend Server Base URL
const API_BASE_URL = 'https://mrdownload-apk.onrender.com';

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
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState([]);
  const [videoTitle, setVideoTitle] = useState('');

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

  // ১. Cobalt / Backend থেকে ফাইল বা ফরম্যাটের অপশন ফেচ করার ফাংশন
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
      // প্রথমে নিজস্ব Render Backend-এ চেষ্টা
     let response = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: cleanUrl, platform }),
      });

      let data = await response.json();

      // Render সার্ভারে না পাওয়া গেলে সরাসরি Cobalt API-তে প্রসেস করা
      if (!response.ok || (!data.downloadUrl && !data.url && !data.picker)) {
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

      // যদি একক ডাউনলোড লিঙ্ক পাওয়া যায়
      if (data.url || data.downloadUrl) {
        const finalUrl = data.url || data.downloadUrl;
        setDownloadFormats([{ quality: 'HD / Auto Quality', url: finalUrl }]);
        setVideoTitle(data.filename || `${platform.toUpperCase()} Video`);
      } 
      // যদি একাধিক কোয়ালিটি/ফরম্যাট থাকে (Picker Mode)
      else if (data.picker && Array.isArray(data.picker)) {
        const formats = data.picker.map((item, index) => ({
          quality: item.quality || item.type || `Option ${index + 1}`,
          url: item.url,
        }));
        setDownloadFormats(formats);
        setVideoTitle(`${platform.toUpperCase()} Video`);
      } else {
        Alert.alert('ত্রুটি', 'ভিডিওটি বিশ্লেষণ করা সম্ভব হয়নি। লিঙ্কটি আবার পরীক্ষা করুন।');
      }
    } catch (error) {
      Alert.alert('ব্যর্থ', 'নেটওয়ার্ক সমস্যা অথবা সার্ভার সাড়া দিচ্ছে না।');
    } finally {
      setLoading(false);
    }
  };

  // ২. নির্দিষ্ট ফরম্যাটের ওপর ক্লিক করলে সরাসরি ডাউনলোডার সক্রিয় করার ফাংশন
  const startDirectDownload = async (fileUrl, quality) => {
    try {
      const platform = detectPlatform(url);
      await Linking.openURL(fileUrl);

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
      Alert.alert('ত্রুটি', 'ডাউনলোড শুরু করা সম্ভব হয়নি।');
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

      {/* ফরম্যাট ও ডাউনলোডের অপশনসমূহ (অ্যাপের ভেতরেই দেখাবে) */}
      {downloadFormats.length > 0 && (
        <View style={styles.formatContainer}>
          <Text style={styles.formatTitle}>ডাউনলোড ফরম্যাট সিলেক্ট করুন:</Text>
          {downloadFormats.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.formatCard}
              onPress={() => startDirectDownload(item.url, item.quality)}
            >
              <View style={styles.formatInfo}>
                <Ionicons name="download-outline" size={22} color={COLORS.green} />
                <Text style={styles.formatText}>{item.quality}</Text>
              </View>
              <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} />
            </TouchableOpacity>
          ))}
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
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
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
});
