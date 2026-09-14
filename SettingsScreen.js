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

  const handleDownload = async () => {
    if (!url || !url.trim()) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে একটি সঠিক ভিডিও লিঙ্ক লিখুন।');
      return;
    }

    const cleanUrl = url.trim();
    const platform = detectPlatform(cleanUrl);

    setLoading(true);
    Keyboard.dismiss();

    try {
      // ১. Render Backend-এ ডাউনলোডের রিকোয়েস্ট পাঠানো
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: cleanUrl, platform }),
      });

      const data = await response.json();

      if (response.ok && data && (data.downloadUrl || data.url)) {
        const fileUrl = data.downloadUrl || data.url;
        await Linking.openURL(fileUrl);

        if (onDownloadSuccess) {
          onDownloadSuccess({
            id: Date.now(),
            platform: platform,
            title: data.title || `${platform.toUpperCase()} Video`,
            quality: data.quality || 'HD',
            size: data.size || 'Auto',
            time: 'এখনই',
          });
        }
      } else {
        // ২. Render সার্ভারে না পাওয়া গেলে রিডাইরেক্ট ফলব্যাক
        let targetUrl = `https://cobalt.tools/?url=${encodeURIComponent(cleanUrl)}`;

        if (platform === 'tiktok') {
          targetUrl = `https://ssstik.io/pt?url=${encodeURIComponent(cleanUrl)}`;
        } else if (platform === 'youtube' || platform === 'facebook') {
          targetUrl = `https://savefrom.net/#url=${encodeURIComponent(cleanUrl)}`;
        }

        await Linking.openURL(targetUrl);

        if (onDownloadSuccess) {
          onDownloadSuccess({
            id: Date.now(),
            platform: platform,
            title: `${platform.toUpperCase()} Video`,
            quality: 'HD',
            size: 'Auto',
            time: 'এখনই',
          });
        }
      }
    } catch (error) {
      // ৩. নেটওয়ার্ক ত্রুটি হলে ওয়েবে ওপেন
      try {
        let fallbackUrl = `https://cobalt.tools/?url=${encodeURIComponent(cleanUrl)}`;
        if (platform === 'tiktok') {
          fallbackUrl = `https://ssstik.io/pt?url=${encodeURIComponent(cleanUrl)}`;
        }
        await Linking.openURL(fallbackUrl);
      } catch (err) {
        Alert.alert('ব্যর্থ', 'ডাউনলোড প্রসেস করা সম্ভব হয়নি। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {url.length > 0 && (
          <TouchableOpacity onPress={() => setUrl('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.downloadBtn, loading && { opacity: 0.7 }]}
        onPress={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.downloadBtnText}>ডাউনলোড শুরু করুন</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    justifyContent: 'center',
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
    backgroundColor: COLORS.green,
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
});
