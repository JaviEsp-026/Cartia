import React, { createContext, useContext } from 'react';

export const lightColors = {
  background: '#F9FAFB',
  backgroundSecondary: 'white',
  text: '#0F172A',
  textSecondary: '#64748B',
  textSubtle: '#94A3B8',
  border: '#F1F5F9',
  primary: '#10B981',
  primaryContrast: 'white',
  primaryMuted: '#ECFDF5',
  primaryMutedBorder: '#D1FAE5',
  primaryText: '#059669',
  accent: '#0F172A',
  accentContrast: 'white',
  danger: '#F43F5E',
  dangerMuted: '#FFE4E6',
  shadow: '#000',
};

export const darkColors: typeof lightColors = {
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textSubtle: '#64748B',
  border: '#334155',
  primary: '#10B981',
  primaryContrast: 'white',
  primaryMuted: 'rgba(16, 185, 129, 0.1)',
  primaryMutedBorder: 'rgba(16, 185, 129, 0.2)',
  primaryText: '#6EE7B7',
  accent: '#F8FAFC',
  accentContrast: '#0F172A',
  danger: '#F43F5E',
  dangerMuted: 'rgba(244, 63, 94, 0.2)',
  shadow: '#000',
};

export const ThemeContext = createContext<{
  theme: 'light' | 'dark';
  colors: typeof lightColors;
  toggleTheme: () => void;
} | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};