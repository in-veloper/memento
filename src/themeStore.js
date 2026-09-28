import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palettes } from './theme';

const THEME_KEY = 'memento/theme';

let mode = 'dark';
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemeMode() {
  return useSyncExternalStore(subscribe, () => mode);
}

export function useColors() {
  const m = useThemeMode();
  return palettes[m];
}

export function getThemeMode() {
  return mode;
}

export async function initTheme() {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      mode = saved;
      emit();
    }
  } catch {
    // 저장된 값을 못 읽으면 기본(어두운 테마)으로 그냥 시작한다.
  }
}

export function setThemeMode(next) {
  if (next !== 'light' && next !== 'dark') return;
  mode = next;
  emit();
  AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
}

export function toggleThemeMode() {
  setThemeMode(mode === 'dark' ? 'light' : 'dark');
}
