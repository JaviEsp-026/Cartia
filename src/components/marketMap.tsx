import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, View, Text, ActivityIndicator, Platform, ScrollView, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { List, X, Store, Clock, MapPin } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useTheme } from '../../ThemeContext';

interface MapScreenProps {
  // Parámetros opcionales del usuario
  latitude?: number;
  longitude?: number;
}

interface Supermarket {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export default function MapScreen({ latitude, longitude }: MapScreenProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    latitude && longitude ? { latitude, longitude } : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [isFetchingMarkets, setIsFetchingMarkets] = useState<boolean>(true);
  const [isListVisible, setIsListVisible] = useState<boolean>(false);
  const mapRef = useRef<MapView>(null);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    // Función para buscar supermercados en un radio de 3000 metros usando OpenStreetMap
    const fetchMarkets = async (lat: number, lon: number) => {
      setIsFetchingMarkets(true);
      try {      
        const query = `[out:json];node(around:20000,${lat},${lon})["shop"="supermarket"];out 15;`;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'CartiaApp/1.0' // Ayuda a que los servidores de Overpass no rechacen la petición
          },
          body: `data=${encodeURIComponent(query)}`
        });
        
        if (!response.ok) {
          throw new Error(`Error de servidor Overpass: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.elements) {
          const markets = data.elements.map((e: any) => ({
            id: e.id.toString(), 
            name: e.tags?.name || 'Supermercado',
            latitude: e.lat,
            longitude: e.lon
          }));
          setSupermarkets(markets);
        }
      } catch (err) {
        console.error("Error obteniendo supermercados:", err);
      } finally {
        setIsFetchingMarkets(false);
      }
    };

    if (latitude && longitude) {
      fetchMarkets(latitude, longitude);
    } else {
      Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
        if (status !== 'granted') {
          setErrorMsg('Se denegó el permiso para acceder a la ubicación');
        } else {
          try {
            // 1. Intentar obtener la ubicación en caché primero para carga casi instantánea
            let userLocation = await Location.getLastKnownPositionAsync();
            
            // 2. Si no hay caché, pedir la ubicación actual con precisión balanceada (mucho más rápida)
            if (!userLocation) {
              userLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }
            
            if (userLocation) {
              const lat = userLocation.coords.latitude;
              const lon = userLocation.coords.longitude;
              setLocation({ latitude: lat, longitude: lon });
              fetchMarkets(lat, lon);
            }
          } catch (error) {
            setErrorMsg('Error al obtener la ubicación actual');
          }
        }
      });
    }
  }, [latitude, longitude]);

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} // Usar Google Maps en Android y el default (Apple Maps) en iOS para evitar crashes en Expo Go
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true} // Muestra la posición del usuario en el mapa
      >
        <Marker coordinate={location} title="Ubicación" description="Posición actual del usuario" />
        
        {/* Marcadores dinámicos de los supermercados cercanos */}
        {supermarkets.map(market => (
          <Marker
            key={market.id}
            coordinate={{ latitude: market.latitude, longitude: market.longitude }}
            title={market.name}
            description="Supermercado cercano"
            pinColor={colors.primary} // Color verde para identificar que son supermercados
          />
        ))}
      </MapView>

      {/* Botón Flotante (FAB) "Ver Lista" */}
      <AnimatePresence>
        {!isListVisible && (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={styles.fabContainer}
          >
            <TouchableOpacity 
              onPress={() => setIsListVisible(true)}
              activeOpacity={0.9}
              style={{ alignItems: 'center' }}
            >
              <View style={styles.fab}>
                <List color={colors.text} size={24} />
                {supermarkets.length > 0 && (
                  <View style={styles.fabBadge}>
                    <Text style={styles.fabBadgeText}>{supermarkets.length}</Text>
                  </View>
                )}
              </View>              
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Capa de Supermercados (Bottom Sheet) */}
      <AnimatePresence>
        {isListVisible && (
          <MotiView
            from={{ translateY: 500, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: 600, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={styles.bottomSheet}
          >            
            
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Supermercados Cercanos ({supermarkets.length})
              </Text>
              <TouchableOpacity onPress={() => setIsListVisible(false)} style={styles.closeButton}>
                <X color={colors.textSubtle} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {isFetchingMarkets && (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
              )}
              
              {!isFetchingMarkets && supermarkets.length === 0 && (
                <Text style={styles.emptyText}>No hemos encontrado supermercados cercanos.</Text>
              )}

              {supermarkets.map((market, index) => {
                // Datos simulados (mock) para el diseño solicitado
                const distance = (1.2 + (index * 0.3)).toFixed(1);
                const savings = Math.max(5, 20 - (index * 2));

                return (
                  <TouchableOpacity
                    key={market.id}
                    style={styles.marketCardSheet}
                    activeOpacity={0.7}
                  onPress={() => {
                    console.log(`Supermercado seleccionado (ID): ${market.id}`);
                    mapRef.current?.animateToRegion({
                      latitude: market.latitude,
                      longitude: market.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                    setIsListVisible(false);
                  }}
                  >
                    <View style={styles.marketLogo}>
                      <Store color={colors.textSubtle} size={24} />
                    </View>
                    
                    <View style={styles.marketInfo}>
                      <Text style={styles.marketNameSheet} numberOfLines={1}>
                        {market.name}
                      </Text>
                      <View style={styles.marketDetailsRow}>
                        <MapPin size={12} color={colors.textSecondary} />
                        <Text style={styles.marketDetailsText}>A {distance} km</Text>
                        <Text style={styles.marketDetailsDot}>•</Text>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.marketDetailsText}>Abierto hasta 21:00</Text>
                      </View>
                    </View>

                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>-{savings}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
 
const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, position: 'relative' },
  map: { flex: 1, width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Estilos del FAB
  fabContainer: {
    position: 'absolute',
    bottom: 110, // Por encima de la navbar (ajustado para que quede a ~20px)
    right: 24,
    zIndex: 50,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  fabBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  fabBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  fabLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Estilos del Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 50,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sheetHandle: {
    width: 40,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.border,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetScroll: { flex: 1 },
  marketCardSheet: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  marketLogo: {
    width: 50,
    height: 50,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  marketInfo: { flex: 1 },
  marketNameSheet: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  marketDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marketDetailsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  marketDetailsDot: { color: colors.textSecondary, fontSize: 12, marginHorizontal: 2 },
  savingsBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryMutedBorder,
  },
  savingsText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 20,
    fontSize: 14,
  },
});