import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import App from './App.tsx';

// registerRootComponent garantiza que el entorno de Expo 
// configure el componente principal correctamente.
registerRootComponent(App);