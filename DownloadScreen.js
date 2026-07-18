import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { COLORS, PLATFORMS } from './constants';

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
      // আপনার নতুন ব্যাকএন্ড সার্ভার লিংক
      const response = await fetch(
        'https://mrdownload-backend.onrender.com/v1/social/autolink',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

      // ডাউনলোড শুরু করুন
      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        fileUri,
        {},
        (p) => {
          const progress = p.totalBytesWritten / p.totalBytesExpectedToWrite;
          setProgress(progress);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();

      // গ্যালারিতে সেভ করা
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('MrDownload', asset, false);

      Alert.alert('✅ সফল', 'ভিডিও গ্যালারিতে সেভ হয়েছে!');
      onAddHistory?.({ url, title: data.title, date: new Date() });
      
    } catch (error) {
      Alert.alert('❌ এরর', 'ডাউনলোড করতে সমস্যা হচ্ছে। সার্ভারটি কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।');
    } finally {
      setLoading('');
      setProgress(0);
    }
  };

  // বাকি UI কোডগুলো আপনার আগের মতোই থাকবে...
  // (আপনি যদি চান আমি পুরো কোডটিই লিখে দিতে পারি, তবে ফাইলটি বেশ বড় হবে)
}
