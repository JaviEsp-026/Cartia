import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Mic, MicOff, X, Sparkles } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { processVoiceCommand } from '../services/geminiService';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useTheme } from '../../ThemeContext';

interface VoiceCaptureProps {
  onBack: () => void;
}

export default function VoiceCapture({ onBack }: VoiceCaptureProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setTranscript('Necesito comprar aguacates y tomates...');
      setResponse(null);
      setIsListening(true);
      // Simulate a fake end of recording after 2s for this prototype
      setTimeout(() => {
        setIsListening(false);
      }, 2000);
    }
  };

  const handleProcess = async () => {
    if (!transcript) return;
    setProcessing(true);
    try {
      const data = await processVoiceCommand(transcript);
      setResponse(data);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  const confirmItems = async () => {
    if (!response?.items || !auth.currentUser) return;
    try {
      const q = query(collection(db, 'shoppingLists'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      if (snap.empty) return;
      
      const listId = snap.docs[0].id;
      const batch = writeBatch(db);
      
      response.items.forEach((item: any) => {
        const newItemRef = doc(collection(db, 'shoppingItems'));
        batch.set(newItemRef, {
          listId,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'ud',
          checked: false,
          addedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      onBack();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'shoppingItems');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <X size={20} color={colors.textSubtle} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asistente Vocal AI</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        <AnimatePresence>
          {!response ? (
            <MotiView 
              key="talk"
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={styles.talkContainer}
            >
              <Text style={styles.promptText}>
                {isListening ? "Habla ahora, te escucho..." : transcript ? "Pulsa el rayo para procesar lo dicho" : 'Di algo como: "Necesito comprar lo necesario para preparar un guacamole"'}
              </Text>
              
              <Text style={styles.transcriptText}>
                {transcript || (isListening ? "······" : "···")}
              </Text>

              <View style={styles.micContainer}>
                <TouchableOpacity 
                  style={[styles.micButton, isListening ? styles.micButtonListening : styles.micButtonIdle]}
                  onPress={toggleListening}
                >
                  {isListening ? <MicOff size={36} color="white" strokeWidth={2.5} /> : <Mic size={36} color="white" strokeWidth={2.5} />}
                </TouchableOpacity>
              </View>

              {transcript && !isListening && (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                >
                  <TouchableOpacity
                    onPress={handleProcess}
                    disabled={processing}
                    style={[styles.processButton, processing && { opacity: 0.5 }]}
                  >
                    {processing ? <ActivityIndicator color="white" /> : <Sparkles size={20} color="white" />}
                    <Text style={styles.processButtonText}>Analizar Comando</Text>
                  </TouchableOpacity>
                </MotiView>
              )}
            </MotiView>
          ) : (
            <MotiView 
              key="response"
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.responseContainer}
            >
              <View style={styles.responseHeader}>
                <Sparkles size={18} color={colors.primaryText} />
                <Text style={styles.responseBadgeText}>Cartia AI Voice</Text>
              </View>
              <Text style={styles.feedbackText}>"{response.feedback}"</Text>
              
              <View style={styles.itemsList}>
                {response.items.map((item: any, i: number) => (
                  <View key={i} style={styles.responseItem}>
                    <Text style={styles.responseItemName}>{item.name}</Text>
                    <View style={styles.responseItemQtyBox}>
                      <Text style={styles.responseItemQty}>x{item.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.responseActions}>
                <TouchableOpacity onPress={() => setResponse(null)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmItems} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Añadir Todo</Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  backButton: { width: 48, height: 48, backgroundColor: colors.backgroundSecondary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: colors.textSubtle },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  talkContainer: { width: '100%', alignItems: 'center' },
  promptText: { color: colors.textSubtle, marginBottom: 40, textAlign: 'center', fontSize: 14, fontWeight: '500', maxWidth: 250, lineHeight: 20 },
  transcriptText: { minHeight: 140, fontSize: 32, fontWeight: '800', textAlign: 'center', color: colors.text, marginBottom: 64 },
  micContainer: { position: 'relative' },
  micButton: { width: 112, height: 112, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 4, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  micButtonIdle: { backgroundColor: colors.accent, borderColor: colors.border },
  micButtonListening: { backgroundColor: colors.danger, borderColor: colors.dangerMuted, shadowColor: colors.danger, shadowOpacity: 0.3 },
  processButton: { marginTop: 64, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 20, borderRadius: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  processButtonText: { color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 10 },
  responseContainer: { backgroundColor: colors.backgroundSecondary, padding: 40, borderRadius: 48, width: '100%', maxWidth: 350, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.1, shadowRadius: 32, elevation: 12, borderWidth: 1, borderColor: colors.border },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32, backgroundColor: colors.primaryMuted, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.primaryMutedBorder },
  responseBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, color: colors.primaryText },
  feedbackText: { color: colors.textSecondary, marginBottom: 32, fontStyle: 'italic', fontWeight: '500', lineHeight: 24, fontSize: 14 },
  itemsList: { marginBottom: 40, gap: 16 },
  responseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  responseItemName: { fontWeight: '700', color: colors.text, fontSize: 16 },
  responseItemQtyBox: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  responseItemQty: { color: colors.primaryText, fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  responseActions: { flexDirection: 'row', gap: 16 },
  cancelButton: { flex: 1, paddingVertical: 20, backgroundColor: colors.background, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textSubtle, fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  confirmButton: { flex: 1, paddingVertical: 20, backgroundColor: colors.primary, borderRadius: 16, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  confirmButtonText: { color: 'white', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
});
