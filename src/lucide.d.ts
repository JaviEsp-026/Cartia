import 'lucide-react-native';

declare module 'lucide-react-native' {
  export interface LucideProps {
    color?: string;
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }
}