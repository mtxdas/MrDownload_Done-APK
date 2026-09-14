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
  purpleDark: '#6d28d9',
  text: '#ffffff',
  muted: '#6b7280',
  green: '#10b981',
};

export default function DownloadScreen({ onDownloadSuccess }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // লিঙ্ক থেকে প্ল্যাটফর্ম শনাক্ত করার ফাংশন
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
    return 'unknown';
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
      // বহিরাগত ফ্রি ডাউনলোডার প্রক্সি API ব্যবহার করা হচ্ছে যা শর্ট লিংক রিডাইরেক্ট সাপোর্ট করে
      let targetDownloadUrl = '';

      if (platform === 'tiktok') {
        // TikWM API দিয়ে TikTok ওয়াটারমার্ক ছাড়া ভিডিও লিংক আনা
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`);
        const json = await res.json();
        if (json && json.data && json.data.play) {
          targetDownloadUrl = json.data.play;
        } else {
          // বিকল্প API রিকোয়েস্ট
          targetDownloadUrl = `https://cobalt.tools/api/json`;
        }
      } else {
        // অন্যান্য প্ল্যাটফর্মের জন্য সরাসরি সেভার সার্ভিস রিডাইরেক্ট
        targetDownloadUrl = cleanUrl;
      }

      // হিস্ট্রিতে যুক্ত করা
      if (onDownloadSuccess) {
        onDownloadSuccess({
          id: Date.now(),
          platform: platform,
          title: `${platform.toUpperCase()} Video`,
          quality: 'HD / Original',
          size: 'Auto',
          time: 'এখনই',
        });
      }

      // যদি ডিরেক্ট লিংক পাওয়া যায় তবে ব্রাউজারে বা ডাউনলোডারে ওপেন করা
      if (targetDownloadUrl && targetDownloadUrl.startsWith('http')) {
        await Linking.openURL(targetDownloadUrl);
        Alert.alert('সফল', 'ভিডিওটি ডাউনলোডের জন্য প্রক্রিয়াকরণ শুরু হয়েছে।');
      } else {
        // ফলব্যাক ডাউনলোডার ওয়েবে ওপেন
        const fallbackUrl = `https://cobalt.tools/`;
        await Linking.openURL(fallbackUrl);
        Alert.alert('তথ্য', 'ভিডিওটি ডাউনলোড করতে ডাউনলোডার পেজ খোলা হয়েছে।');
      }
    } catch (error) {
      // নেটওয়ার্ক ব্যর্থতায় ফ্রি ওয়েব সার্ভিস দিয়ে ব্যাকআপ ডাউনলোডের ব্যবস্থা
      try {
        const fallbackWeb = `https://savefrom.net/`;
        await Linking.openURL(fallbackWeb);
      } catch (err) {
        Alert.alert('ব্যর্থ', 'ভিডিওটি ডাউনলোড করা সম্ভব হয়নি। লিঙ্কটি সঠিক কিনা নিশ্চিত করুন।');
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
