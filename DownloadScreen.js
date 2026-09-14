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
      // প্ল্যাটফর্ম অনুযায়ী সরাসরি ইউনিভার্সাল ডাউনলোডার পোর্টালে রিডাইরেক্ট
      let targetUrl = `https://cobalt.tools/?url=${encodeURIComponent(cleanUrl)}`;

      if (platform === 'tiktok') {
        targetUrl = `https://ssstik.io/pt?url=${encodeURIComponent(cleanUrl)}`;
      } else if (platform === 'youtube' || platform === 'facebook') {
        targetUrl = `https://savefrom.net/#url=${encodeURIComponent(cleanUrl)}`;
      }

      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
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
      } else {
        Alert.alert('ত্রুটি', 'লিঙ্কটি ব্রাউজারে ওপেন করা যাচ্ছে না।');
      }
    } catch (error) {
      Alert.alert('ব্যর্থ', 'ডাউনলোড প্রসেস করা সম্ভব হয়নি। আবার চেষ্টা করুন।');
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
