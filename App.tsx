import 'react-native-reanimated';

import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  StatusBar, 
  ActivityIndicator,
  Dimensions,
  Platform,
  Keyboard,
  useColorScheme
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle } from './src/lib/firebase';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Mic, 
  Camera, 
  LogIn, 
  MapPin,
  Sun,
  Moon
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { ThemeContext, lightColors, darkColors, useTheme } from './ThemeContext';
// Componentes refactorizados para Native
import Dashboard from './src/components/Dashboard';
import Inventory from './src/components/Inventory';
import ShoppingList from './src/components/ShoppingList';
import VisionCapture from './src/components/VisionCapture';
import VoiceCapture from './src/components/VoiceCapture';
import MapScreen from './src/components/marketMap';

const { width } = Dimensions.get('window');

// Configuración del inicio de sesión nativo de Google
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
});

export default function AppWrapper() {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>(colorScheme || 'light');

  useEffect(() => {
    // Sincroniza el tema de la app con el del sistema operativo
    setTheme(colorScheme || 'light');
  }, [colorScheme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      <App />
    </ThemeContext.Provider>
  );
}

function App() {
  const { theme, colors, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'map' | 'list' | 'vision' | 'voice'>('dashboard');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const handleNativeGoogleLogin = async () => {
    try {
      // Verifica que Google Play Services esté disponible (necesario en Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Inicia el flujo de login nativo
      const response: any = await GoogleSignin.signIn();
      
      // Si el login fue exitoso, pasa el token a Firebase
      // Soporta tanto la v10 (response.idToken) como la v11+ (response.data.idToken)
      const idToken = response?.data?.idToken || response?.idToken;
      
      if (idToken) {
        await signInWithGoogle(idToken);
      }
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error('Error en Native Google Sign-In:', error);
      }
    }
  };

  useEffect(() => {
    // Detectar cuando el teclado se abre/cierra para ocultar la barra inferior
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <MotiView 
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.authCard}
        >          
          <Image source={require('./assets/cartia_logo.png')} style={styles.authLogo} />
          <Text style={styles.authTitle}>Cartia</Text>
          <Text style={styles.authSubtitle}>
            Tu asistente de compras proactivo que predice tus necesidades.
          </Text>
          <TouchableOpacity 
            onPress={handleNativeGoogleLogin}
            style={styles.authButton}
          >
            <LogIn color={colors.accentContrast} size={20} />
            <Text style={[styles.authButtonText, { color: colors.accentContrast }]}>Acceder con Google</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'list': return <ShoppingList />;
      case 'vision': return <VisionCapture onBack={() => setActiveTab('dashboard')} />;
      case 'voice': return <VoiceCapture onBack={() => setActiveTab('dashboard')} />;
      case 'map': return <MapScreen />;
      default: return <Dashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Image source={require('./assets/cartia_logo.png')} style={styles.headerLogo} />
          </View>          
          <View>
            <Text style={styles.brandName}>Cartia</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Edge AI Active</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            {theme === 'light' ? <Moon size={20} color={colors.textSecondary} /> : <Sun size={20} color={colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => auth.signOut()} style={styles.profileButton}>
            <Image 
              source={{ uri: user.photoURL || 'https://via.placeholder.com/150' }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        <AnimatePresence mode="wait">
          <MotiView
            key={activeTab}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            transition={{ type: 'timing', duration: 200 }}
            style={{ flex: 1 }}
          >
            {renderContent()}
          </MotiView>
        </AnimatePresence>
      </View>

      {/* Navigation */}
      {!isKeyboardVisible && (
        <View style={styles.navbar}>
          <NavButton 
            active={activeTab === 'dashboard'} 
            onPress={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={20} color={activeTab === 'dashboard' ? colors.primary : colors.textSubtle} />} 
            label="Inicio" 
          />
          <NavButton 
            active={activeTab === 'inventory'} 
            onPress={() => setActiveTab('inventory')} 
            icon={<Package size={20} color={activeTab === 'inventory' ? colors.primary : colors.textSubtle} />} 
            label="Despensa" 
          />
          <NavButton 
            active={activeTab === 'map'} 
            onPress={() => setActiveTab('map')} 
            icon={<MapPin size={20} color={activeTab === 'map' ? colors.primary : colors.textSubtle} />} 
            label="Mapa" 
          />
          
          <View style={styles.centerActionContainer}>
            <TouchableOpacity 
              onPress={() => setActiveTab('vision')}
              style={[styles.centerActionButton, { backgroundColor: colors.primary }]}
            >
              <Camera color={colors.primaryContrast} size={24} />
            </TouchableOpacity>
          </View>
  
          <NavButton 
            active={activeTab === 'list'} 
            onPress={() => setActiveTab('list')} 
            icon={<ShoppingCart size={20} color={activeTab === 'list' ? colors.primary : colors.textSubtle} />} 
            label="Lista" 
          />
          <NavButton 
            active={activeTab === 'voice'} 
            onPress={() => setActiveTab('voice')} 
            icon={<Mic size={20} color={activeTab === 'voice' ? colors.primary : colors.textSubtle} />} 
            label="Voz" 
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function NavButton({ active, icon, label, onPress }: { active: boolean, icon: React.ReactNode, label: string, onPress: () => void }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={styles.navButton}
    >
      {icon}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // Solución obligatoria para que el status bar de Android no tape el header
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  authContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },  
  authLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: '100%',
    gap: 12,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.backgroundSecondary,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  main: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navbar: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 32,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navLabelActive: {
    color: colors.primary,
  },
  centerActionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  centerActionButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
