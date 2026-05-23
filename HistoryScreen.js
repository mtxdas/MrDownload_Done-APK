import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#0a0818',
  card: '#151228',
  border: '#1e1b4b',
  text: '#ffffff',
  muted: '#6b7280',
  green: '#10b981',
  red: '#ef4444',
};

export default function HistoryScreen({ history, onRemove, onClear }) {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        {item.platform === 'youtube' && <Ionicons name="logo-youtube" size={24} color="#ff0000" />}
        {item.platform === 'tiktok' && <Ionicons name="musical-notes" size={24} color="#fff" />}
        {item.platform === 'instagram' && <Ionicons name="logo-instagram" size={24} color="#e1306c" />}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.quality} • {item.size} • {item.time}</Text>
      </View>

      <View style={styles.statusBox}>
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.doneText}>DONE</Text>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.id)}>
          <Ionicons name="close" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="document-text" size={18} color={COLORS.muted} />
          <Text style={styles.headerText}>{history.length} টি</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Text style={styles.clearText}>সব</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>কোনো হিস্ট্রি নেই</Text>
        }
      />

      {/* Watermark - একদম মাঝখানে */}
      <Image 
        source={require('../assets/watermark.png')} 
        style={styles.watermark}
        resizeMode="contain"
      />
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  statusBox: {
    alignItems: 'flex-end',
  },
  doneBadge: {
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  doneText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -100 }],
    width: 200,
    height: 200,
    opacity: 0.1,
    zIndex: -1,
  },
});
