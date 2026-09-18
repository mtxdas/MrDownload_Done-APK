import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const COLORS = {
  bg: '#0a0818',
  card: '#151228',
  border: '#1e1b4b',
  purple: '#7c3aed',
  text: '#ffffff',
  muted: '#6b7280',
  green: '#10b981',
  red: '#ef4444',
  gold: '#f59e0b',
};

export default function HistoryScreen({ history, onRemove, onClear, onRename, onPlay }) {
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);
  const [newTitleText, setNewTitleText] = useState('');

  // অডিও প্লেব্যাক স্টেট
  const [sound, setSound] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  // ব্যাকগ্রাউন্ডে অডিও প্লে করার জন্য অডিও সেশন কনফিগার করা
  useEffect(() => {
    const setupAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log('Audio mode setup error:', e);
      }
    };
    setupAudioMode();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <Ionicons name="logo-youtube" size={22} color="#ff0000" />;
      case 'tiktok':
        return <Ionicons name="musical-notes" size={22} color="#ffffff" />;
      case 'instagram':
        return <Ionicons name="logo-instagram" size={22} color="#e1306c" />;
      case 'facebook':
        return <Ionicons name="logo-facebook" size={22} color="#1877f2" />;
      case 'twitter':
        return <Ionicons name="logo-twitter" size={22} color="#1da1f2" />;
      case 'vimeo':
        return <Ionicons name="videocam" size={22} color="#1ab7ea" />;
      default:
        return <Ionicons name="film-outline" size={22} color="#8b5cf6" />;
    }
  };

  // অডিও প্লে বা পজ করার ফাংশন (ব্যাকগ্রাউন্ড সাপোর্টসহ)
  const handleTogglePlayAudio = async (item) => {
    try {
      if (playingId === item.id && sound) {
        // যদি ইতিমধ্যে এটাই প্লে হতে থাকে, তবে স্টপ বা পজ হবে
        const status = await sound.getStatusAsync();
        if (status.isPlaying) {
          await sound.pauseAsync();
          setPlayingId(null);
        } else {
          await sound.playAsync();
          setPlayingId(item.id);
        }
        return;
      }

      // অন্য কোনো গান চললে তা বন্ধ করে দেওয়া
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // যদি আইটেমের কোনো ফাইল বা অডিও ইউআরএল থাকে
      if (item.url || item.fileUri) {
        const audioUri = item.fileUri || item.url;
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setPlayingId(item.id);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        });
      } else {
        if (onPlay) {
          onPlay(item);
        } else {
          Alert.alert('Play', `Playing: ${item.title}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not play audio file in background.');
    }
  };

  const handleOpenRename = (item) => {
    setCurrentEditingItem(item);
    setNewTitleText(item.title || '');
    setRenameModalVisible(true);
  };

  const handleSaveRename = () => {
    if (!newTitleText.trim()) {
      Alert.alert('Error', 'File name cannot be empty.');
      return;
    }
    if (onRename && currentEditingItem) {
      onRename(currentEditingItem.id, newTitleText.trim());
    }
    setRenameModalVisible(false);
    setCurrentEditingItem(null);
  };

  const renderItem = ({ item }) => {
    const isThisPlaying = playingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.iconBox}>
            {getPlatformIcon(item.platform)}
          </View>
          
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta}>{item.quality} • {item.size || 'Auto'} • {item.time || 'Recently'}</Text>
          </View>

          <View style={styles.statusBox}>
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.doneText}>DONE</Text>
            </View>
          </View>
        </View>

        {/* অ্যাকশন বাটনসমূহ: Play, Rename, Delete */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => handleTogglePlayAudio(item)}
          >
            <Ionicons name={isThisPlaying ? 'pause' : 'play'} size={14} color={COLORS.green} />
            <Text style={[styles.actionText, { color: COLORS.green }]}>
              {isThisPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => handleOpenRename(item)}
          >
            <Ionicons name="create-outline" size={14} color={COLORS.gold} />
            <Text style={[styles.actionText, { color: COLORS.gold }]}>Rename</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => {
              if (playingId === item.id && sound) {
                sound.unloadAsync();
                setSound(null);
                setPlayingId(null);
              }
              onRemove(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.red} />
            <Text style={[styles.actionText, { color: COLORS.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="document-text" size={18} color={COLORS.muted} />
          <Text style={styles.headerText}>{history.length} টি ফাইল</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Text style={styles.clearText}>সব মুছুন</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={history}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>কোনো হিস্ট্রি নেই</Text>
        }
      />

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename File</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitleText}
              onChangeText={setNewTitleText}
              placeholder="Enter new file name"
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.border }]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.purple }]}
                onPress={handleSaveRename}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    color: COLORS.muted,
    fontSize: 14,
    marginLeft: 6,
  },
  clearBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 11,
  },
  statusBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  doneBadge: {
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  doneText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
