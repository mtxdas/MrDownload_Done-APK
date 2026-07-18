import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { COLORS } from './constants';

export default function DownloadScreen({ onAddHistory }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!url.trim()) {
      Alert.alert('ভুল', 'অনুগ্রহ করে একটি লিংক দিন');
      return;
    }

    setLoading(true);
    const cleanUrl = url.trim().split('?')[0];

    try {
      console.log("Fetching data for:", cleanUrl);
      
      const response = await fetch('https://mrdownload-backend.onrender.com/v1/social/autolink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json();
      console.log("API Response received");

      if (!data || !data.medias || data.medias.length === 0) {
        throw new Error("No media found");
      }

      // ভিডিও URL বের করা
      const videoUrl = data.medias[0].url || data.medias[0].link;
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('অনুমতি প্রয়োজন', 'ভিডিও সেভ করার জন্য স্টোরেজ পারমিশন দিন');
        setLoading(false);
        return;
      }

      const filename = `Video_${Date.now()}.mp4`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResumable = FileSystem.createDownloadResumable(videoUrl, fileUri);
      const { uri } = await downloadResumable.downloadAsync();

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('MrDownload', asset, false);

      Alert.alert('✅ সফল', 'ভিডিও গ্যালারিতে সেভ হয়েছে!');
      onAddHistory?.({ url: cleanUrl, title: data.title || 'Video', date: new Date() });
      
    } catch (error) {
      console.error("Download Error:", error);
      Alert.alert('❌ ব্যর্থ', 'ভিডিওটি ডাউনলোড করা সম্ভব হয়নি। লিংকটি সঠিক কিনা নিশ্চিত করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="টিকটক লিংক এখানে দিন..."
        placeholderTextColor="#888"
        value={url}
        onChangeText={setUrl}
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>ডাউনলোড শুরু করুন</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0818', padding: 20 },
  input: { backgroundColor: '#151228', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 20 },
  button: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
