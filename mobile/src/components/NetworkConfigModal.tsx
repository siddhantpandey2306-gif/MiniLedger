import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { PRESET_URLS } from '../config/apiConfig';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api.service';

interface NetworkConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NetworkConfigModal: React.FC<NetworkConfigModalProps> = ({ visible, onClose }) => {
  const { currentBaseUrl, updateBaseUrl } = useAuth();
  const [urlInput, setUrlInput] = useState<string>(currentBaseUrl);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSelectPreset = (url: string) => {
    setUrlInput(url);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Temporarily update base URL to test
      await updateBaseUrl(urlInput);
      const res = await ApiService.checkHealth();
      setTestResult({
        success: true,
        message: `Connected successfully! (${res.service || 'backend'} is ${res.status})`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Could not connect to server at this URL.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndClose = async () => {
    await updateBaseUrl(urlInput);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="wifi" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Backend Network Config</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Networking Explanation Note */}
            <View style={styles.noteBox}>
              <Ionicons name="information-circle" size={18} color={colors.primary} style={styles.noteIcon} />
              <Text style={styles.noteText}>
                Mobile devices cannot use <Text style={{ fontWeight: '700' }}>localhost</Text> because localhost refers to the phone itself.
                Select your setup below or enter your computer's Wi-Fi IP.
              </Text>
            </View>

            {/* Quick Presets */}
            <Text style={styles.sectionLabel}>Quick Presets</Text>
            {PRESET_URLS.map((preset, index) => {
              const isSelected = urlInput.trim() === preset.url.trim();
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  onPress={() => handleSelectPreset(preset.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetHeader}>
                    <Text style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}>
                      {preset.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.presetUrl}>{preset.url}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom URL Input */}
            <Text style={styles.sectionLabel}>Active API Base URL</Text>
            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={(text) => {
                setUrlInput(text);
                setTestResult(null);
              }}
              placeholder="http://192.168.x.x:5000/api"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {/* Test Connection Button */}
            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.disabledButton]}
              onPress={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="pulse" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.testButtonText}>Test Connection (/api/health)</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Test Feedback */}
            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.success ? styles.testSuccessBox : styles.testErrorBox,
                ]}
              >
                <Ionicons
                  name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={testResult.success ? colors.success : colors.overdue}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.testResultText,
                    testResult.success ? styles.testSuccessText : styles.testErrorText,
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndClose}>
              <Text style={styles.saveButtonText}>Save URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  noteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  presetCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  presetLabelSelected: {
    color: colors.primary,
  },
  presetUrl: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  presetDesc: {
    fontSize: 11,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  testSuccessBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  testErrorBox: {
    backgroundColor: colors.overdueLight,
    borderWidth: 1,
    borderColor: colors.overdueBorder,
  },
  testResultText: {
    fontSize: 12,
    flex: 1,
  },
  testSuccessText: {
    color: colors.success,
  },
  testErrorText: {
    color: colors.overdue,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
