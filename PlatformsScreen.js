import React from 'react';
import {
  View, Text, FlatList,
  StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PLATFORMS } from './constants';

export default function PlatformsScreen() {
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌐 সাপোর্টেড প্ল্যাটফর্ম</Text>
        <Text style={styles.headerSub}>{PLATFORMS.length}টি প্ল্যাটফর্ম সাপোর্টেড</Text>
      </View>

      {/* Platform Grid */}
      <FlatList
        data={PLATFORMS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: p }) => (
          <View style={[styles.card, { borderColor: p.color + '33', flex: 1 }]}>
            <View style={[styles.iconBox, { backgroundColor: p.color + '22' }]}>
              <Ionicons name={p.icon} size={28} color={p.color} />
            </View>
            <Text style={styles.platformName}>{p.name}</Text>
            <View style={styles.supportedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
              <Text style={styles.supportedText}>সাপোর্টেড</Text>
            </View>
          </View>
        )}
      />

      {/* Note */}
      <View style={styles.note}>
        <Text style={styles.noteText}>
          💡 MR DOWNLOAD — সব platform থেকে video ডাউনলোড করো। আরো platform যোগ হচ্ছে শীঘ্রই!
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, padding: 16 },
  header:         { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  headerSub:      { fontSize: 13, color: COLORS.muted },
  card:           { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, gap: 8 },
  iconBox:        { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  platformName:   { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  supportedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  supportedText:  { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  note:           { backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', marginTop: 8 },
  noteText:       { fontSize: 12, color: '#a78bfa', lineHeight: 20, textAlign: 'center' },
});
