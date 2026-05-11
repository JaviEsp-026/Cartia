import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { ShoppingItem, ShoppingList as ListType } from '../types';
import { Check, Plus, Trash2, ShoppingBasket, Share2 } from 'lucide-react-native';
import { useTheme } from '../../ThemeContext';

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [list, setList] = useState<ListType | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    if (!auth.currentUser) return;

    // For simplicity, we fetch the first list found for the user
    const qList = query(collection(db, 'shoppingLists'), where('userId', '==', auth.currentUser.uid));
    
    let unsubItems: () => void;

    const unsubList = onSnapshot(qList, (snap) => {
      if (snap.empty) {
        // Create initial list if none exists
        createInitialList();
      } else {
        const listData = { id: snap.docs[0].id, ...snap.docs[0].data() } as ListType;
        setList(listData);
        
        // Listen to items for this list
        const qItems = query(collection(db, 'shoppingItems'), where('listId', '==', listData.id));
        if (unsubItems) unsubItems();
        unsubItems = onSnapshot(qItems, (itemSnap) => {
          setItems(itemSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingItem)));
        });
      }
    });

    return () => {
      unsubList();
      if (unsubItems) unsubItems();
    };
  }, []);

  const createInitialList = async () => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'shoppingLists'), {
        userId: auth.currentUser.uid,
        name: 'Mi Compra',
        createdAt: new Date().toISOString(),
        collaborators: []
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'shoppingLists');
    }
  };

  const addItem = async () => {
    if (!newItemName.trim() || !list) return;
    try {
      await addDoc(collection(db, 'shoppingItems'), {
        listId: list.id,
        name: newItemName,
        quantity: 1,
        unit: 'ud',
        checked: false,
        addedAt: new Date().toISOString()
      });
      setNewItemName('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'shoppingItems');
    }
  };

  const toggleCheck = async (item: ShoppingItem) => {
    try {
      await updateDoc(doc(db, 'shoppingItems', item.id), {
        checked: !item.checked
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `shoppingItems/${item.id}`);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `shoppingItems/${id}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{list?.name || 'Cargando...'}</Text>
          <Text style={styles.subtitle}>{items.length} productos gestionados</Text>
        </View>
        <TouchableOpacity style={styles.shareButton}>
          <Share2 size={20} color={colors.textSubtle} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput 
            value={newItemName}
            onChangeText={setNewItemName}
            placeholder="¿Qué necesitas comprar?"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            onSubmitEditing={addItem}
          />
        </View>
        <TouchableOpacity onPress={addItem} style={styles.addButton}>
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.listContent}>
          {[...items].sort((a: ShoppingItem, b: ShoppingItem) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1)).map((item: ShoppingItem) => (
            <View 
              key={item.id}
              style={[styles.itemCard, item.checked && styles.itemCardChecked]}
            >
              <TouchableOpacity style={styles.itemLeft} onPress={() => toggleCheck(item)}>
                <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                  {item.checked && <Check size={14} color="white" strokeWidth={4} />}
                </View>
                <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>{item.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteButton}>
                <Trash2 size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>
          ))}
        
          {items.length === 0 && (
            <View style={styles.emptyState}>
              <ShoppingBasket size={64} color={colors.textSubtle} strokeWidth={1} style={{ marginBottom: 24 }} />
              <Text style={styles.emptyText}>Lista despejada</Text>
            </View>
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 10, color: colors.textSubtle, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  shareButton: { width: 48, height: 48, backgroundColor: colors.backgroundSecondary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  inputContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  inputWrapper: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  input: { flex: 1, paddingHorizontal: 24, paddingVertical: 16, fontSize: 14, fontWeight: '600', color: colors.text },
  addButton: { backgroundColor: colors.accent, paddingHorizontal: 24, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  listContainer: { flex: 1 },
  listContent: { gap: 16 },
  itemCard: { padding: 20, borderRadius: 28, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemCardChecked: { backgroundColor: colors.background, opacity: 0.6 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemText: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemTextChecked: { textDecorationLine: 'line-through', color: colors.textSubtle },
  deleteButton: { padding: 8 },
  emptyState: { paddingVertical: 80, alignItems: 'center', opacity: 0.3 },
  emptyText: { fontSize: 10, fontWeight: '900', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 3 },
});
