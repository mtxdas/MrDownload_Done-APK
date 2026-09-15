import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#090514',
  card: '#130d24',
  border: '#1e1638',
  purple: '#8b5cf6',
  purpleDark: '#6d28d9',
  purpleLight: '#2a1a4a',
  text: '#ffffff',
  muted: '#9ca3af',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  pink: '#ec4899',
  orange: '#f97316',
};

// Admin Default Credentials
const ADMIN_CREDENTIALS = {
  username: 'mtxdas',
  email: 'mtxdas@gmail.com',
  phone: '01600055255',
  password: 'MithunDas420',
};

export default function SettingsScreen() {
  // Settings States
  const [wifiOnly, setWifiOnly] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [downloadSuccessNotif, setDownloadSuccessNotif] = useState(true);
  const [failedAlert, setFailedAlert] = useState(true);
  const [fileSizeShow, setFileSizeShow] = useState(true);

  // Admin Modal & View States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [secureText, setSecureText] = useState(true);

  // Admin Panel Control States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcementShow, setAnnouncementShow] = useState(false);
  const [ytStatus, setYtStatus] = useState(true);
  const [ttStatus, setTtStatus] = useState(false);
  const [igStatus, setIgStatus] = useState(true);
  const [fbStatus, setFbStatus] = useState(true);
  const [twStatus, setTwStatus] = useState(true);
  const [vmStatus, setVmStatus] = useState(true);
  const [xhStatus, setXhStatus] = useState(true);
  const [xnStatus, setXnStatus] = useState(true);

  const handleLogin = () => {
    const input = usernameInput.trim();
    const isUserValid =
      input === ADMIN_CREDENTIALS.username ||
      input === ADMIN_CREDENTIALS.email ||
      input === ADMIN_CREDENTIALS.phone;

    if (isUserValid && passwordInput === ADMIN_CREDENTIALS.password) {
      setIsAdminLoggedIn(true);
      setShowAdminModal(false);
      setUsernameInput('');
      setPasswordInput('');
    } else {
      Alert.alert('ত্রুটি', 'সঠিক Username/Email/Phone অথবা Password দিন।');
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
  };

  // If Admin is Logged In, Render Admin Panel Screen
  if (isAdminLoggedIn) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Admin Header */}
        <View style={styles.adminHeader}>
          <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.adminTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.adminProfileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.shieldIconBg}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.purple} />
            </View>
            <View>
              <Text style={styles.profileHandle}>@{ADMIN_CREDENTIALS.username}</Text>
              <Text style={styles.profileEmail}>{ADMIN_CREDENTIALS.email}</Text>
              <Text style={styles.profilePhone}>{ADMIN_CREDENTIALS.phone}</Text>
            </View>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* Statistics */}
        <Text style={styles.subSectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: COLORS.purple }]}>3</Text>
            <Text style={styles.statLabel}>মোট ডাউনলোড</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: COLORS.green }]}>1</Text>
            <Text style={styles.statLabel}>ব্যবহারকারী</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: COLORS.blue }]}>3</Text>
            <Text style={styles.statLabel}>এই মাসে</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: COLORS.yellow }]}>YouTube</Text>
            <Text style={styles.statLabel}>Top Platform</Text>
          </View>
        </View>

        {/* App Control */}
        <Text style={styles.subSectionTitle}>App Control</Text>
        <View style={styles.cardSection}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#450a0a' }]}>
                <Ionicons name="build" size={16} color={COLORS.red} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Maintenance Mode</Text>
                <Text style={styles.rowSubLabel}>বন্ধ ~ App সাময়িক বন্ধ থাকবে</Text>
              </View>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={setMaintenanceMode}
              trackColor={{ false: '#262626', true: COLORS.purple }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#78350f' }]}>
                <Ionicons name="megaphone" size={16} color={COLORS.yellow} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Announcement দেখাও</Text>
                <Text style={styles.rowSubLabel}>বিজ্ঞাপন বা নোটিশ দেখান</Text>
              </View>
            </View>
            <Switch
              value={announcementShow}
              onValueChange={setAnnouncementShow}
              trackColor={{ false: '#262626', true: COLORS.purple }}
            />
          </View>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#1e3a8a' }]}>
                <Ionicons name="create-outline" size={16} color={COLORS.blue} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Announcement লিখুন</Text>
                <Text style={styles.rowSubLabel}>এখানে নোটিশ লেখেন</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* User Control */}
        <Text style={styles.subSectionTitle}>User Control</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#064e3b' }]}>
                <Ionicons name="download" size={16} color={COLORS.green} />
              </View>
              <View>
                <Text style={styles.rowLabel}>দৈনিক ডাউনলোড সীমা</Text>
                <Text style={styles.rowSubLabel}>একজন ইউজার সর্বোচ্চ কতটা করতে পারবে</Text>
              </View>
            </View>
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>50</Text>
            </View>
          </TouchableOpacity>

          <View style={{ marginTop: 8 }}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#2e1065' }]}>
                <Ionicons name="star" size={16} color={COLORS.purple} />
              </View>
              <View>
                <Text style={styles.rowLabel}>অনুমোদিত Quality</Text>
                <Text style={styles.rowSubLabel}>কোন quality গুলো সচল থাকবে</Text>
              </View>
            </View>
            <View style={styles.pillsRow}>
              <View style={styles.pill}><Text style={styles.pillText}>1080p FHD  ✓</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>720p HD  ✓</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>480p SD  ✓</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>MP3 Audio  ✓</Text></View>
            </View>
          </View>
        </View>

        {/* Platform Management */}
        <Text style={styles.subSectionTitle}>Platform Management</Text>
        <View style={styles.cardSection}>
          <PlatformRow label="YouTube" active={ytStatus} toggle={setYtStatus} color={COLORS.red} icon="logo-youtube" />
          <PlatformRow label="TikTok" active={ttStatus} toggle={setTtStatus} color="#fff" icon="logo-tiktok" />
          <PlatformRow label="Instagram" active={igStatus} toggle={setIgStatus} color={COLORS.pink} icon="logo-instagram" />
          <PlatformRow label="Facebook" active={fbStatus} toggle={setFbStatus} color={COLORS.blue} icon="logo-facebook" />
          <PlatformRow label="Twitter/X" active={twStatus} toggle={setTwStatus} color="#38bdf8" icon="logo-twitter" />
          <PlatformRow label="Vimeo" active={vmStatus} toggle={setVmStatus} color="#06b6d4" icon="logo-vimeo" />
          <PlatformRow label="xHamster" active={xhStatus} toggle={setXhStatus} color={COLORS.orange} icon="play-circle" />
          <PlatformRow label="XNXX" active={xnStatus} toggle={setXnStatus} color={COLORS.yellow} icon="play-circle" />
        </View>

        {/* API Settings */}
        <Text style={styles.subSectionTitle}>API Settings</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#1e3a8a' }]}>
                <Ionicons name="link" size={16} color={COLORS.blue} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Download API URL</Text>
                <Text style={styles.rowSubLabel}>https://mrdownload-apk.onrender.com</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#78350f' }]}>
                <Ionicons name="time-outline" size={16} color={COLORS.yellow} />
              </View>
              <View>
                <Text style={styles.rowLabel}>API Timeout</Text>
                <Text style={styles.rowSubLabel}>সর্বোচ্চ অপেক্ষার সময়</Text>
              </View>
            </View>
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>30s</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.subSectionTitle, { color: COLORS.red }]}>⚠️ Danger Zone</Text>
        <View style={[styles.cardSection, { marginBottom: 40 }]}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#450a0a' }]}>
                <Ionicons name="trash" size={16} color={COLORS.red} />
              </View>
              <View>
                <Text style={styles.rowLabel}>সব User Data মুছুন</Text>
                <Text style={styles.rowSubLabel}>ইতিহাস ও সব তথ্য রিমুভ হয়ে যাবে</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.red} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Normal Settings Screen
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="settings-sharp" size={32} color={COLORS.purple} />
        <Text style={styles.headerTitle}>সেটিংস</Text>
        <Text style={styles.headerSubtitle}>আপনার পছন্দমতো কাস্টমাইজ করুন</Text>
      </View>

      {/* চেহারা (Appearance) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 চেহারা (Appearance)</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#2e1065' }]}>
              <Ionicons name="color-palette" size={16} color={COLORS.purple} />
            </View>
            <View>
              <Text style={styles.rowLabel}>থিম</Text>
              <Text style={styles.rowSubLabel}>Dark / Light মোড</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.valueText}>dark</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.purple} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#1e1b4b' }]}>
              <Text style={styles.fontIcon}>Aa</Text>
            </View>
            <View>
              <Text style={styles.rowLabel}>ফন্ট সাইজ</Text>
              <Text style={styles.rowSubLabel}>টেক্সটের আকার</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.valueText}>Medium</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.purple} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ডাউনলোড সেটিংস */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📥 ডাউনলোড সেটিংস</Text>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#2e1065' }]}>
              <Ionicons name="diamond-outline" size={16} color={COLORS.purple} />
            </View>
            <View>
              <Text style={styles.rowLabel}>ডিফল্ট কোয়ালিটি</Text>
              <Text style={styles.rowSubLabel}>প্রতিবার জিজ্ঞেস না করে auto-select</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.valueText}>720p HD</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.purple} />
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#064e3b' }]}>
              <Ionicons name="wifi" size={16} color={COLORS.green} />
            </View>
            <View>
              <Text style={styles.rowLabel}>শুধু WiFi তে ডাউনলোড</Text>
              <Text style={styles.rowSubLabel}>Mobile data তে ডাউনলোড বন্ধ থাকবে</Text>
            </View>
          </View>
          <Switch
            value={wifiOnly}
            onValueChange={setWifiOnly}
            trackColor={{ false: '#334155', true: COLORS.purple }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#78350f' }]}>
              <Ionicons name="flash-outline" size={16} color={COLORS.yellow} />
            </View>
            <View>
              <Text style={styles.rowLabel}>Auto-detect Link</Text>
              <Text style={styles.rowSubLabel}>Clipboard থেকে লিংক auto-paste হবে</Text>
            </View>
          </View>
          <Switch
            value={autoDetect}
            onValueChange={setAutoDetect}
            trackColor={{ false: '#334155', true: COLORS.purple }}
          />
        </View>
      </View>

      {/* নোটিফিকেশন */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 নোটিফিকেশন</Text>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#1e3a8a' }]}>
              <Ionicons name="notifications" size={16} color={COLORS.blue} />
            </View>
            <View>
              <Text style={styles.rowLabel}>ডাউনলোড সম্পন্ন নোটিফিকেশন</Text>
              <Text style={styles.rowSubLabel}>ডাউনলোড শেষ হলে জানা যাবে</Text>
            </View>
          </View>
          <Switch
            value={downloadSuccessNotif}
            onValueChange={setDownloadSuccessNotif}
            trackColor={{ false: '#334155', true: COLORS.purple }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#450a0a' }]}>
              <Ionicons name="alert-circle" size={16} color={COLORS.red} />
            </View>
            <View>
              <Text style={styles.rowLabel}>Failed Alert</Text>
              <Text style={styles.rowSubLabel}>ডাউনলোড ব্যর্থ হলে alert দেবে</Text>
            </View>
          </View>
          <Switch
            value={failedAlert}
            onValueChange={setFailedAlert}
            trackColor={{ false: '#334155', true: COLORS.purple }}
          />
        </View>
      </View>

      {/* ইতিহাস সেটিংস */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📜 ইতিহাস সেটিংস</Text>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#064e3b' }]}>
              <Ionicons name="time" size={16} color={COLORS.green} />
            </View>
            <View>
              <Text style={styles.rowLabel}>ইতিহাস সীমা</Text>
              <Text style={styles.rowSubLabel}>সর্বোচ্চ কতটা রাখা হবে</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.valueText}>100</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.purple} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#450a0a' }]}>
              <Ionicons name="trash-bin" size={16} color={COLORS.red} />
            </View>
            <View>
              <Text style={styles.rowLabel}>Auto-clear ইতিহাস</Text>
              <Text style={styles.rowSubLabel}>স্বয়ংক্রিয়ভাবে মুছে ফেলার সময়</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.valueText}>never</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.purple} />
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#78350f' }]}>
              <Ionicons name="information-circle" size={16} color={COLORS.yellow} />
            </View>
            <View>
              <Text style={styles.rowLabel}>File Size দেখাও</Text>
              <Text style={styles.rowSubLabel}>ইতিহাসে ফাইলের সাইজ দেখাবে</Text>
            </View>
          </View>
          <Switch
            value={fileSizeShow}
            onValueChange={setFileSizeShow}
            trackColor={{ false: '#334155', true: COLORS.purple }}
          />
        </View>
      </View>

      {/* ভাষা (Language) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 ভাষা (Language)</Text>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#1e3a8a' }]}>
              <Ionicons name="globe-outline" size={16} color={COLORS.blue} />
            </View>
            <View>
              <Text style={styles.rowLabel}>অ্যাপের ভাষা</Text>
              <Text style={styles.rowSubLabel}>বাংলা বা English</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.valueText}>বাংলা</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.purple} />
          </View>
        </TouchableOpacity>
      </View>

      {/* অ্যাপ সম্পর্কে */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ অ্যাপ সম্পর্কে</Text>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#2e1065' }]}>
              <Ionicons name="phone-portrait-outline" size={16} color={COLORS.purple} />
            </View>
            <Text style={styles.rowLabel}>App Version</Text>
          </View>
          <Text style={styles.mutedValue}>v1.0.0</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#064e3b' }]}>
              <Ionicons name="person-outline" size={16} color={COLORS.green} />
            </View>
            <Text style={styles.rowLabel}>Developer</Text>
          </View>
          <Text style={styles.mutedValue}>MithunDas,11KHAN,JESSORE</Text>
        </View>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#78350f' }]}>
              <Ionicons name="star" size={16} color={COLORS.yellow} />
            </View>
            <View>
              <Text style={styles.rowLabel}>App রেট করুন</Text>
              <Text style={styles.rowSubLabel}>Google Play স্টোর এ আমাদের আপনার মতামত দিন</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Admin Panel Trigger */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>🔐 Admin</Text>

        <TouchableOpacity style={styles.row} onPress={() => setShowAdminModal(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#450a0a' }]}>
              <Ionicons name="lock-closed" size={16} color={COLORS.red} />
            </View>
            <View>
              <Text style={styles.rowLabel}>Admin Panel</Text>
              <Text style={styles.rowSubLabel}>Login করে Admin অ্যাক্সেস নিন</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Admin Login Modal */}
      <Modal visible={showAdminModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAdminModal(false)}>
              <Ionicons name="close" size={20} color={COLORS.muted} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.modalShieldIcon}>
                <Ionicons name="shield-checkmark" size={28} color={COLORS.purple} />
              </View>
              <Text style={styles.modalTitle}>Admin Login</Text>
              <Text style={styles.modalSubtitle}>শুধুমাত্র Admin অ্যাক্সেস করতে পারবেন</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username / Email / Phone</Text>
              <TextInput
                style={styles.textInput}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Username, Email বা Phone দিন"
                placeholderTextColor="#6b7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.textInput, { flex: 1, borderWidth: 0 }]}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry={secureText}
                  placeholder="পাসওয়ার্ড দিন"
                  placeholderTextColor="#6b7280"
                />
                <TouchableOpacity onPress={() => setSecureText(!secureText)} style={{ paddingRight: 10 }}>
                  <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.loginBtnText}>Login করুন</Text>
            </TouchableOpacity>

            <Text style={styles.hintText}>💡 Username, Email বা Phone যেকোনো একটি ব্যবহার করুন</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Platform Row Component Helper
function PlatformRow({ label, active, toggle, color, icon }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={color} style={{ marginRight: 10, width: 20 }} />
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowSubLabel}>সক্রিয়</Text>
        </View>
      </View>
      <Switch
        value={active}
        onValueChange={toggle}
        trackColor={{ false: '#262626', true: COLORS.purple }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 6,
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fontIcon: {
    color: COLORS.purple,
    fontWeight: 'bold',
    fontSize: 13,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  valueText: {
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: '500',
  },
  mutedValue: {
    color: COLORS.muted,
    fontSize: 12,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#110b21',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#261947',
  },
  closeBtn: {
    alignSelf: 'flex-end',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalShieldIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2a1a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1b1333',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2d2054',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b1333',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d2054',
  },
  loginBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  hintText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
  },
  /* Admin View Styles */
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
  },
  adminTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backBtn: {
    padding: 4,
  },
  adminProfileCard: {
    backgroundColor: '#170f2e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d1f54',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2b1b4d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileHandle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: COLORS.muted,
    fontSize: 11,
  },
  profilePhone: {
    color: COLORS.muted,
    fontSize: 11,
  },
  adminBadge: {
    backgroundColor: '#3b0764',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  adminBadgeText: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: 'bold',
  },
  subSectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  cardSection: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeSmall: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeSmallText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    backgroundColor: '#2e1065',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    color: '#c084fc',
    fontSize: 11,
  },
});
