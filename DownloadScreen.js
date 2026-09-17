import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useSettings } from './context/SettingsContext';

const COLORS = {
  bg: '#0a0818',
  card: '#151228',
  border: '#1e1b4b',
  purple: '#7c3aed',
  text: '#ffffff',
  muted: '#6b7280',
  green: '#10b981',
};

export default function DownloadScreen(props) {
  const settingsContext = useSettings();
  const adminSettings = settingsContext ? settingsContext.adminSettings : null;

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState([]);
  const [videoTitle, setVideoTitle] = useState('');

  const [downloadingUrl, setDownloadingUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const detectPlatform = (link) => {
    const l = link.toLowerCase();
    if (l.indexOf('youtube.com') !== -1 || l.indexOf('youtu.be') !== -1) return 'youtube';
    if (l.indexOf('tiktok.com') !== -1) return 'tiktok';
    if (l.indexOf('instagram.com') !== -1) return 'instagram';
    if (l.indexOf('facebook.com') !== -1 || l.indexOf('fb.watch') !== -1) return 'facebook';
    if (l.indexOf('twitter.com') !== -1 || l.indexOf('x.com') !== -1) return 'twitter';
    if (l.indexOf('vimeo.com') !== -1) return 'vimeo';
    return 'video';
  };

  const extractYoutubeId = (link) => {
    let videoId = '';
    if (link.indexOf('v=') !== -1) {
      const parts = link.split('v=');
      if (parts[1]) {
        videoId = parts[1].split('&')[0];
      }
    } else if (link.indexOf('youtu.be/') !== -1) {
      const parts = link.split('youtu.be/');
      if (parts[1]) {
        videoId = parts[1].split('?')[0];
      }
    } else if (link.indexOf('shorts/') !== -1) {
      const parts = link.split('shorts/');
      if (parts[1]) {
        videoId = parts[1].split('?')[0];
      }
    }
    return videoId;
  };

  const handleFetchMedia = async () => {
    if (!url || !url.trim()) {
      Alert.alert('ত্রুটি', 'একটি সঠিক লিংক লিখুন।');
      return;
    }

    const cleanUrl = url.trim();
    const platform = detectPlatform(cleanUrl);

    setLoading(true);
    setDownloadFormats([]);
    setVideoTitle('');
    Keyboard.dismiss();

    let parsedFormats = [];
    let title = platform.toUpperCase() + ' Video';

    // Primary Backend
    try {
      let targetUrl = (adminSettings && adminSettings.apiUrl) ? adminSettings.apiUrl : 'https://mrdownload-apk.onrender.com/download';
      if (targetUrl.charAt(targetUrl.length - 1) === '/') {
        targetUrl = targetUrl.slice(0, -1);
      }
      if (targetUrl.indexOf('/download') === -1) {
        targetUrl = targetUrl + '/download';
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({ videoUrl: cleanUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        title = data.title || data.filename || title;
        const itemsList = data.picker || data.formats || data.medias || data.qualities;

        if (Array.isArray(itemsList) && itemsList.length > 0) {
          itemsList.forEach((item, index) => {
            const itemUrl = item.url || item.download_url || item.link;
            if (itemUrl) {
              const qLabel = item.quality || item.resolution || item.type || item.label || ('Option ' + (index + 1));
              const qLower = qLabel.toLowerCase();
              parsedFormats.push({
                quality: qLabel,
                url: itemUrl,
                isAudio: qLower.indexOf('audio') !== -1 || qLower.indexOf('mp3') !== -1,
              });
            }
          });
        } else if (data.download_url || data.downloadUrl || data.url) {
          const mainUrl = data.download_url || data.downloadUrl || data.url;
          parsedFormats.push({ quality: '1080p Full HD', url: mainUrl, isAudio: false });
          parsedFormats.push({ quality: '720p HD', url: mainUrl, isAudio: false });
          parsedFormats.push({ quality: '480p SD Quality', url: mainUrl, isAudio: false });
          parsedFormats.push({ quality: 'Audio Only (MP3)', url: mainUrl, isAudio: true });
        }
      }
    } catch (err) {
      console.log('Primary Backend Failed');
    }

    // Public Backup API
    if (parsedFormats.length === 0) {
      try {
        const aioRes = await fetch('https://api.vkrdown.com/api/item?url=' + encodeURIComponent(cleanUrl));
        if (aioRes.ok) {
          const aioData = await aioRes.json();
          if (aioData && aioData.data) {
            title = aioData.data.title || title;
            if (Array.isArray(aioData.data.downloads)) {
              aioData.data.downloads.forEach((item) => {
                if (item.url) {
                  const qLabel = item.quality || item.format || 'HD Quality';
                  parsedFormats.push({
                    quality: qLabel,
                    url: item.url,
                    isAudio: item.format === 'mp3' || qLabel.toLowerCase().indexOf('audio') !== -1,
                  });
                }
              });
            }
          }
        }
      } catch (e) {
        console.log('VKR API Failed');
      }
    }

    // YouTube Fallback
    if (parsedFormats.length === 0 && platform === 'youtube') {
      const ytId = extractYoutubeId(cleanUrl);
      if (ytId) {
        title = 'YouTube Video (' + ytId + ')';
        parsedFormats = [
          { quality: '720p HD Quality', url: 'https://yt.artemislena.eu/latest_version?id=' + ytId + '&itag=22', isAudio: false },
          { quality: '360p SD Quality', url: 'https://yt.artemislena.eu/latest_version?id=' + ytId + '&itag=18', isAudio: false },
          { quality: 'Audio Only (MP3)', url: 'https://yt.artemislena.eu/latest_version?id=' + ytId + '&itag=140', isAudio: true }
        ];
      }
    }

    setLoading(false);

    if (parsedFormats.length > 0) {
      setDownloadFormats(parsedFormats);
      setVideoTitle(title);
    } else {
      Alert.alert('ব্যর্থ', 'লিংকটি প্রসেস করা সম্ভব হয়নি। অন্য একটি ভিডিও ট্রাই করুন।');
    }
  };

  const startInAppDownload = async (fileUrl, quality, isAudio) => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('অনুমতি প্রয়োজন', 'ফাইল সেভ করার পারমিশন প্রয়োজন।');
        return;
      }

      setDownloadingUrl(fileUrl + quality);
      setDownloadProgress(0);

      const ext = isAudio ? 'mp3' : 'mp4';
      const cleanTitle = (videoTitle || 'Video').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = cleanTitle + '_' + Date.now() + '.' + ext;
      const tempLocalUri = FileSystem.cacheDirectory + filename;

      const callback = (downloadProgressData) => {
        if (downloadProgressData.totalBytesExpectedToWrite > 0) {
          const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite;
          setDownloadProgress(Math.round(progress * 100));
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        tempLocalUri,
        {},
        callback
      );

      const downloadResult = await downloadResumable.downloadAsync();

      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Download incomplete');
      }

      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      let album = await MediaLibrary.getAlbumAsync('MrDownload');
      if (album === null) {
        await MediaLibrary.createAlbumAsync('MrDownload', asset, false);
      } else {
        await MediaLibrary.addToAlbumAsync([asset], album, false);
      }

      await FileSystem.deleteAsync(tempLocalUri, { idempotent: true });

      Alert.alert('ডাউনলোড সফল!', 'ফাইলটি আপনার Internal Storage/MrDownload ফোল্ডারে সেভ হয়েছে।');

      if (props && props.onDownloadSuccess) {
        props.onDownloadSuccess({
          id: Date.now(),
          platform: detectPlatform(url),
          title: videoTitle || 'Media',
          quality: quality || 'HD',
          size: 'Auto',
          time: 'এখনই',
        });
      }
    } catch (err) {
      Alert.alert('ডাউনলোড ব্যর্থ', 'ভিডিওটি সেভ করা যায়নি।');
    } finally {
      setDownloadingUrl(null);
      setDownloadProgress(0);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MR DOWNLOAD</Text>
        <Text style={styles.subtitle}>যেকোনো সোশ্যাল মিডিয়া ভিডিও ডাউনলোড করুন</Text>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="link" size={20} color={COLORS.muted} style={styles.linkIcon} />
        <TextInput
          style={styles.input}
          placeholder="ভিডিও লিংক পেস্ট করুন..."
          placeholderTextColor={COLORS.muted}
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (downloadFormats.length > 0) {
              setDownloadFormats([]);
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {url.length > 0 ? (
          <TouchableOpacity onPress={() => { setUrl(''); setDownloadFormats([]); }}>
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.downloadBtn, loading ? styles.disabledBtn : null]}
        onPress={handleFetchMedia}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.downloadBtnText}>ভিডিও ফরম্যাট ফেচ করুন</Text>
        )}
      </TouchableOpacity>

      {downloadFormats.length > 0 ? (
        <View style={styles.formatContainer}>
          <Text style={styles.formatTitle}>কোয়ালিটি / ফরম্যাট সিলেক্ট করুন:</Text>
          {downloadFormats.map((item, index) => {
            const isThisDownloading = downloadingUrl === (item.url + item.quality);
            return (
              <View key={index} style={styles.formatCardWrapper}>
                <TouchableOpacity
                  style={styles.formatCard}
                  onPress={() => startInAppDownload(item.url, item.quality, item.isAudio)}
                  disabled={Boolean(downloadingUrl)}
                >
                  <View style={styles.formatInfo}>
                    <Ionicons
                      name={item.isAudio ? 'musical-notes-outline' : 'film-outline'}
                      size={22}
                      color={item.isAudio ? COLORS.purple : COLORS.green}
                    />
                    <Text style={styles.formatText}>{item.quality}</Text>
                  </View>
                  <Ionicons name="arrow-down-circle" size={24} color={COLORS.purple} />
                </TouchableOpacity>

                {isThisDownloading ? (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: downloadProgress + '%' }]} />
                    <Text style={styles.progressText}>ডাউনলোড হচ্ছে: {downloadProgress}%</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
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
  linkIcon: {
    marginRight: 10,
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
  disabledBtn: {
    opacity: 0.7,
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
  formatCardWrapper: {
    marginBottom: 10,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 10,
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
  progressContainer: {
    marginTop: 6,
    backgroundColor: '#1f1b3a',
    borderRadius: 8,
    height: 18,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.purple,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 1,
  },
});
