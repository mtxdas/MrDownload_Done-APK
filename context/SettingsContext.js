
// ============================================================
//  FILE: context/SettingsContext.js
//  GitHub এ   Mr.Download-main/context/  ফোল্ডার বানিয়ে রাখো
// ============================================================

import React, { createContext, useContext, useState } from 'react';

// ──────────────────────────────────────────
//  🔐 ADMIN CREDENTIALS  (শুধু Admin জানবে)
// ──────────────────────────────────────────
export const ADMIN_CREDENTIALS = {
  username : 'mtxdas',
  email    : 'mtxdas@gmail.com',
  phone    : '01612909085',
  password : 'MithunDas420',
};

// ──────────────────────────────────────────
//  Context তৈরি
// ──────────────────────────────────────────
const SettingsContext = createContext();

export function SettingsProvider({ children }) {

  // ── USER SETTINGS ──────────────────────
  const [userSettings, setUserSettings] = useState({
    defaultQuality   : '720p HD',     // Default download quality
    wifiOnly         : false,         // শুধু WiFi তে ডাউনলোড
    notifications    : true,          // Download notification
    failedAlert      : true,          // Failed download alert
    autoDetectLink   : true,          // Clipboard থেকে auto-paste
    historyLimit     : 100,           // Max history items
    autoClearHistory : 'never',       // 'never' | 'weekly' | 'monthly'
    showFileSize     : true,          // History তে file size দেখাবে
    language         : 'bn',          // 'bn' = বাংলা | 'en' = English
    theme            : 'dark',        // 'dark' | 'light'
    accentColor      : '#7c3aed',     // Highlight color
  });

  // ── ADMIN SETTINGS ─────────────────────
  const [adminSettings, setAdminSettings] = useState({
    maintenanceMode    : false,       // ON হলে ইউজার ডাউনলোড করতে পারবে না
    maxDownloadsPerDay : 50,          // দৈনিক ডাউনলোড সীমা
    announcement       : '',          // ইউজারদের জন্য নোটিশ
    showAnnouncement   : false,       // নোটিশ দেখাবে কিনা
    apiUrl             : 'https://api.mrdownload.com/v1',
    apiTimeout         : 30,          // seconds
    allowedQualities   : ['1080p FHD', '720p HD', '480p SD', 'MP3 Audio'],

    // প্রতিটি platform enable/disable
    platforms: {
      youtube   : true,
      tiktok    : true,
      instagram : true,
      facebook  : true,
      twitter   : true,
      vimeo     : true,
      xhamster  : true,
      xnxx      : true,
    },
  });

  // ── STATS (Download Statistics) ────────
  const [stats, setStats] = useState({
    totalDownloads : 3,   // Demo data
    todayDownloads : 1,
    weekDownloads  : 3,
    topPlatform    : 'YouTube',
  });

  // ── ADMIN LOGIN STATE ──────────────────
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // ── HELPER FUNCTIONS ───────────────────
  const updateUserSetting = (key, value) => {
    setUserSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAdminSetting = (key, value) => {
    setAdminSettings(prev => ({ ...prev, [key]: value }));
  };

  const togglePlatform = (platformId) => {
    setAdminSettings(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platformId]: !prev.platforms[platformId],
      },
    }));
  };

  const incrementStats = (platform) => {
    setStats(prev => ({
      ...prev,
      totalDownloads : prev.totalDownloads + 1,
      todayDownloads : prev.todayDownloads + 1,
      weekDownloads  : prev.weekDownloads  + 1,
      topPlatform    : platform || prev.topPlatform,
    }));
  };

  const adminLogin  = () => setIsAdminLoggedIn(true);
  const adminLogout = () => setIsAdminLoggedIn(false);

  const resetAllUserData = () => {
    setStats({ totalDownloads: 0, todayDownloads: 0, weekDownloads: 0, topPlatform: '-' });
  };

  return (
    <SettingsContext.Provider value={{
      // User
      userSettings,
      updateUserSetting,
      // Admin
      adminSettings,
      updateAdminSetting,
      togglePlatform,
      // Stats
      stats,
      incrementStats,
      resetAllUserData,
      // Auth
      isAdminLoggedIn,
      adminLogin,
      adminLogout,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
