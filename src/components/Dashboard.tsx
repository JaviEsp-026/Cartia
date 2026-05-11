import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { InventoryItem } from '../types';
import { MotiView } from 'moti';
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../ThemeContext';

export default function Dashboard() {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Filter items with currentLevel < 30
    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', auth.currentUser.uid),
      where('currentLevel', '<', 30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setLowStockItems(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    return unsubscribe;
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Auto-Listado Predictivo</Text>
          <Text style={styles.accuracyText}>92% de precisión hoy</Text>
        </View>
        
        {loading ? (
          <View style={styles.skeleton} />
        ) : lowStockItems.length > 0 ? (
          <View style={styles.listContainer}>
            {lowStockItems.map((item) => (
              <MotiView 
                key={item.id}
                from={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.itemCard}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>{getCategoryIcon(item.category)}</Text>
                  </View>
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.warningRow}>
                      <Clock size={12} color={colors.primaryText} />
                      <Text style={styles.warningText}>Se agotará mañana según consumo</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.quantityText}>x2</Text>
                  <View style={styles.progressBg}>
                    <MotiView 
                      from={{ width: '0%' }}
                      animate={{ width: `${item.currentLevel}%` }}
                      style={styles.progressFill}
                    />
                  </View>
                </View>
              </MotiView>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={40} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Todo bajo control</Text>
            <Text style={styles.emptyText}>Tu despensa está bien surtida basándonos en tus hábitos.</Text>
          </View>
        )}
      </View>

      <View style={styles.savingsCard}>
        <Text style={styles.savingsLabel}>Ahorro Estimado</Text>
        <Text style={styles.savingsAmount}>14,20€</Text>
        <Text style={styles.savingsDesc}>
          Hoy te conviene ir a <Text style={styles.savingsHighlight}>Mercadona</Text>.
        </Text>
        <ArrowRight color="white" size={24} style={styles.savingsArrow} />
      </View>

      <View style={styles.mapCard}>
        <Text style={styles.mapTitle}>Mapa de Eficiencia</Text>
        <View style={styles.mapSteps}>
          <EfficiencyStep number="01" title="Frutería y Verduras" desc="Comienza por el frescor. Evita peso encima." />
          <EfficiencyStep number="02" title="Pasillo 4: Limpieza" desc="Detergente en oferta (-2€ hoy)." />
          <View style={styles.mapRoute}>
             <Text style={styles.mapRouteText}>Ruta optimizada para Tu Supermercado Habitual</Text>
          </View>
        </View>
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function EfficiencyStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepNumberBox}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingVertical: 16 },
  section: { marginBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  accuracyText: { fontSize: 12, fontWeight: '600', color: colors.primaryText },
  skeleton: { height: 160, backgroundColor: colors.border, borderRadius: 32 },
  listContainer: { gap: 16 },
  itemCard: { backgroundColor: colors.primaryMuted, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.primaryMutedBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  iconBox: { width: 48, height: 48, backgroundColor: colors.backgroundSecondary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconText: { fontSize: 24 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  warningText: { fontSize: 10, fontWeight: '700', color: colors.primaryText, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  quantityText: { fontSize: 14, fontWeight: '700', color: colors.primaryText },
  progressBg: { width: 64, height: 6, backgroundColor: colors.backgroundSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  emptyCard: { backgroundColor: colors.backgroundSecondary, padding: 48, borderRadius: 32, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  savingsCard: { backgroundColor: colors.primary, padding: 24, borderRadius: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' },
  savingsLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  savingsAmount: { fontSize: 36, fontWeight: '800', color: 'white', marginBottom: 16 },
  savingsDesc: { fontSize: 14, color: 'rgba(255,255,255,0.9)', maxWidth: 200, lineHeight: 20 },
  savingsHighlight: { fontWeight: '900', textDecorationLine: 'underline' },
  savingsArrow: { position: 'absolute', bottom: 24, right: 24, opacity: 0.4 },
  mapCard: { backgroundColor: colors.backgroundSecondary, borderRadius: 32, borderWidth: 1, borderColor: colors.border, padding: 24 },
  mapTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '900', color: colors.textSecondary, marginBottom: 24 },
  mapSteps: { gap: 24 },
  stepContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepNumberBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  stepNumber: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: colors.textSecondary },
  mapRoute: { borderLeftWidth: 2, borderLeftColor: colors.primary, marginLeft: 16, paddingLeft: 16, paddingVertical: 4 },
  mapRouteText: { fontSize: 10, color: colors.primaryText, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});

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
