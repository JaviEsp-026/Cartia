import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Camera as CameraIcon, RefreshCcw, Check, X, Image as ImageIcon } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { analyzePantryImage, parseReceipt } from '../services/geminiService';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../ThemeContext';

interface VisionCaptureProps {
  onBack: () => void;
}

export default function VisionCapture({ onBack }: VisionCaptureProps) {
  const [mode, setMode] = useState<'camera' | 'preview' | 'processing' | 'results'>('camera');
  const [captureType, setCaptureType] = useState<'pantry' | 'receipt'>('pantry');
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const startCamera = async () => {
    setMode('camera');
  };

  const capture = () => {
      // Mocked capture since actual RN camera requires expo-camera
      setImage('https://images.unsplash.com/photo-1542838132-92c53300491e');
      setMode('preview');
  };

  const processImage = async () => {
    if (!image) return;
    setMode('processing');
    try {
      // Prevenir error de "undefined" si usamos una URL "mock" en lugar de un Base64 real
      const base64 = image.includes(',') ? image.split(',')[1] : image;
      let data;
      if (captureType === 'pantry') {
        data = await analyzePantryImage(base64);
        setResults(data);
      } else {
        data = await parseReceipt(base64);
        setResults(data.items || []);
      }
      setMode('results');
    } catch (err) {
      console.error("Analysis failed", err);
      setMode('preview');
    }
  };

  const addToShoppingList = async (item: any) => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'shoppingLists'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      if (snap.empty) return;
      
      await addDoc(collection(db, 'shoppingItems'), {
        listId: snap.docs[0].id,
        name: item.name,
        quantity: 1,
        unit: 'ud',
        checked: false,
        addedAt: new Date().toISOString()
      });
      
      // Remove from results locally
      setResults(prev => prev.filter(r => r.name !== item.name));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'shoppingItems');
    }
  };

  useEffect(() => {
    startCamera();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <X size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, captureType === 'pantry' && styles.toggleButtonActive]}
            onPress={() => setCaptureType('pantry')}
          >
            <Text style={[styles.toggleText, captureType === 'pantry' && styles.toggleTextActive]}>Despensa</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, captureType === 'receipt' && styles.toggleButtonActive]}
            onPress={() => setCaptureType('receipt')}
          >
            <Text style={[styles.toggleText, captureType === 'receipt' && styles.toggleTextActive]}>Ticket</Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mainContent}>
        {mode === 'camera' && (
          <View style={styles.placeholderCamera}>
            <CameraIcon size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.placeholderText}>Cámara Mock: Pulsa el botón para capturar</Text>
          </View>
        )}

        {image && mode !== 'camera' && (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} />
        )}

        <AnimatePresence>
          {mode === 'processing' && (
            <MotiView 
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.processingOverlay}
            >
              <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 24, transform: [{ scale: 1.5 }] }} />
              <Text style={styles.processingText}>Cerebro de Cartia analizando...</Text>
            </MotiView>
          )}

          {mode === 'results' && (
            <MotiView 
              from={{ translateY: 500 }}
              animate={{ translateY: 0 }}
              style={styles.resultsSheet}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>IA Vision</Text>
              <Text style={styles.sheetSubtitle}>Hemos identificado estos elementos. Pulsa para añadirlos.</Text>
              
              <ScrollView style={{ flex: 1, marginBottom: 16 }}>
                <View style={{ gap: 12 }}>
                  {results.map((res, i) => (
                    <View key={i} style={styles.resultItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultItemName}>{res.name}</Text>
                        {res.reason && <Text style={styles.resultItemReason}>{res.reason}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => addToShoppingList(res)} style={styles.addResultButton}>
                        <Check size={20} color="white" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
              
              <TouchableOpacity onPress={onBack} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Hecho</Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      <View style={styles.controls}>
        {mode === 'camera' ? (
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={capture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        ) : (
          mode === 'preview' && (
            <>
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={() => { setImage(null); startCamera(); }}
              >
                <RefreshCcw size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.processImageButton}
                onPress={processImage}
              >
                <Check size={32} color="white" strokeWidth={3} />
              </TouchableOpacity>
            </>
          )
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: { padding: 24, paddingTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  iconButton: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 4 },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  toggleButtonActive: { backgroundColor: 'white' },
  toggleText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.5)' },
  toggleTextActive: { color: 'black' },
  mainContent: { flex: 1, position: 'relative', overflow: 'hidden' },
  placeholderCamera: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  placeholderText: { color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 12 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3 },
  resultsSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.backgroundSecondary, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 40, height: '85%' },
  sheetHandle: { width: 48, height: 6, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 32 },
  sheetTitle: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sheetSubtitle: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 32 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: colors.background, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  resultItemName: { fontWeight: '700', color: colors.text, fontSize: 16 },
  resultItemReason: { fontSize: 10, color: colors.primaryText, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  addResultButton: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  doneButton: { width: '100%', paddingVertical: 20, backgroundColor: colors.accent, borderRadius: 16, alignItems: 'center' },
  doneButtonText: { color: colors.accentContrast, fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  controls: { padding: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  captureButton: { width: 80, height: 80, backgroundColor: 'white', borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 64, height: 64, borderWidth: 2, borderColor: 'black', borderRadius: 32 },
  retakeButton: { width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  processImageButton: { width: 80, height: 80, backgroundColor: colors.primary, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
});
