import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import axios from 'axios';
import * as Sharing from 'expo-sharing';
import { t } from '../utils/i18n';

const API_URL = global.API_URL || 'http://localhost:5000';

export default function HistoryScreen({ settings }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/jobs`);
      setJobs(response.data);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownload = async (jobId) => {
    try {
      const url = `${API_URL}/api/translation/download/${jobId}`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url);
      } else {
        Alert.alert('Download', `File available at: ${url}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Download failed');
    }
  };

  const handleDelete = async (jobId) => {
    Alert.alert(
      'Delete Translation',
      'Are you sure you want to delete this translation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/translation/jobs/${jobId}`);
              loadJobs();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'failed': return '#f44336';
      case 'translating': return '#2196f3';
      case 'pending': return '#ff9800';
      default: return '#757575';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadJobs();
        }} />
      }
    >
      <View style={styles.content}>
        {jobs.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>{t('noHistory')}</Text>
              <Text style={styles.emptyHint}>{t('noHistoryHint')}</Text>
            </Card.Content>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} style={styles.card}>
              <Card.Title
                title={job.filename}
                subtitle={`${job.source_language} → ${job.target_language}`}
              />
              <Card.Content>
                <View style={styles.jobInfo}>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: getStatusColor(job.status) }]}
                    textStyle={styles.statusText}
                  >
                    {job.status}
                  </Chip>
                  <Text style={styles.progressText}>
                    {job.completed_chunks || 0} / {job.total_chunks} {t('chunks')}
                  </Text>
                </View>

                {job.output_path && (
                  <Button
                    mode="contained"
                    onPress={() => handleDownload(job.id)}
                    style={styles.button}
                  >
                    📥 {t('download')}
                  </Button>
                )}

                <View style={styles.actions}>
                  <Button
                    mode="outlined"
                    onPress={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                    style={styles.button}
                  >
                    {expandedJob === job.id ? t('hideDetails') : t('showDetails')}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleDelete(job.id)}
                    textColor="#f44336"
                    style={styles.button}
                  >
                    🗑️ {t('deleteJob')}
                  </Button>
                </View>

                {expandedJob === job.id && (
                  <View style={styles.details}>
                    <Text style={styles.detailText}>
                      {t('api')}: {job.api_provider}
                    </Text>
                    <Text style={styles.detailText}>
                      {t('format')}: {job.output_format}
                    </Text>
                    {job.error && (
                      <Text style={styles.errorText}>
                        {t('error')}: {job.error}
                      </Text>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
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
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statusChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
});

