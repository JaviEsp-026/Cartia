import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { InventoryItem } from '../types';
import { MotiView, AnimatePresence } from 'moti';
import { Plus, Search, SlidersHorizontal, Package } from 'lucide-react-native';
import { useTheme } from '../../ThemeContext';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    return unsubscribe;
  }, []);

  const updateLevel = async (id: string, newLevel: number) => {
    try {
      await updateDoc(doc(db, 'inventory', id), {
        currentLevel: newLevel,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const filteredItems = items.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.textSubtle} />
        <TextInput 
          placeholder="Buscar en la despensa..."
          placeholderTextColor={colors.textSubtle}
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
        />
        <SlidersHorizontal size={18} color={colors.textSubtle} />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <AnimatePresence>
          {filteredItems.map((item) => (
            <MotiView 
              key={item.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={styles.itemCard}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>{getCategoryIcon(item.category)}</Text>
                  </View>
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelValue}>{item.currentLevel}%</Text>
                  <Text style={styles.levelLabel}>Nivel</Text>
                </View>
              </View>
              
              <View style={styles.levelControl}>
                <TouchableOpacity 
                  onPress={() => updateLevel(item.id, Math.max(0, item.currentLevel - 10))} 
                  style={styles.controlButton}
                >
                  <Text style={styles.controlButtonText}>-</Text>
                </TouchableOpacity>
                
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${item.currentLevel}%` }]} />
                </View>
                
                <TouchableOpacity 
                  onPress={() => updateLevel(item.id, Math.min(100, item.currentLevel + 10))} 
                  style={styles.controlButton}
                >
                  <Text style={styles.controlButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.levelLabels}>
                <Text style={styles.levelLabelText}>Vacío</Text>
                <Text style={styles.levelLabelText}>Medio</Text>
                <Text style={styles.levelLabelText}>Lleno</Text>
              </View>
            </MotiView>
          ))}
        </AnimatePresence>
      </ScrollView>

      {filteredItems.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Package size={48} color={colors.border} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No se han encontrado productos</Text>
        </View>
      )}

      <TouchableOpacity style={styles.fab}>
        <Plus size={28} strokeWidth={3} color="white" />
      </TouchableOpacity>
    </View>
  );
}

function getCategoryIcon(category: string) {
  const cats: Record<string, string> = {
    'Fruit': '🍎',
    'Dairy': '🥛',
    'Cleaning': '🧹',
    'Meat': '🥩',
    'Veggie': '🥦',
    'Bread': '🍞',
  };
  return cats[category] || '📦';
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, paddingBottom: 80 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.backgroundSecondary, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 24 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, padding: 0 },
  listContainer: { gap: 16, paddingBottom: 40 },
  itemCard: { backgroundColor: colors.backgroundSecondary, padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 16 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 48, height: 48, backgroundColor: colors.background, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconText: { fontSize: 20 },
  itemName: { fontWeight: '700', color: colors.text, fontSize: 16 },
  itemCategory: { fontSize: 10, fontWeight: '900', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  levelInfo: { alignItems: 'flex-end' },
  levelValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  levelLabel: { fontSize: 10, color: colors.textSubtle, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  levelControl: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  controlButton: { width: 36, height: 36, backgroundColor: colors.border, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  controlButtonText: { fontSize: 20, fontWeight: '700', color: colors.textSecondary, lineHeight: 22 },
  progressBarContainer: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40 },
  levelLabelText: { fontSize: 10, fontWeight: '900', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
  emptyContainer: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { color: colors.textSubtle, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, fontSize: 10 },
  fab: { position: 'absolute', bottom: 100, right: 20, backgroundColor: colors.primary, width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, zIndex: 40 }
});
