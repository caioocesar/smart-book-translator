import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

// Screens
import TranslationScreen from './src/screens/TranslationScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import GlossaryScreen from './src/screens/GlossaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Utils
import { t, getCurrentLanguage } from './src/utils/i18n';

// API Configuration - adjust this to your backend URL
const API_URL = __DEV__ 
  ? 'http://localhost:5000'  // Development - adjust IP for physical device
  : 'https://your-backend-url.com';  // Production

// Make API_URL available globally
global.API_URL = API_URL;

const Tab = createBottomTabNavigator();

export default function App() {
  const [settings, setSettings] = useState({});
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    // Test backend connection
    checkBackendConnection();
    loadSettings();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
      setApiStatus({ status: 'online', data: response.data });
    } catch (error) {
      console.error('Backend connection error:', error);
      setApiStatus({ status: 'offline', error: error.message });
    }
  };

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Translation') {
                  iconName = 'translate';
                } else if (route.name === 'History') {
                  iconName = 'history';
                } else if (route.name === 'Glossary') {
                  iconName = 'book';
                } else if (route.name === 'Settings') {
                  iconName = 'settings';
                }

                return <Icon name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#667eea',
              tabBarInactiveTintColor: 'gray',
              headerStyle: {
                backgroundColor: '#667eea',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            })}
          >
            <Tab.Screen 
              name="Translation" 
              options={{ title: t('tabTranslation') }}
            >
              {props => <TranslationScreen {...props} settings={settings} />}
            </Tab.Screen>
            <Tab.Screen 
              name="History" 
              options={{ title: t('tabHistory') }}
            >
              {props => <HistoryScreen {...props} settings={settings} />}
            </Tab.Screen>
            <Tab.Screen 
              name="Glossary" 
              options={{ title: t('tabGlossary') }}
            >
              {props => <GlossaryScreen {...props} settings={settings} />}
            </Tab.Screen>
            <Tab.Screen 
              name="Settings" 
              options={{ title: t('tabSettings') }}
            >
              {props => <SettingsScreen {...props} settings={settings} onSettingsUpdate={setSettings} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

