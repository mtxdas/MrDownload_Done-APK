import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';

export default function DownloadScreen() {
  const [activeTheme, setActiveTheme] = useState('Emerald');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* App Title */}
      <Text style={styles.appTitle}>MR DOWNLOAD</Text>
      <Text style={styles.subtitle}>Social Media Video Downloader</Text>

      {/* Theme Selector Buttons (Ocean, Emerald, Dark) */}
      <View style={styles.themeContainer}>
        <TouchableOpacity 
          style={activeTheme === 'Ocean' ? styles.themeButtonActive : styles.themeButton}
          onPress={() => setActiveTheme('Ocean')}
        >
          <Text style={activeTheme === 'Ocean' ? styles.themeTextActive : styles.themeText}>Ocean</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={activeTheme === 'Emerald' ? styles.themeButtonActive : styles.themeButton}
          onPress={() => setActiveTheme('Emerald')}
        >
          <Text style={activeTheme === 'Emerald' ? styles.themeTextActive : styles.themeText}>Emerald</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={activeTheme === 'Dark' ? styles.themeButtonActive : styles.themeButton}
          onPress={() => setActiveTheme('Dark')}
        >
          <Text style={activeTheme === 'Dark' ? styles.themeTextActive : styles.themeText}>Dark</Text>
        </TouchableOpacity>
      </View>

      {/* Upgrade to Premium Button */}
      <TouchableOpacity style={styles.premiumButton}>
        <Text style={styles.premiumText}>✨ Upgrade to Premium</Text>
      </TouchableOpacity>

      {/* Secret Private Folder Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Secret Private Folder</Text>
        <Text style={styles.cardSub}>📁 Your locked files are secure here.</Text>
        <TouchableOpacity style={styles.lockButton}>
          <Text style={styles.lockButtonText}>Lock Folder</Text>
        </TouchableOpacity>
      </View>

      {/* URL Input Box */}
      <TextInput 
        placeholder="🔗 Paste video link here..." 
        placeholderTextColor="#888" 
        style={styles.input} 
      />

      {/* Fetch Format Links Button */}
      <TouchableOpacity style={styles.fetchButton}>
        <Text style={styles.fetchButtonText}>Fetch Format Links</Text>
      </TouchableOpacity>

      {/* Ad Banner */}
      <View style={styles.adBanner}>
        <Text style={styles.adText}>📢 Ad: Upgrade to Premium for an ad-free experience!</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: '#0b0f19', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 40 
  },
  appTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#00bfff', 
    letterSpacing: 1 
  },
  subtitle: { 
    fontSize: 12, 
    color: '#888', 
    marginBottom: 15 
  },
  themeContainer: { 
    flexDirection: 'row', 
    marginBottom: 15 
  },
  themeButton: { 
    borderWidth: 1, 
    borderColor: '#333', 
    paddingVertical: 6, 
    paddingHorizontal: 15, 
    borderRadius: 20, 
    marginHorizontal: 5 
  },
  themeButtonActive: { 
    backgroundColor: '#10b981', 
    paddingVertical: 6, 
    paddingHorizontal: 15, 
    borderRadius: 20, 
    marginHorizontal: 5 
  },
  themeText: { 
    color: '#aaa' 
  },
  themeTextActive: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  premiumButton: { 
    backgroundColor: '#0284c7', 
    paddingVertical: 10, 
    paddingHorizontal: 25, 
    borderRadius: 20, 
    marginBottom: 20 
  },
  premiumText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  card: { 
    backgroundColor: '#111827', 
    width: '100%', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#1f2937', 
    marginBottom: 20, 
    alignItems: 'center' 
  },
  cardTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
  cardSub: { 
    color: '#34d399', 
    fontSize: 12, 
    marginBottom: 15 
  },
  lockButton: { 
    backgroundColor: '#ef4444', 
    paddingVertical: 8, 
    paddingHorizontal: 20, 
    borderRadius: 8 
  },
  lockButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  input: { 
    width: '100%', 
    backgroundColor: '#111827', 
    borderWidth: 1, 
    borderColor: '#1f2937', 
    padding: 12, 
    borderRadius: 10, 
    color: '#fff', 
    marginBottom: 15 
  },
  fetchButton: { 
    width: '100%', 
    backgroundColor: '#0284c7', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  fetchButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  adBanner: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#1f2937', 
    padding: 10, 
    borderRadius: 10, 
    alignItems: 'center', 
    backgroundColor: '#111827' 
  },
  adText: { 
    color: '#93c5fd', 
    fontSize: 12 
  }
});
