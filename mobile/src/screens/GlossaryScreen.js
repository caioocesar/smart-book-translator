import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, FAB } from 'react-native-paper';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { t } from '../utils/i18n';

const API_URL = global.API_URL || 'http://localhost:5000';

export default function GlossaryScreen({ settings }) {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTerm, setEditingTerm] = useState(null);
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [category, setCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/glossary`);
      setTerms(response.data);
    } catch (err) {
      console.error('Error loading terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sourceTerm || !targetTerm) {
      Alert.alert('Error', 'Please fill in both source and target terms');
      return;
    }

    try {
      if (editingTerm) {
        await axios.put(`${API_URL}/api/glossary/${editingTerm.id}`, {
          source_term: sourceTerm,
          target_term: targetTerm,
          category: category || null
        });
      } else {
        await axios.post(`${API_URL}/api/glossary`, {
          source_term: sourceTerm,
          target_term: targetTerm,
          category: category || null,
          source_language: 'en', // Default, should be configurable
          target_language: 'es'  // Default, should be configurable
        });
      }
      
      setSourceTerm('');
      setTargetTerm('');
      setCategory('');
      setEditingTerm(null);
      setShowAddForm(false);
      loadTerms();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save term');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Term',
      'Are you sure you want to delete this term?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/glossary/${id}`);
              loadTerms();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete term');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (term) => {
    setEditingTerm(term);
    setSourceTerm(term.source_term);
    setTargetTerm(term.target_term);
    setCategory(term.category || '');
    setShowAddForm(true);
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        // Read file and send to backend
        const formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          type: 'text/csv',
          name: result.assets[0].name,
        } as any);

        await axios.post(`${API_URL}/api/glossary/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        Alert.alert('Success', 'CSV imported successfully');
        loadTerms();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to import CSV');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {showAddForm && (
            <Card style={styles.card}>
              <Card.Title title={editingTerm ? t('edit') : t('addTerm')} />
              <Card.Content>
                <TextInput
                  style={styles.input}
                  placeholder={t('sourceTerm')}
                  value={sourceTerm}
                  onChangeText={setSourceTerm}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('targetTerm')}
                  value={targetTerm}
                  onChangeText={setTargetTerm}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('category')}
                  value={category}
                  onChangeText={setCategory}
                />
                <View style={styles.formActions}>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    style={styles.button}
                  >
                    {t('save')}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setShowAddForm(false);
                      setEditingTerm(null);
                      setSourceTerm('');
                      setTargetTerm('');
                      setCategory('');
                    }}
                    style={styles.button}
                  >
                    {t('cancel')}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.card}>
            <Card.Title title={t('glossaryManagement')} />
            <Card.Content>
              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  onPress={handleImportCSV}
                  style={styles.actionButton}
                >
                  📥 {t('importCSV')}
                </Button>
                <Button
                  mode="outlined"
                  onPress={async () => {
                    try {
                      const response = await axios.get(`${API_URL}/api/glossary/export`, {
                        responseType: 'blob',
                      });
                      // Handle file download/sharing
                      Alert.alert('Success', 'CSV exported');
                    } catch (err) {
                      Alert.alert('Error', 'Failed to export CSV');
                    }
                  }}
                  style={styles.actionButton}
                >
                  📤 {t('exportCSV')}
                </Button>
              </View>
            </Card.Content>
          </Card>

          {terms.map((term) => (
            <Card key={term.id} style={styles.card}>
              <Card.Content>
                <View style={styles.termRow}>
                  <View style={styles.termContent}>
                    <Text style={styles.termSource}>{term.source_term}</Text>
                    <Text style={styles.termTarget}>→ {term.target_term}</Text>
                    {term.category && (
                      <Text style={styles.termCategory}>{term.category}</Text>
                    )}
                  </View>
                  <View style={styles.termActions}>
                    <Button
                      mode="text"
                      onPress={() => handleEdit(term)}
                      textColor="#667eea"
                    >
                      {t('edit')}
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => handleDelete(term.id)}
                      textColor="#f44336"
                    >
                      {t('delete')}
                    </Button>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddForm(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  termContent: {
    flex: 1,
  },
  termSource: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  termTarget: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  termCategory: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  termActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#667eea',
  },
});

