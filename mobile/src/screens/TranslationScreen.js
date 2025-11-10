import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Button, Card, SegmentedButtons, Portal, Modal } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import { io } from 'socket.io-client';
import { t } from '../utils/i18n';
import DocumentInfoBox from '../components/DocumentInfoBox';

const API_URL = global.API_URL || 'http://localhost:5000';

export default function TranslationScreen({ settings }) {
  const [file, setFile] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [apiProvider, setApiProvider] = useState('deepl');
  const [outputFormat, setOutputFormat] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [currentJob, setCurrentJob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [analyzingDocument, setAnalyzingDocument] = useState(false);
  const [chunkSize, setChunkSize] = useState(settings.chunkSize || 3000);
  const [openaiModel, setOpenaiModel] = useState(settings.openai_model || 'gpt-3.5-turbo');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' }
  ];

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to backend via WebSocket');
    });

    newSocket.on('chunk-progress', (data) => {
      if (data.jobId === currentJob) {
        setProgress(data);
      }
    });

    newSocket.on('job-complete', (data) => {
      if (data.jobId === currentJob) {
        setProgress({ ...progress, completed: data.totalChunks, total: data.totalChunks });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentJob]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/epub+zip'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        setFile(selectedFile);
        
        // Auto-detect output format
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!outputFormat) {
          setOutputFormat(ext);
        }
        
        // Analyze document
        await analyzeDocument(selectedFile);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const analyzeDocument = async (selectedFile) => {
    setAnalyzingDocument(true);
    setDocumentInfo(null);
    setRecommendations(null);
    
    try {
      // Read file as base64 for upload
      const fileUri = selectedFile.uri;
      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create FormData equivalent for React Native
      const formData = new FormData();
      formData.append('document', {
        uri: fileUri,
        type: selectedFile.mimeType || 'application/octet-stream',
        name: selectedFile.name,
      } as any);

      const response = await axios.post(`${API_URL}/api/document/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setDocumentInfo(response.data);
      setRecommendations(response.data.recommendations);
    } catch (err) {
      console.error('Failed to analyze document:', err);
      // Don't show error - analysis is optional
    } finally {
      setAnalyzingDocument(false);
    }
  };

  const handleSelectRecommendation = (rec) => {
    setApiProvider(rec.provider);
    if (rec.recommendedChunkSize) {
      setChunkSize(rec.recommendedChunkSize);
    }
    if (rec.provider === 'openai' || rec.provider === 'chatgpt') {
      const modelMap = {
        'gpt-5': 'gpt-5',
        'gpt-4o': 'gpt-4o',
        'gpt-4-turbo': 'gpt-4-turbo',
        'gpt-4': 'gpt-4',
        'gpt-3.5-turbo': 'gpt-3.5-turbo'
      };
      const modelId = modelMap[rec.plan] || rec.plan;
      setOpenaiModel(modelId);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    
    if (apiProvider !== 'google' && !apiKey) {
      Alert.alert('Error', 'Please enter API key');
      return;
    }

    setError('');
    
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name,
      } as any);
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguage', targetLanguage);
      formData.append('apiProvider', apiProvider);
      formData.append('outputFormat', outputFormat);
      formData.append('apiKey', apiKey);
      formData.append('chunkSize', chunkSize.toString());

      const response = await axios.post(`${API_URL}/api/translation/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const jobId = response.data.jobId;
      setCurrentJob(jobId);
      
      // Start translation
      const apiOptions = { ...(settings[`${apiProvider}_options`] || {}) };
      if ((apiProvider === 'openai' || apiProvider === 'chatgpt') && openaiModel) {
        apiOptions.model = openaiModel;
      }
      
      await axios.post(`${API_URL}/api/translation/translate/${jobId}`, {
        apiKey,
        apiOptions
      });

      // Start polling for progress
      pollProgress(jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      Alert.alert('Error', err.response?.data?.error || 'Upload failed');
    }
  };

  const pollProgress = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/translation/status/${jobId}`);
        setProgress(response.data.progress);
        
        if (response.data.job.status === 'completed' || response.data.job.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling progress:', err);
        clearInterval(interval);
      }
    }, 2000);
  };

  const testApiConnection = async () => {
    if (apiProvider === 'google' || apiProvider === 'google-translate') {
      setTestingConnection(true);
      try {
        const response = await axios.post(`${API_URL}/api/settings/test-api`, {
          provider: 'google',
          apiKey: ''
        });
        setConnectionTestResult({
          success: true,
          message: '✓ Google Translate is available',
        });
      } catch (err) {
        setConnectionTestResult({
          success: false,
          message: `✗ ${err.response?.data?.error || err.message}`
        });
      } finally {
        setTestingConnection(false);
      }
      return;
    }

    if (!apiKey) {
      setConnectionTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const apiOptions = { ...(settings[`${apiProvider}_options`] || {}) };
      if (apiProvider === 'openai' || apiProvider === 'chatgpt') {
        apiOptions.model = openaiModel || settings.openai_model || 'gpt-3.5-turbo';
      }
      
      const response = await axios.post(`${API_URL}/api/settings/test-api`, {
        provider: apiProvider,
        apiKey,
        options: apiOptions
      });

      setConnectionTestResult({
        success: true,
        message: '✓ Connection successful!',
      });
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: `✗ ${err.response?.data?.error || err.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title={t('uploadDocument')} />
          <Card.Content>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickDocument}
            >
              <Text style={styles.uploadButtonText}>
                {file ? `✓ ${file.name}` : `📁 ${t('dragDropHint')}`}
              </Text>
              {file && (
                <Text style={styles.fileSize}>
                  {(file.size / 1024).toFixed(2)} KB
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.helpText}>{t('supportedFormats')}</Text>
          </Card.Content>
        </Card>

        {analyzingDocument && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.analyzingText}>🔍 {t('analyzingDocument')}</Text>
          </View>
        )}

        {documentInfo && (
          <DocumentInfoBox 
            documentInfo={documentInfo}
            recommendations={recommendations}
            onSelectRecommendation={handleSelectRecommendation}
          />
        )}

        <Card style={styles.card}>
          <Card.Title title={t('translationAPI')} />
          <Card.Content>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('sourceLanguage')}</Text>
              <SegmentedButtons
                value={sourceLanguage}
                onValueChange={setSourceLanguage}
                buttons={languages.slice(0, 5).map(lang => ({
                  value: lang.code,
                  label: lang.name
                }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('targetLanguage')}</Text>
              <SegmentedButtons
                value={targetLanguage}
                onValueChange={setTargetLanguage}
                buttons={languages.slice(0, 5).map(lang => ({
                  value: lang.code,
                  label: lang.name
                }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('translationAPI')}</Text>
              <SegmentedButtons
                value={apiProvider}
                onValueChange={setApiProvider}
                buttons={[
                  { value: 'google', label: t('providerGoogle') },
                  { value: 'deepl', label: t('providerDeepL') },
                  { value: 'openai', label: t('providerOpenAI') },
                  { value: 'chatgpt', label: t('providerChatGPT') },
                ]}
              />
            </View>

            {(apiProvider === 'openai' || apiProvider === 'chatgpt') && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('openaiModel')}</Text>
                <SegmentedButtons
                  value={openaiModel}
                  onValueChange={setOpenaiModel}
                  buttons={[
                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5' },
                    { value: 'gpt-4o', label: 'GPT-4o' },
                    { value: 'gpt-5', label: 'GPT-5' },
                  ]}
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('chunkSizeCharacters')}</Text>
              <TextInput
                style={styles.input}
                value={chunkSize.toString()}
                onChangeText={(text) => setChunkSize(parseInt(text) || 3000)}
                keyboardType="numeric"
                placeholder="3000"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('apiKey')} {apiProvider === 'google' && <Text style={styles.freeBadge}>({t('noApiKey')})</Text>}
              </Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder={t('apiKeyPlaceholder')}
                secureTextEntry
                editable={apiProvider !== 'google'}
              />
              <Button
                mode="outlined"
                onPress={testApiConnection}
                disabled={testingConnection}
                style={styles.testButton}
              >
                {testingConnection ? t('testing') : t('testConnection')}
              </Button>
              {connectionTestResult && (
                <Text style={[
                  styles.testResult,
                  connectionTestResult.success ? styles.success : styles.error
                ]}>
                  {connectionTestResult.message}
                </Text>
              )}
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {progress && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Progress: {progress.completed || 0} / {progress.total || 0} chunks
                </Text>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${((progress.completed || 0) / (progress.total || 1)) * 100}%` }
                  ]} />
                </View>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleUpload}
              disabled={!file || (apiProvider !== 'google' && !apiKey)}
              style={styles.uploadButton}
            >
              🚀 {t('startTranslation')}
            </Button>
          </Card.Content>
        </Card>
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
  uploadButton: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fileSize: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 16,
  },
  analyzingText: {
    marginLeft: 8,
    color: '#667eea',
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
  testButton: {
    marginTop: 8,
  },
  testResult: {
    marginTop: 8,
    fontSize: 12,
  },
  success: {
    color: '#4caf50',
  },
  error: {
    color: '#f44336',
  },
  freeBadge: {
    fontSize: 12,
    color: '#4caf50',
  },
  errorText: {
    color: '#f44336',
    marginTop: 8,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
});

