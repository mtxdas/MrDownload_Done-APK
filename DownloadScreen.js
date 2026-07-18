import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { COLORS } from './constants';

export default function DownloadScreen({ onAddHistory }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState('');
  const [progress, setProgress] = useState(0);

  const handleDownload = async (quality) => {
    if (!url.trim()) {
      Alert.alert('ভুল', 'একটি লিংক দিন');
      return;
    }

    setLoading('fetching');
    
    // লিংক ক্লিন করা (টিকটকের বাড়তি প্যারামিটার মুছে ফেলা)
    const cleanUrl = url.trim().split('?')[0];

    try {
      const response = await fetch('https://mrdownload-backend.onrender.com/v1/social/autolink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json();
      console.log("API Response:", data); // টার্মিনালে রেসপন্স দেখতে

      if (!data || !data.medias || data.medias.length === 0) {
        Alert.alert('❌ ব্যর্থ', 'ভিডিও পাওয়া যায়নি। সার্ভার বা লিংক চেক করুন।');
        setLoading('');
        return;
      }

      let selected = data.medias[0];
      // কোয়ালিটি ফিল্টার
      if (quality === 'MP3 Audio') {
        const audio = data.medias.find(m => m.extension === 'mp3' || m.type === 'audio');
        if (audio) selected = audio;
      }

      const videoUrl = selected.url || selected.link;
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('অনুমতি প্রয়োজন', 'স্টোরেজ পারমিশন দিন');
        setLoading('');
        return;
      }

      setLoading('downloading');
      const filename = `MrDownload_${Date.now()}.${quality === 'MP3 Audio' ? 'mp3' : 'mp4'}`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResumable = FileSystem.createDownloadResumable(videoUrl, fileUri, {}, (p) => {
        setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });

      const { uri } = await downloadResumable.downloadAsync();
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('MrDownload', asset, false);

      Alert.alert('✅ সফল', 'গ্যালারিতে সেভ হয়েছে!');
      onAddHistory?.({ url: cleanUrl, title: data.title || 'Video', date: new Date() });
      
    } catch (error) {
      console.log("Full Error:", error);
      Alert.alert('❌ এরর', 'সার্ভারে সংযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    } finally {
      setLoading('');
      setProgress(0);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="ভিডিও লিংক দিন..."
        placeholderTextColor={COLORS.muted}
        value={url}
        onChangeText={setUrl}
      />
      <TouchableOpacity style={styles.button} onPress={() => handleDownload('HD')}>
        <Text style={styles.buttonText}>
          {loading === 'fetching' ? <ActivityIndicator color="#fff" /> : 'ডাউনলোড (HD)'}
        </Text>
      </TouchableOpacity>
      {loading === 'downloading' && <Text style={styles.progressText}>ডাউনলোড হচ্ছে: {Math.round(progress * 100)}%</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  input: { backgroundColor: COLORS.card, color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: COLORS.green, padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  progressText: { color: '#fff', textAlign: 'center', marginTop: 10 }
});
