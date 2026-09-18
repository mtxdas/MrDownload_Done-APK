import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function DownloadScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // নির্ধারিত ৪টি ফরম্যাট: 720p, 480p, 360p এবং MP3
  const [formats, setFormats] = useState([
    { id: '1', title: 'HD Video (720p)', quality: '720p', type: 'video', icon: 'video-high', fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: '2', title: 'Normal Video (480p)', quality: '480p', type: 'video', icon: 'video-medium', fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: '3', title: 'Low Video (360p)', quality: '360p', type: 'video', icon: 'video-outline', fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: '4', title: 'Audio Only (MP3)', quality: 'MP3', type: 'audio', icon: 'music-note', fileUrl: 'https://www.w3schools.com/html/horse.mp3' },
  ]);

  const handleFetchFormats = () => {
    if (!url.trim()) {
      Alert.alert('ত্রুটি', 'দয়া করে একটি বৈধ লিংক দিন।');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('সফল', 'ফরম্যাটগুলো লোড হয়েছে। নিচের লিস্ট থেকে পছন্দের ফরম্যাটে ক্লিক করুন।');
    }, 1000);
  };

  const handleDownload = async (item) => {
    try {
      setDownloadingFormat(item.id);
      setDownloadProgress(0);

      const filename = `MrDownload_${Date.now()}.${item.type === 'audio' ? 'mp3' : 'mp4'}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        item.fileUrl,
        fileUri,
        {},
        (downloadSnapshot) => {
          const progress = downloadSnapshot.totalBytesWritten / downloadSnapshot.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      setDownloadingFormat(null);

      if (result && result.uri) {
        Alert.alert('ডাউনলোড সম্পন্ন', `ফাইলটি সফলভাবে সেভ হয়েছে!`, [
          { text: 'ওপেন/শেয়ার করুন', onPress: () => Sharing.shareAsync(result.uri) },
          { text: 'ঠিক আছে' }
        ]);
      }
    } catch (error) {
      setDownloadingFormat(null);
      Alert.alert('ডাউনলোড ব্যর্থ', 'দুঃখিত, ফাইলটি ডাউনলোড করা যায়নি। আবার চেষ্টা করুন।');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>MR DOWNLOAD</Text>
      <Text style={styles.subTitle}>Social Media Video Downloader</Text>

      <View style={styles.inputContainer}>
        <Icon name="link" size={20} color="#888" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="এখানে লিংক পেস্ট করুন..."
          placeholderTextColor="#888"
          value={url}
          onChangeText={setUrl}
        />
        {url.length > 0 && (
          <TouchableOpacity onPress={() => setUrl('')}>
            <Icon name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.fetchButton} onPress={handleFetchFormats} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fetchButtonText}>Fetch Format Links</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Select Download Format:</Text>

      {formats.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.formatCard}
          onPress={() => handleDownload(item)}
          disabled={downloadingFormat !== null}
        >
          <View style={styles.formatInfo}>
            <Icon name={item.icon} size={24} color="#3b82f6" />
            <Text style={styles.formatText}>{item.title}</Text>
          </View>
          {downloadingFormat === item.id ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Icon name="download-circle" size={28} color="#3b82f6" />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0f172a',
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 20,
  },
  subTitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    height: 45,
  },
  fetchButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  fetchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formatText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
});
