import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import { t } from '../utils/i18n';

export default function DocumentInfoBox({ documentInfo, recommendations, onSelectRecommendation }) {
  if (!documentInfo) {
    return null;
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  return (
    <Card style={styles.card}>
      <Card.Title title={`📄 ${t('documentInfo')}`} />
      <Card.Content>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('fileSize')}:</Text>
            <Text style={styles.infoValue}>{formatFileSize(documentInfo.fileSize)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('characterCount')}:</Text>
            <Text style={styles.infoValue}>{formatNumber(documentInfo.characterCount)}</Text>
          </View>
          
          {documentInfo.wordCount && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('wordCount')}:</Text>
              <Text style={styles.infoValue}>{formatNumber(documentInfo.wordCount)}</Text>
            </View>
          )}
          
          {documentInfo.pages && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('pages')}:</Text>
              <Text style={styles.infoValue}>{formatNumber(documentInfo.pages)}</Text>
            </View>
          )}
          
          {documentInfo.estimatedChunks && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('estimatedChunks')}:</Text>
              <Text style={styles.infoValue}>{formatNumber(documentInfo.estimatedChunks)}</Text>
            </View>
          )}
        </View>

        {recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>💡 {t('recommendedModels')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommendations.slice(0, 5).map((rec, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.recommendationCard,
                    index === 0 && styles.recommendedCard
                  ]}
                  onPress={() => onSelectRecommendation && onSelectRecommendation(rec)}
                >
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationModel}>{rec.model}</Text>
                    {index === 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>⭐ {t('bestChoice')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.recommendationReason}>{rec.reason}</Text>
                  <View style={styles.recommendationSpecs}>
                    <Text style={styles.specText}>
                      {t('chunkSize')}: {rec.recommendedChunkSize.toLocaleString()}
                    </Text>
                    {rec.cost !== undefined && (
                      <Text style={styles.specText}>
                        {t('estimatedCost')}: ${rec.cost.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  {rec.supportsGlossary && (
                    <Text style={styles.feature}>✓ {t('supportsGlossary')}</Text>
                  )}
                  {rec.supportsHtml && (
                    <Text style={styles.feature}>✓ {t('preservesFormatting')}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: '#667eea',
    elevation: 4,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  infoValue: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  recommendationsContainer: {
    marginTop: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  recommendationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 250,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recommendedCard: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationModel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  badge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#333',
    fontSize: 10,
    fontWeight: '600',
  },
  recommendationReason: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  recommendationSpecs: {
    marginTop: 8,
  },
  specText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  feature: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 4,
  },
});

