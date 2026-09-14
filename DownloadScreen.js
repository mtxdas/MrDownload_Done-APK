import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const COLORS = {
  bg: '#0a0818',
  card: '#151228',
  border: '#1e1b4b',
  text: '#ffffff',
  muted: '#6b7280',
  purple: '#8b5cf6',
  purpleDark: '#6d28d9',
  green: '#10b981',
};

export default function DownloadScreen({ onDownloadSuccess }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // লিঙ্ক পরিষ্কার করার ফাংশন (যেমন ?stkn=... বা অতিরিক্ত প্যারামিটার রিমুভ করা)
  const cleanUrl = (inputUrl) => {
    if (!inputUrl) return '';
    let trimmed = inputUrl.trim();
    // প্রশ্নের চিহ্ন (?) থাকলে তার পরের ট্র্যাকিং প্যারামিটার কেটে দেওয়া
    if (trimmed.includes('?')) {
      trimmed = trimmed.split('?')[0];
    }
    return trimmed;
  };

  // প্ল্যাটফর্ম সনাক্তকরণ ফাংশন
  const detectPlatform = (targetUrl) => {
    const lower = targetUrl.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
    if (lower.includes('vimeo.com')) return 'vimeo';
    if (lower.includes('xhamster.com')) return 'xhamster';
    if (lower.includes('xnxx.com')) return 'xnxx';
    return 'unknown';
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    if (text) {
      setUrl(text);
    }
  };

  const handleClear = () => {
    setUrl('');
  };

  const handleDownload = async () => {
    Keyboard.dismiss();

    const cleanedUrl = cleanUrl(url);

    if (!cleanedUrl) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে একটি সঠিক ভিডিও লিঙ্ক প্রবেশ করান।');
      return;
    }

    const platform = detectPlatform(cleanedUrl);
    setLoading(true);
    setStatusMessage('ভিডিওর তথ্য প্রসেস করা হচ্ছে...');

    try {
      // Cobalt Public API - যা সব ধরণের প্ল্যাটফর্ম (YouTube, IG, FB, TikTok, Twitter/X, Vimeo ইত্যাদি) সাপোর্ট করে
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: JSON.stringify({
          url: cleanedUrl,
          videoQuality: '720',
        }),
      });

      const data = await response.json();

      if (data && (data.url || data.picker)) {
        const downloadUrl = data.url || (data.picker && data.picker[0] ? data.picker[0].url : null);

        if (!downloadUrl) {
          throw new Error('ডাউনলোড লিঙ্ক পাওয়া যায়নি।');
        }

        setStatusMessage('ফাইলটি ডিভাইসে ডাউনলোড হচ্ছে...');

        // ফাইল সেভ করার পারমিশন ও প্রসেস
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('পারমিশন প্রয়োজন', 'ফাইল সেভ করার জন্য স্টোরেজ পারমিশন দরকার।');
          setLoading(false);
          return;
        }

        const fileName = `MR_Download_${Date.now()}.mp4`;
        const fileUri = FileSystem.documentDirectory + fileName;

        const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);
        await MediaLibrary.createAssetAsync(downloadRes.uri);

        // হিস্ট্রিতে যোগ করা
        if (onDownloadSuccess) {
          onDownloadSuccess({
            id: Date.now(),
            platform: platform,
            title: `${platform.toUpperCase()} Video`,
            quality: 'HD',
            size: 'MP4',
            time: 'এখনই',
          });
        }

        Alert.alert('সফল!', 'ভিডিওটি সফলভাবে গ্যালারিতে সেভ করা হয়েছে।');
        setUrl('');
      } else {
        Alert.alert('ব্যর্থ', 'ভিডিওটি ডাউনলোড করা সম্ভব হয়নি। লিঙ্কটি সঠিক কিনা নিশ্চিত করুন অথবা প্রাইভেট লিঙ্ক কিনা দেখুন।');
      }
    } catch (error) {
      Alert.alert('ত্রুটি', 'ডাউনলোড ব্যর্থ হয়েছে। সার্ভার প্রতিক্রিয়া দিচ্ছে না বা লিঙ্কটি সমর্থিত নয়।');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Title Header */}
      <View style={styles.headerBox}>
        <Ionicons name="cloud-download" size={36} color={COLORS.purple} />
        <Text style={styles.headerTitle}>MR DOWNLOADER</Text>
        <Text style={styles.headerSubtitle}>সহজেই যে কোনো সোশ্যাল মিডিয়া ভিডিও ডাউনলোড করুন</Text>
      </View>

      {/* Input Box */}
      <View style={styles.inputCard}>
        <View style={styles.inputContainer}>
          <Ionicons name="link" size={20} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="এখানে ভিডিওর লিঙ্ক পেস্ট করুন..."
            placeholderTextColor={COLORS.muted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {url ? (
            <TouchableOpacity onPress={handleClear} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePaste} style={styles.pasteBadge}>
              <Text style={styles.pasteText}>PASTE</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Download Button */}
        <TouchableOpacity
          style={[styles.downloadBtn, loading && styles.disabledBtn]}
          onPress={handleDownload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.downloadBtnText}>ডাউনলোড শুরু করুন</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress / Status Message */}
      {loading && statusMessage ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Info Badge */}
      <View style={styles.infoBox}>
        <Ionicons name="flash-outline" size={16} color={COLORS.purple} />
        <Text style={styles.infoText}>YouTube, TikTok, Instagram, FB সহ সকল প্ল্যাটফর্ম সমর্থিত</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  pasteBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pasteText: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadBtn: {
    backgroundColor: COLORS.purple,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  downloadBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBox: {
    marginTop: 16,
    alignItems: 'center',
  },
  statusText: {
    color: COLORS.purple,
    fontSize: 13,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 6,
  },
});
