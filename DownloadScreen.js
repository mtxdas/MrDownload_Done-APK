import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { COLORS, PLATFORMS } from './constants';

const RAPID_API_KEY = '3c1dbb0f84msh61e8ba483cbe283p12a409jsn61d912b89ec';

export default function DownloadScreen({ onAddHistory }) {
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState('');
  const [detected, setDetected] = useState(null);
  const [progress, setProgress] = useState(0);

  const detectPlatform = (link) => {
    if (!link) return null;
    const l = link.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube';
    if (l.includes('tiktok.com'))    return 'tiktok';
    if (l.includes('instagram.com')) return 'instagram';
    if (l.includes('facebook.com'))  return 'facebook';
    if (l.includes('twitter.com') || l.includes('x.com')) return 'twitter';
    if (l.includes('vimeo.com'))     return 'vimeo';
    if (l.includes('pinterest.com')) return 'pinterest';
    if (l.includes('reddit.com'))    return 'reddit';
    return 'other';
  };

  const handleUrlChange = (text) => {
    setUrl(text);
    setDetected(detectPlatform(text));
  };

  const handleDownload = async (quality) => {
    if (!url.trim()) {
      Alert.alert('ভুল', 'একটি লিংক দিন');
      return;
    }

    setLoading('fetching');
    setProgress(0);

    try {
      const response = await fetch(
        'https://auto-download-all-in-one.p.rapidapi.com/v1/social/autolink',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': RAPID_API_KEY,
            'x-rapidapi-host': 'auto-download-all-in-one.p.rapidapi.com',
          },
          body: JSON.stringify({ url: url.trim() }),
        }
      );

      const data = await response.json();

      if (!data || !data.medias || data.medias.length === 0) {
        Alert.alert('❌ ব্যর্থ', 'ভিডিও পাওয়া যায়নি। লিংক চেক করুন।');
        setLoading('');
        return;
      }

      // Quality অনুযায়ী select
      let selected = data.medias[0];
      if (quality === 'MP3 Audio') {
        const audio = data.medias.find(m =>
          m.extension === 'mp3' ||
          m.type === 'audio' ||
          m.quality?.toLowerCase().includes('audio')
        );
        if (audio) selected = audio;
      } else if (quality === '1080p FHD') {
        const hd = data.medias.find(m => m.quality?.includes('1080'));
        if (hd) selected = hd;
      } else if (quality === '720p HD') {
        const hd = data.medias.find(m => m.quality?.includes('720'));
        if (hd) selected = hd;
      }

      const videoUrl = selected.url || selected.link;
      if (!videoUrl) {
        Alert.alert('❌ ব্যর্থ', 'Download link পাওয়া যায়নি');
        setLoading('');
        return;
      }

      // Permission নিন
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission লাগবে', 'Storage permission দিন');
        setLoading('');
        return;
      }

      const ext = quality === 'MP3 Audio' ? 'mp3' : 'mp4';
      const filename = `MrDownload_${Date.now()}.${ext}`;
      const fileUri = FileSystem.documentDirectory + filename;

      setLoading('downloading');

      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        fileUri,
        {},
        (p) => {
          const percent = p.totalBytesExpectedToWrite > 0
            ? Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100)
            : 0;
          setProgress(percent);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result && result.status === 200) {
        await MediaLibrary.saveToLibraryAsync(result.uri);

        onAddHistory({
          id: Date.now(),
          platform: detected || 'other',
          title: data.title || 'Video',
          quality,
          size: selected.size || '—',
          time: 'এইমাত্র',
        });

        setUrl('');
        setDetected(null);
        Alert.alert('✅ সফল!', 'ভিডিও গ্যালারিতে সেভ হয়েছে!');
      } else {
        Alert.alert('❌ ব্যর্থ', 'Download সম্পন্ন হয়নি');
      }

    } catch (error) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading('');
      setProgress(0);
    }
  };

  const platform = detected
    ? PLATFORMS.find(p => p.id === detected)
    : null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <Image
        source={require('./assets/IMG_20260520_134733_082.jpg')}
        style={styles.watermark}
        resizeMode="contain"
        pointerEvents="none"
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚀 MR Download</Text>
        <Text style={styles.headerSub}>যেকোনো প্ল্যাটফর্ম থেকে ভিডিও ডাউনলোড করুন</Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.label}>ভিডিও লিংক দিন</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={COLORS.muted}
            value={url}
            onChangeText={handleUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {url.length > 0 && (
            <TouchableOpacity
              onPress={() => { setUrl(''); setDetected(null); }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {detected && (
          <View style={[styles.badge, {
            backgroundColor: (platform?.color || '#666') + '22',
            borderColor: (platform?.color || '#666') + '44',
          }]}>
            <Ionicons
              name={platform?.icon || 'globe-outline'}
              size={16}
              color={platform?.color || '#aaa'}
            />
            <Text style={[styles.badgeText, { color: platform?.color || '#aaa' }]}>
              {platform?.name || 'Platform'} সনাক্ত হয়েছে ✓
            </Text>
          </View>
        )}
      </View>

      {detected && (
        <View style={styles.qualityCard}>
          <Text style={styles.label}>কোয়ালিটি বেছে নিন</Text>
          {[
            { label: '1080p FHD', icon: 'diamond',      color: '#a855f7' },
            { label: '720p HD',   icon: 'star',          color: '#3b82f6' },
            { label: '480p SD',   icon: 'flash',         color: '#22c55e' },
            { label: 'MP3 Audio', icon: 'musical-notes', color: '#f59e0b' },
          ].map((q) => (
            <TouchableOpacity
              key={q.label}
              style={[styles.qualityBtn, { borderColor: q.color + '66' }]}
              onPress={() => handleDownload(q.label)}
              disabled={!!loading}
            >
              <View style={[styles.qualityIcon, { backgroundColor: q.color + '22' }]}>
                <Ionicons name={q.icon} size={18} color={q.color} />
              </View>
              <Text style={styles.qualityText}>{q.label}</Text>
              <Ionicons name="download-outline" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading === 'fetching' && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>ভিডিও তথ্য আনা হচ্ছে...</Text>
        </View>
      )}

      {loading === 'downloading' && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>ডাউনলোড হচ্ছে... {progress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {!detected && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            💡 YouTube, TikTok, Instagram, Facebook, Twitter, Pinterest, Reddit ও আরো অনেক platform সাপোর্টেড
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 16 },
  watermark:    { position: 'absolute', width: '85%', height: '55%', alignSelf: 'center', top: '15%', left: '7.5%', opacity: 0.07, zIndex: 0 },
  header:       { alignItems: 'center', paddingVertical: 24 },
  headerTitle:  { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  headerSub:    { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  inputCard:    { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  label:        { fontSize: 12, color: COLORS.muted, marginBottom: 8, letterSpacing: 1 },
  inputRow:     { flexDirection: 'row', alignItems: 'center' },
  input:        { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  clearBtn:     { padding: 8 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 8, borderRadius: 8, borderWidth: 1 },
  badgeText:    { fontSize: 13, fontWeight: '600' },
  qualityCard:  { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  qualityBtn:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.03)', gap: 12 },
  qualityIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qualityText:  { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  loadingCard:  { alignItems: 'center', padding: 24, gap: 12 },
  loadingText:  { color: COLORS.muted, fontSize: 14 },
  progressBar:  { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#a855f7', borderRadius: 3 },
  tipCard:      { backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
  tipText:      { fontSize: 13, color: '#a78bfa', lineHeight: 20, textAlign: 'center' },
});
