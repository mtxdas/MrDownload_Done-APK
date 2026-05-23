// ============================================================
//  FILE: AdminPanel.js
//  GitHub এ   Mr.Download-main/  ফোল্ডারে রাখো
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PLATFORMS } from './constants';
import { useSettings, ADMIN_CREDENTIALS } from './context/SettingsContext';

// ── Helper Components ───────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function AdminRow({ icon, iconColor = '#7c3aed', label, sublabel, right }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

function ToggleRow({ icon, iconColor, label, sublabel, value, onToggle }) {
  return (
    <AdminRow
      icon={icon}
      iconColor={iconColor}
      label={label}
      sublabel={sublabel}
      right={
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#333', true: iconColor + '88' }}
          thumbColor={value ? iconColor : '#666'}
        />
      }
    />
  );
}

// ── Main AdminPanel ─────────────────────────────────────────

export default function AdminPanel({ onBack, onLogout }) {
  const {
    adminSettings, updateAdminSetting,
    togglePlatform, stats, resetAllUserData,
  } = useSettings();

  // Announcement modal
  const [announcModal, setAnnouncModal] = useState(false);
  const [announcText, setAnnouncText]   = useState(adminSettings.announcement);

  // API settings modal
  const [apiModal, setApiModal]     = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(adminSettings.apiUrl);
  const [apiTimeout, setApiTimeout]   = useState(String(adminSettings.apiTimeout));

  // Max downloads modal
  const [maxModal, setMaxModal]       = useState(false);
  const [maxInput, setMaxInput]       = useState(String(adminSettings.maxDownloadsPerDay));

  // ── Handlers ──────────────────────────────────────────────

  const saveAnnouncement = () => {
    updateAdminSetting('announcement', announcText);
    setAnnouncModal(false);
    Alert.alert('✅ সফল', 'নোটিশ সেভ হয়েছে!');
  };

  const saveApiSettings = () => {
    updateAdminSetting('apiUrl', apiUrlInput.trim());
    updateAdminSetting('apiTimeout', parseInt(apiTimeout) || 30);
    setApiModal(false);
    Alert.alert('✅ সফল', 'API সেটিংস আপডেট হয়েছে!');
  };

  const saveMaxDownloads = () => {
    const val = parseInt(maxInput);
    if (!val || val < 1) {
      Alert.alert('ভুল', 'সঠিক সংখ্যা দিন');
      return;
    }
    updateAdminSetting('maxDownloadsPerDay', val);
    setMaxModal(false);
    Alert.alert('✅ সফল', `দৈনিক সীমা ${val} সেট হয়েছে`);
  };

  const handleResetData = () => {
    Alert.alert(
      '⚠️ সতর্কতা!',
      'সমস্ত User Data এবং Statistics মুছে যাবে। নিশ্চিত?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'হ্যাঁ, মুছুন', style: 'destructive',
          onPress: () => {
            resetAllUserData();
            Alert.alert('✅ সম্পন্ন', 'সব Data মুছে ফেলা হয়েছে!');
          },
        },
      ]
    );
  };

  const toggleQuality = (q) => {
    const current = [...adminSettings.allowedQualities];
    const idx     = current.indexOf(q);
    if (idx === -1) {
      updateAdminSetting('allowedQualities', [...current, q]);
    } else {
      if (current.length === 1) {
        Alert.alert('ভুল', 'অন্তত একটি quality রাখতে হবে');
        return;
      }
      updateAdminSetting('allowedQualities', current.filter(x => x !== q));
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Admin Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="shield-checkmark" size={30} color={COLORS.purple} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>@{ADMIN_CREDENTIALS.username}</Text>
          <Text style={styles.profileEmail}>{ADMIN_CREDENTIALS.email}</Text>
          <Text style={styles.profilePhone}>📞 {ADMIN_CREDENTIALS.phone}</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* ── STATISTICS ──────────────────────────── */}
      <SectionHeader title="📊  Statistics" />
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderColor: '#a855f7' + '44' }]}>
          <Text style={[styles.statNum, { color: '#a855f7' }]}>{stats.totalDownloads}</Text>
          <Text style={styles.statLabel}>মোট ডাউনলোড</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#22c55e' + '44' }]}>
          <Text style={[styles.statNum, { color: '#22c55e' }]}>{stats.todayDownloads}</Text>
          <Text style={styles.statLabel}>আজকে</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#3b82f6' + '44' }]}>
          <Text style={[styles.statNum, { color: '#3b82f6' }]}>{stats.weekDownloads}</Text>
          <Text style={styles.statLabel}>এই সপ্তাহ</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#f59e0b' + '44' }]}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]} numberOfLines={1}>{stats.topPlatform}</Text>
          <Text style={styles.statLabel}>Top Platform</Text>
        </View>
      </View>

      {/* ── APP CONTROL ─────────────────────────── */}
      <SectionHeader title="🔧  App Control" />
      <View style={styles.card}>
        <ToggleRow
          icon="construct"
          iconColor="#ef4444"
          label="Maintenance Mode"
          sublabel={adminSettings.maintenanceMode ? '🔴 চালু — ইউজার ডাউনলোড করতে পারবে না' : '🟢 বন্ধ — App স্বাভাবিক চলছে'}
          value={adminSettings.maintenanceMode}
          onToggle={v => {
            Alert.alert(
              v ? '⚠️ Maintenance চালু করবেন?' : '✅ Maintenance বন্ধ করবেন?',
              v ? 'ইউজাররা আর ডাউনলোড করতে পারবে না।' : 'App আবার স্বাভাবিক হবে।',
              [
                { text: 'বাতিল', style: 'cancel' },
                { text: 'হ্যাঁ', onPress: () => updateAdminSetting('maintenanceMode', v) },
              ]
            );
          }}
        />
        <View style={styles.divider} />
        <ToggleRow
          icon="megaphone"
          iconColor="#f59e0b"
          label="Announcement দেখাও"
          sublabel="ইউজারদের নোটিশ দেখাবে"
          value={adminSettings.showAnnouncement}
          onToggle={v => updateAdminSetting('showAnnouncement', v)}
        />
        <View style={styles.divider} />
        <TouchableOpacity onPress={() => { setAnnouncText(adminSettings.announcement); setAnnouncModal(true); }}>
          <AdminRow
            icon="create"
            iconColor="#3b82f6"
            label="Announcement লিখুন"
            sublabel={adminSettings.announcement ? adminSettings.announcement.slice(0, 35) + '...' : 'কোনো নোটিশ নেই'}
            right={<Ionicons name="chevron-forward" size={18} color={COLORS.muted} />}
          />
        </TouchableOpacity>
      </View>

      {/* ── USER CONTROL ────────────────────────── */}
      <SectionHeader title="👥  User Control" />
      <View style={styles.card}>
        <TouchableOpacity onPress={() => { setMaxInput(String(adminSettings.maxDownloadsPerDay)); setMaxModal(true); }}>
          <AdminRow
            icon="download"
            iconColor="#22c55e"
            label="দৈনিক ডাউনলোড সীমা"
            sublabel="ইউজার প্রতিদিন সর্বোচ্চ কতটি করতে পারবে"
            right={
              <View style={styles.valueBadge}>
                <Text style={styles.valueBadgeText}>{adminSettings.maxDownloadsPerDay}</Text>
              </View>
            }
          />
        </TouchableOpacity>
        <View style={styles.divider} />
        <AdminRow
          icon="star"
          iconColor="#a855f7"
          label="অনুমোদিত Quality"
          sublabel="কোন quality গুলো দেখাবে"
          right={null}
        />
        <View style={styles.qualityGrid}>
          {['1080p FHD', '720p HD', '480p SD', 'MP3 Audio'].map(q => {
            const active = adminSettings.allowedQualities.includes(q);
            return (
              <TouchableOpacity
                key={q}
                style={[styles.qualityChip, active && styles.qualityChipActive]}
                onPress={() => toggleQuality(q)}
              >
                <Text style={[styles.qualityChipText, active && styles.qualityChipTextActive]}>{q}</Text>
                {active && <Ionicons name="checkmark" size={12} color={COLORS.purple} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── PLATFORM MANAGEMENT ─────────────────── */}
      <SectionHeader title="🌐  Platform Management" />
      <View style={styles.card}>
        {PLATFORMS.map((p, idx) => (
          <React.Fragment key={p.id}>
            <ToggleRow
              icon={p.icon}
              iconColor={p.color}
              label={p.name}
              sublabel={adminSettings.platforms[p.id] ? 'সক্রিয় ✓' : 'নিষ্ক্রিয় ✗'}
              value={!!adminSettings.platforms[p.id]}
              onToggle={() => togglePlatform(p.id)}
            />
            {idx < PLATFORMS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── API SETTINGS ────────────────────────── */}
      <SectionHeader title="🔌  API Settings" />
      <View style={styles.card}>
        <TouchableOpacity onPress={() => { setApiUrlInput(adminSettings.apiUrl); setApiTimeout(String(adminSettings.apiTimeout)); setApiModal(true); }}>
          <AdminRow
            icon="link"
            iconColor="#1ab7ea"
            label="Download API URL"
            sublabel={adminSettings.apiUrl}
            right={<Ionicons name="chevron-forward" size={18} color={COLORS.muted} />}
          />
        </TouchableOpacity>
        <View style={styles.divider} />
        <AdminRow
          icon="timer"
          iconColor="#f59e0b"
          label="API Timeout"
          sublabel="সর্বোচ্চ অপেক্ষার সময়"
          right={<Text style={styles.valueTxt}>{adminSettings.apiTimeout}s</Text>}
        />
      </View>

      {/* ── DANGER ZONE ─────────────────────────── */}
      <SectionHeader title="⚠️  Danger Zone" />
      <View style={[styles.card, { borderColor: 'rgba(239,68,68,0.3)' }]}>
        <TouchableOpacity onPress={handleResetData}>
          <AdminRow
            icon="trash"
            iconColor="#ef4444"
            label="সব User Data মুছুন"
            sublabel="Statistics এবং সব ডেটা রিসেট হবে"
            right={<Ionicons name="chevron-forward" size={18} color="#ef4444" />}
          />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* ── ANNOUNCEMENT MODAL ──────────────────── */}
      <Modal transparent animationType="slide" visible={announcModal} onRequestClose={() => setAnnouncModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📢 Announcement লিখুন</Text>
            <Text style={styles.modalSub}>ইউজাররা Home screen এ এই নোটিশ দেখবে</Text>
            <TextInput
              style={styles.textArea}
              placeholder="নোটিশ লিখুন..."
              placeholderTextColor={COLORS.muted}
              value={announcText}
              onChangeText={setAnnouncText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAnnouncModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveAnnouncement}>
                <Text style={styles.saveBtnText}>সেভ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── API MODAL ──────────────────────────── */}
      <Modal transparent animationType="slide" visible={apiModal} onRequestClose={() => setApiModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔌 API Settings</Text>
            <Text style={styles.inputLabel}>API URL</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://api.mrdownload.com/v1"
              placeholderTextColor={COLORS.muted}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>Timeout (সেকেন্ড)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="30"
              placeholderTextColor={COLORS.muted}
              value={apiTimeout}
              onChangeText={setApiTimeout}
              keyboardType="numeric"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setApiModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveApiSettings}>
                <Text style={styles.saveBtnText}>সেভ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MAX DOWNLOADS MODAL ─────────────────── */}
      <Modal transparent animationType="slide" visible={maxModal} onRequestClose={() => setMaxModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📥 দৈনিক ডাউনলোড সীমা</Text>
            <Text style={styles.modalSub}>ইউজার প্রতিদিন সর্বোচ্চ কতটি ডাউনলোড করতে পারবে</Text>
            <Text style={styles.inputLabel}>সংখ্যা লিখুন</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="50"
              placeholderTextColor={COLORS.muted}
              value={maxInput}
              onChangeText={setMaxInput}
              keyboardType="numeric"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMaxModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveMaxDownloads}>
                <Text style={styles.saveBtnText}>সেভ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container    : { flex: 1, paddingHorizontal: 16 },

  // Top Bar
  topBar       : { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  backBtn      : { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 },
  logoutBtn    : { padding: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, marginLeft: 'auto' },
  topBarTitle  : { fontSize: 18, fontWeight: '800', color: COLORS.text, flex: 1 },

  // Profile
  profileCard  : { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', marginBottom: 8, gap: 12 },
  profileAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  profileInfo  : { flex: 1 },
  profileName  : { fontSize: 16, fontWeight: '800', color: COLORS.text },
  profileEmail : { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  profilePhone : { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  adminBadge   : { backgroundColor: 'rgba(124,58,237,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.5)' },
  adminBadgeText:{ fontSize: 11, color: '#c084fc', fontWeight: '800', letterSpacing: 1 },

  // Stats
  statsGrid    : { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard     : { flex: 1, minWidth: '44%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statNum      : { fontSize: 22, fontWeight: '800' },
  statLabel    : { fontSize: 11, color: COLORS.muted, textAlign: 'center' },

  // Section
  sectionHeader: { paddingVertical: 10, paddingHorizontal: 4, marginTop: 8 },
  sectionTitle : { fontSize: 12, color: COLORS.muted, letterSpacing: 1.2, fontWeight: '700' },

  // Card
  card         : { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 4 },
  divider      : { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },

  // Row
  row          : { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  rowIcon      : { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText      : { flex: 1 },
  rowLabel     : { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  rowSub       : { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  rowRight     : { flexShrink: 0 },

  // Quality chips
  qualityGrid     : { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  qualityChip     : { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  qualityChipActive:{ borderColor: COLORS.purple + '66', backgroundColor: 'rgba(124,58,237,0.12)' },
  qualityChipText : { fontSize: 12, color: COLORS.muted },
  qualityChipTextActive: { color: COLORS.purple, fontWeight: '700' },

  // Badges
  valueBadge    : { backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  valueBadgeText: { fontSize: 13, color: '#22c55e', fontWeight: '700' },
  valueTxt      : { fontSize: 13, color: COLORS.muted },

  // Modal
  overlay      : { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard    : { backgroundColor: '#130f24', borderRadius: 20, padding: 20, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle   : { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub     : { fontSize: 12, color: COLORS.muted, marginBottom: 16 },
  inputLabel   : { fontSize: 11, color: COLORS.muted, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  modalInput   : { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  textArea     : { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, minHeight: 100 },
  modalBtns    : { flexDirection: 'row', gap: 10 },
  cancelBtn    : { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  saveBtn      : { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center' },
  saveBtnText  : { color: '#fff', fontSize: 14, fontWeight: '700' },
});
