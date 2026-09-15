// ============================================================
//  FILE: SettingsScreen.js
//  GitHub এ   Mr.Download-main/  ফোল্ডারে রাখো
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';
import { useSettings, ADMIN_CREDENTIALS } from './context/SettingsContext';
import AdminPanel from './AdminPanel';

// ── Admin Default Credentials ───────────────────────────────
const ADMIN_DEFAULTS = {
  username: "mtxdas",
  email: "mtxdas@gmail.com",
  phone: "01602856525",
  password: "MithunDas9620",
};

// ── Backend Server Configuration ───────────────────────────
const BACKEND_CONFIG = {
  apiUrl: "https://mrdownload-api.onrender.com",
  developer: "MithunDas,11KHAN,JESSORE",
  version: "v1.0.0",
};

// ── ছোট helper components ──────────────────────────────────

function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingRow({ icon, iconColor = COLORS.purple, label, sublabel, right }) {
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
    <SettingRow
      icon={icon}
      iconColor={iconColor}
      label={label}
      sublabel={sublabel}
      right={
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#333', true: COLORS.purple + '88' }}
          thumbColor={value ? COLORS.purple : '#666'}
        />
      }
    />
  );
}

function SelectRow({ icon, iconColor, label, sublabel, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <SettingRow
          icon={icon}
          iconColor={iconColor}
          label={label}
          sublabel={sublabel}
          right={
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>{value}</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
            </View>
          }
        />
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionRow, opt === value && styles.optionRowActive]}
                onPress={() => { onChange(opt); setOpen(false); }}
              >
                <Text style={[styles.optionText, opt === value && styles.optionTextActive]}>{opt}</Text>
                {opt === value && <Ionicons name="checkmark-circle" size={18} color={COLORS.purple} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Main SettingsScreen ─────────────────────────────────────

export default function SettingsScreen() {
  const { userSettings, updateUserSetting, isAdminLoggedIn, adminLogin, adminLogout } = useSettings();

  // Admin login modal state
  const [loginModal, setLoginModal]       = useState(false);
  const [adminPanel, setAdminPanel]       = useState(false);
  const [loginInput, setLoginInput]       = useState('');
  const [passInput, setPassInput]         = useState('');
  const [showPass, setShowPass]           = useState(false);
  const [loginError, setLoginError]       = useState('');

  // ── Admin Login Handler ─────────────────────────────────
  const handleAdminLogin = () => {
    const adminCreds = ADMIN_CREDENTIALS || ADMIN_DEFAULTS;
    const usernameOk = loginInput.trim() === adminCreds.username ||
                       loginInput.trim() === adminCreds.email    ||
                       loginInput.trim() === adminCreds.phone;
    const passwordOk = passInput === adminCreds.password;

    if (usernameOk && passwordOk) {
      setLoginError('');
      setLoginModal(false);
      setLoginInput('');
      setPassInput('');
      adminLogin();
      setAdminPanel(true);
    } else {
      setLoginError('❌ ভুল Username অথবা Password!');
    }
  };

  const openAdminPanel = () => {
    if (isAdminLoggedIn) {
      setAdminPanel(true);
    } else {
      setLoginError('');
      setLoginModal(true);
    }
  };

  const handleAdminLogout = () => {
    Alert.alert('Logout', 'Admin Panel থেকে বের হবেন?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: () => {
          adminLogout();
          setAdminPanel(false);
        }
      },
    ]);
  };

  // ── Admin Panel খোলা থাকলে সেটা দেখাও ──────────────────
  if (adminPanel) {
    return <AdminPanel onBack={() => setAdminPanel(false)} onLogout={handleAdminLogout} />;
  }

  // ── User Settings UI ────────────────────────────────────
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="settings" size={28} color={COLORS.purple} />
        <Text style={styles.headerTitle}>সেটিংস</Text>
        <Text style={styles.headerSub}>আপনার পছন্দমতো কাস্টমাইজ করুন</Text>
      </View>

      {/* ── APPEARANCE ─────────────────────────── */}
      <SectionHeader title="🎨  চেহারা (Appearance)" />

      <View style={styles.card}>
        <SelectRow
          icon="color-palette"
          iconColor="#a855f7"
          label="থিম"
          sublabel="Dark / Light মোড"
          options={['dark', 'light']}
          value={userSettings.theme}
          onChange={v => updateUserSetting('theme', v)}
        />
        <View style={styles.divider} />
        <SelectRow
          icon="text"
          iconColor="#3b82f6"
          label="ফন্ট সাইজ"
          sublabel="টেক্সটের আকার"
          options={['Small', 'Medium', 'Large']}
          value={userSettings.fontSize || 'Medium'}
          onChange={v => updateUserSetting('fontSize', v)}
        />
      </View>

      {/* ── DOWNLOAD ───────────────────────────── */}
      <SectionHeader title="📥  ডাউনলোড সেটিংস" />

      <View style={styles.card}>
        <SelectRow
          icon="diamond"
          iconColor="#a855f7"
          label="ডিফল্ট কোয়ালিটি"
          sublabel="প্রতিবার জিজ্ঞেস না করে auto-select"
          options={['1080p FHD', '720p HD', '480p SD', 'MP3 Audio']}
          value={userSettings.defaultQuality}
          onChange={v => updateUserSetting('defaultQuality', v)}
        />
        <View style={styles.divider} />
        <ToggleRow
          icon="wifi"
          iconColor="#22c55e"
          label="শুধু WiFi তে ডাউনলোড"
          sublabel="Mobile data তে ডাউনলোড বন্ধ থাকবে"
          value={userSettings.wifiOnly}
          onToggle={v => updateUserSetting('wifiOnly', v)}
        />
        <View style={styles.divider} />
        <ToggleRow
          icon="clipboard"
          iconColor="#f59e0b"
          label="Auto-detect Link"
          sublabel="Clipboard থেকে লিংক auto-paste হবে"
          value={userSettings.autoDetectLink}
          onToggle={v => updateUserSetting('autoDetectLink', v)}
        />
      </View>

      {/* ── NOTIFICATIONS ──────────────────────── */}
      <SectionHeader title="🔔  নোটিফিকেশন" />

      <View style={styles.card}>
        <ToggleRow
          icon="notifications"
          iconColor="#3b82f6"
          label="ডাউনলোড সম্পন্ন নোটিফিকেশন"
          sublabel="ডাউনলোড শেষ হলে জানাবে"
          value={userSettings.notifications}
          onToggle={v => updateUserSetting('notifications', v)}
        />
        <View style={styles.divider} />
        <ToggleRow
          icon="alert-circle"
          iconColor="#ef4444"
          label="Failed Alert"
          sublabel="ডাউনলোড ব্যর্থ হলে alert দেবে"
          value={userSettings.failedAlert}
          onToggle={v => updateUserSetting('failedAlert', v)}
        />
      </View>

      {/* ── HISTORY ────────────────────────────── */}
      <SectionHeader title="📋  ইতিহাস সেটিংস" />

      <View style={styles.card}>
        <SelectRow
          icon="time"
          iconColor="#22c55e"
          label="ইতিহাস সীমা"
          sublabel="সর্বোচ্চ কতটি রাখা হবে"
          options={['50', '100', '200', 'Unlimited']}
          value={String(userSettings.historyLimit)}
          onChange={v => updateUserSetting('historyLimit', v === 'Unlimited' ? 999 : parseInt(v))}
        />
        <View style={styles.divider} />
        <SelectRow
          icon="trash"
          iconColor="#ef4444"
          label="Auto-clear ইতিহাস"
          sublabel="স্বয়ংক্রিয়ভাবে মুছে ফেলার সময়"
          options={['never', 'weekly', 'monthly']}
          value={userSettings.autoClearHistory}
          onChange={v => updateUserSetting('autoClearHistory', v)}
        />
        <View style={styles.divider} />
        <ToggleRow
          icon="information-circle"
          iconColor="#f59e0b"
          label="File Size দেখাও"
          sublabel="ইতিহাসে ফাইলের সাইজ দেখাবে"
          value={userSettings.showFileSize}
          onToggle={v => updateUserSetting('showFileSize', v)}
        />
      </View>

      {/* ── LANGUAGE ───────────────────────────── */}
      <SectionHeader title="🌐  ভাষা (Language)" />

      <View style={styles.card}>
        <SelectRow
          icon="globe"
          iconColor="#1ab7ea"
          label="অ্যাপের ভাষা"
          sublabel="বাংলা বা English"
          options={['বাংলা', 'English']}
          value={userSettings.language === 'bn' ? 'বাংলা' : 'English'}
          onChange={v => updateUserSetting('language', v === 'বাংলা' ? 'bn' : 'en')}
        />
      </View>

      {/* ── ABOUT ──────────────────────────────── */}
      <SectionHeader title="ℹ️  অ্যাপ সম্পর্কে" />

      <View style={styles.card}>
        <SettingRow
          icon="phone-portrait"
          iconColor="#a855f7"
          label="App Version"
          right={<Text style={styles.valueTxt}>{BACKEND_CONFIG.version}</Text>}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="person"
          iconColor="#22c55e"
          label="Developer"
          right={<Text style={styles.valueTxt}>{BACKEND_CONFIG.developer}</Text>}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="server"
          iconColor="#3b82f6"
          label="Backend Server"
          right={<Text style={[styles.valueTxt, { fontSize: 11 }]}>{BACKEND_CONFIG.apiUrl}</Text>}
        />
        <View style={styles.divider} />
        <TouchableOpacity
          onPress={() => Alert.alert('⭐ ধন্যবাদ!', 'App রেটিং দিয়ে মতামত দেওয়ার জন্য ধন্যবাদ!')}
        >
          <SettingRow
            icon="star"
            iconColor="#f59e0b"
            label="App রেট করুন"
            sublabel="Google Play রেটিং এর মাধ্যমে আপনার মতামত দিন"
            right={<Ionicons name="chevron-forward" size={18} color={COLORS.muted} />}
          />
        </TouchableOpacity>
      </View>

      {/* ── ADMIN PANEL BUTTON ─────────────────── */}
      <SectionHeader title="🔐  Admin" />

      <View style={styles.card}>
        {isAdminLoggedIn ? (
          <>
            <TouchableOpacity onPress={openAdminPanel}>
              <SettingRow
                icon="shield-checkmark"
                iconColor="#22c55e"
                label="Admin Panel খুলুন"
                sublabel="আপনি Logged in আছেন ✓"
                right={<Ionicons name="chevron-forward" size={18} color={COLORS.muted} />}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity onPress={handleAdminLogout}>
              <SettingRow
                icon="log-out"
                iconColor="#ef4444"
                label="Admin Logout"
                sublabel="Admin Panel থেকে বের হন"
                right={<Ionicons name="chevron-forward" size={18} color="#ef4444" />}
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={openAdminPanel}>
            <SettingRow
              icon="lock-closed"
              iconColor="#ef4444"
              label="Admin Panel"
              sublabel="Login করে Admin অ্যাক্সেস নিন"
              right={<Ionicons name="chevron-forward" size={18} color={COLORS.muted} />}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* ── ADMIN LOGIN MODAL ──────────────────── */}
      <Modal
        transparent
        animationType="slide"
        visible={loginModal}
        onRequestClose={() => setLoginModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.loginCard}>
            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setLoginModal(false)}>
              <Ionicons name="close" size={22} color={COLORS.muted} />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.lockIcon}>
              <Ionicons name="shield-checkmark" size={36} color={COLORS.purple} />
            </View>

            <Text style={styles.loginTitle}>Admin Login</Text>
            <Text style={styles.loginSub}>শুধুমাত্র Admin অ্যাক্সেস করতে পারবেন</Text>

            {/* Username / Email / Phone */}
            <Text style={styles.inputLabel}>Username / Email / Phone</Text>
            <TextInput
              style={styles.loginInput}
              placeholder={`${ADMIN_DEFAULTS.username} / ${ADMIN_DEFAULTS.email}`}
              placeholderTextColor={COLORS.muted}
              value={loginInput}
              onChangeText={setLoginInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.loginInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Admin Password"
                placeholderTextColor={COLORS.muted}
                value={passInput}
                onChangeText={setPassInput}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(p => !p)}
              >
                <Ionicons
                  name={showPass ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {loginError ? (
              <Text style={styles.errorText}>{loginError}</Text>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleAdminLogin}>
              <Ionicons name="log-in" size={18} color="#fff" />
              <Text style={styles.loginBtnText}>Login করুন</Text>
            </TouchableOpacity>

            {/* Hint */}
            <Text style={styles.hintText}>
              💡 Username, Email বা Phone যেকোনো একটি ব্যবহার করুন
            </Text>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container    : { flex: 1, paddingHorizontal: 16 },

  // Header
  header       : { alignItems: 'center', paddingVertical: 24, gap: 6 },
  headerTitle  : { fontSize: 24, fontWeight: '800', color: COLORS.text },
  headerSub    : { fontSize: 13, color: COLORS.muted, textAlign: 'center' },

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

  // Select Badge
  selectBadge     : { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(124,58,237,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  selectBadgeText : { fontSize: 12, color: '#a78bfa', fontWeight: '600' },
  valueTxt        : { fontSize: 13, color: COLORS.muted },

  // Modal / Overlay
  overlay      : { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard    : { backgroundColor: '#130f24', borderRadius: 20, padding: 16, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle   : { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  optionRow    : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionRowActive: { backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8, paddingHorizontal: 8 },
  optionText   : { fontSize: 15, color: COLORS.muted },
  optionTextActive: { color: COLORS.purple, fontWeight: '700' },

  // Login Card
  loginCard    : { backgroundColor: '#130f24', borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  closeBtn     : { alignSelf: 'flex-end', padding: 4 },
  lockIcon     : { alignSelf: 'center', width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  loginTitle   : { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  loginSub     : { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginBottom: 20 },
  inputLabel   : { fontSize: 11, color: COLORS.muted, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  loginInput   : { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  passRow      : { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eyeBtn       : { padding: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  errorText    : { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  loginBtn     : { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 14, marginTop: 4, marginBottom: 12 },
  loginBtnText : { color: '#fff', fontSize: 15, fontWeight: '700' },
  hintText     : { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 18 },
});
