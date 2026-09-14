// ============================================================
// FILE: App.js (পুরনো App.js টা এটা দিয়ে REPLACE করো)
// GitHub এ Mr.Download-main/App.js
// ============================================================
import React, { useState, useCallback } from 'react';
import { View, StatusBar, Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DownloadScreen from './DownloadScreen';
import HistoryScreen from './HistoryScreen';
import PlatformsScreen from './PlatformsScreen';
import SettingsScreen from './SettingsScreen';
import { SettingsProvider, useSettings } from './context/SettingsContext';

const COLORS = {
  bg: '#0a0818',         
  bgMid: '#0d0b20',
  bgDark: '#05040c',         
  purple: '#7c3aed',
  text: '#ffffff',         
  border: '#1e1b4b',
  muted: '#6b7280',         
};

const Tab = createBottomTabNavigator();
const INITIAL_HISTORY = [
  { id: 1, platform: 'youtube', title: 'YouTube Video HD', quality: '1080p FHD', size: '142MB', time: '2 min ago' },
  { id: 2, platform: 'tiktok', title: 'Viral TikTok Video', quality: '720p HD', size: '18MB', time: '5 min ago' },
  { id: 3, platform: 'instagram', title: 'Instagram Reel', quality: 'MP3 Audio', size: '4MB', time: '10 min ago' },
];

function AnnouncementBanner() {
  const { adminSettings } = useSettings();
  if (!adminSettings.showAnnouncement || !adminSettings.announcement) return null;
  return (
    <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ color: '#fbbf24', fontSize: 12, textAlign: 'center' }}> 📢 {adminSettings.announcement} </Text>
    </View>
  );
}

// ── Maintenance Mode Screen ────────────────────────────────
function MaintenanceScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🔧</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>সংযোজন/রক্ষণাবেক্ষণ চলছে</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}> অ্যাপটি এই মুহূর্তে রক্ষণাবেক্ষণে আছে।{'\n'} অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন। </Text>
    </View>
  );
}

// ── Inner App (Context এর ভেতরে) ──────────────────────────
function InnerApp() {
  const { adminSettings } = useSettings();
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const addHistory = useCallback((item) => { setHistory((h) => [item, ...h]); }, []);
  const removeHistory = useCallback((id) => { setHistory((h) => h.filter((i) => i.id !== id)); }, []);
  const clearHistory = useCallback(() => { setHistory([]); }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <LinearGradient colors={[COLORS.bg, COLORS.bgMid, COLORS.bgDark]} locations={[0, 0.5, 1]} style={{ flex: 1 }} >
        {/* Announcement Banner (সবার উপরে) */}
        <AnnouncementBanner />
        <NavigationContainer theme={{ dark: true, colors: { primary: COLORS.purple, background: 'transparent', card: 'rgba(10,8,24,0.98)', text: COLORS.text, border: COLORS.border, notification: COLORS.purple, } }} >
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: 'rgba(10,8,24,0.98)',
                borderTopColor: COLORS.border,
                borderTopWidth: 1,
                paddingBottom: Platform.OS === 'android' ? 6 : 0,
                height: Platform.OS === 'android' ? 60 : 80,
              },
              tabBarActiveTintColor: COLORS.purple,
              tabBarInactiveTintColor: COLORS.muted,
              tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
              tabBarIcon: ({ focused, color, size }) => {
                const icons = {
                  Download: focused ? 'cloud-download' : 'cloud-download-outline',
                  History: focused ? 'time' : 'time-outline',
                  Platforms: focused ? 'grid' : 'grid-outline',
                  Settings: focused ? 'settings' : 'settings-outline',
                };
                return <Ionicons name={icons[route.name]} size={size} color={color} />;
              },
            })}
          >
            {/* ── Download Tab ── */}
            <Tab.Screen name="Download" options={{ tabBarLabel: 'Download' }}>
              {() => (
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                  {adminSettings.maintenanceMode ? <MaintenanceScreen /> : <DownloadScreen onAddHistory={addHistory} />}
                </SafeAreaView>
              )}
            </Tab.Screen>

            {/* ── History Tab ── */}
            <Tab.Screen name="History" options={{ tabBarLabel: 'History' }}>
              {() => (
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                  <HistoryScreen history={history} onRemove={removeHistory} onClear={clearHistory} />
                </SafeAreaView>
              )}
            </Tab.Screen>

            {/* ── Platforms Tab ── */}
            <Tab.Screen name="Platforms" options={{ tabBarLabel: 'Platforms' }}>
              {() => (
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                  <PlatformsScreen />
                </SafeAreaView>
              )}
            </Tab.Screen>

            {/* ── Settings Tab ── */}
            <Tab.Screen name="Settings" options={{ tabBarLabel: 'Settings' }}>
              {() => (
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                  <SettingsScreen />
                </SafeAreaView>
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </LinearGradient>
    </>
  );
}

// ── Root App (SettingsProvider দিয়ে wrap) ─────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <InnerApp />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
