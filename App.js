import React, { useState, useCallback } from 'react';
import { View, StatusBar, Text } from 'react-native';
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

// ৮টি প্ল্যাটফর্মের নমুনা হিস্ট্রি ডেটা
const INITIAL_HISTORY = [
  { id: 1, platform: 'youtube', title: 'YouTube Video HD', quality: '1080p', size: '25MB', time: '10 mins ago' },
  { id: 2, platform: 'tiktok', title: 'Viral TikTok Video', quality: '720p', size: '8MB', time: '1 hour ago' },
  { id: 3, platform: 'instagram', title: 'Instagram Reel', quality: 'MP4', size: '12MB', time: '2 hours ago' },
  { id: 4, platform: 'facebook', title: 'Facebook Video', quality: '720p', size: '18MB', time: '3 hours ago' },
  { id: 5, platform: 'twitter', title: 'Twitter/X Clip', quality: 'HD', size: '5MB', time: '5 hours ago' },
  { id: 6, platform: 'vimeo', title: 'Vimeo Creative Video', quality: '1080p', size: '45MB', time: '1 day ago' },
  { id: 7, platform: 'xhamster', title: 'xHamster Video', quality: '720p', size: '30MB', time: '2 days ago' },
  { id: 8, platform: 'xnxx', title: 'XNXX Video Clip', quality: 'HD', size: '22MB', time: '3 days ago' },
];

function AnnouncementBanner() {
  const { adminSettings } = useSettings();
  if (!adminSettings?.showAnnouncement || !adminSettings?.announcementText) return null;

  return (
    <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)', paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: '#fbbf24', fontSize: 12, textAlign: 'center' }}>
        📢 {adminSettings.announcementText}
      </Text>
    </View>
  );
}

function MaintenanceScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 20 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🛠️</Text>
      <Text style={{ fontSize: 20, color: COLORS.text, fontWeight: '800' }}>অ্যাপ রক্ষণাবেক্ষণ চলছে</Text>
      <Text style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 8 }}>
        আমাদের সিস্টেম আপডেট করা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।
      </Text>
    </View>
  );
}

function InnerApp() {
  const { adminSettings } = useSettings();
  const [history, setHistory] = useState(INITIAL_HISTORY);

  const addHistory = useCallback((item) => {
    setHistory((h) => [item, ...h]);
  }, []);

  const removeHistory = useCallback((id) => {
    setHistory((h) => h.filter((i) => i.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  if (adminSettings?.isMaintenance) {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <LinearGradient colors={[COLORS.bg, COLORS.bgMid, COLORS.bgDark]} style={{ flex: 1 }}>
        <AnnouncementBanner />
        <NavigationContainer theme={{ dark: true, colors: { primary: COLORS.purple, background: 'transparent' } }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: 'rgba(10, 8, 24, 0.95)',
                borderTopColor: COLORS.border,
                borderTopWidth: 1,
                paddingBottom: 5,
                height: 60,
              },
              tabBarActiveTintColor: COLORS.purple,
              tabBarInactiveTintColor: COLORS.muted,
              tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Download') iconName = focused ? 'cloud-download' : 'cloud-download-outline';
                else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
                else if (route.name === 'Platforms') iconName = focused ? 'grid' : 'grid-outline';
                else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Download">
              {() => <DownloadScreen onDownloadSuccess={addHistory} />}
            </Tab.Screen>

            <Tab.Screen name="History">
              {() => (
                <HistoryScreen
                  history={history}
                  onRemove={removeHistory}
                  onClear={clearHistory}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Platforms" component={PlatformsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </LinearGradient>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <InnerApp />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
