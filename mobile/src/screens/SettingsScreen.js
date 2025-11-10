import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Card, Button, Switch, SegmentedButtons } from 'react-native-paper';
import axios from 'axios';
import { t, getCurrentLanguage, setCurrentLanguage, getAvailableLanguages } from '../utils/i18n';

const API_URL = global.API_URL || 'http://localhost:5000';

export default function SettingsScreen({ settings, onSettingsUpdate }) {
  const [localSettings, setLocalSettings] = useState({
    deepl_api_key: '',
    openai_api_key: '',
    openai_model: 'gpt-3.5-turbo',
    outputDirectory: '',
    chunkSize: 3000,
    autoRetryFailed: true,
    autoResumePending: true,
    ...settings
  });
  const [saving, setSaving] = useState(false);
  const [currentLanguage, setLanguage] = useState(getCurrentLanguage());

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...localSettings, ...settings });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(localSettings)) {
        if (value !== undefined && value !== null) {
          await axios.post(`${API_URL}/api/settings`, { key, value });
        }
      }
      
      if (onSettingsUpdate) {
        onSettingsUpdate(localSettings);
      }
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    await setCurrentLanguage(lang);
    setLanguage(lang);
    // Force re-render by updating a dummy state
    setLocalSettings({ ...localSettings });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title={t('generalSettings')} />
          <Card.Content>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('uiLanguage')}</Text>
              <SegmentedButtons
                value={currentLanguage}
                onValueChange={handleLanguageChange}
                buttons={getAvailableLanguages().map(lang => ({
                  value: lang.code,
                  label: lang.name
                }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('chunkSizeCharacters')}</Text>
              <TextInput
                style={styles.input}
                value={localSettings.chunkSize?.toString() || '3000'}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  chunkSize: parseInt(text) || 3000
                })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('autoRetryFailed') || 'Auto-retry Failed Chunks'}</Text>
              <Switch
                value={localSettings.autoRetryFailed !== false}
                onValueChange={(value) => setLocalSettings({
                  ...localSettings,
                  autoRetryFailed: value
                })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('autoResumePending') || 'Auto-resume Pending Jobs'}</Text>
              <Switch
                value={localSettings.autoResumePending !== false}
                onValueChange={(value) => setLocalSettings({
                  ...localSettings,
                  autoResumePending: value
                })}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title={t('deeplApiConfiguration')} />
          <Card.Content>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('deeplApiKey')}</Text>
              <TextInput
                style={styles.input}
                value={localSettings.deepl_api_key || ''}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  deepl_api_key: text
                })}
                placeholder={t('enterDeeplApiKey')}
                secureTextEntry
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title={t('openaiApiConfiguration')} />
          <Card.Content>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('openaiApiKey')}</Text>
              <TextInput
                style={styles.input}
                value={localSettings.openai_api_key || ''}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  openai_api_key: text
                })}
                placeholder={t('enterOpenaiApiKey')}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('openaiModel')}</Text>
              <SegmentedButtons
                value={localSettings.openai_model || 'gpt-3.5-turbo'}
                onValueChange={(value) => setLocalSettings({
                  ...localSettings,
                  openai_model: value
                })}
                buttons={[
                  { value: 'gpt-3.5-turbo', label: 'GPT-3.5' },
                  { value: 'gpt-4o', label: 'GPT-4o' },
                  { value: 'gpt-5', label: 'GPT-5' },
                ]}
              />
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? t('saving') : t('saveSettings')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: '#667eea',
  },
});

