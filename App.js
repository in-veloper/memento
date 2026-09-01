import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import DecksScreen from './src/DecksScreen';
import StatsScreen from './src/StatsScreen';
import TodayScreen from './src/TodayScreen';
import { dueCards, init, useStore } from './src/store';
import { colors, font, radius } from './src/theme';

const TABS = [
  { key: 'today', text: '오늘' },
  { key: 'decks', text: '덱' },
  { key: 'stats', text: '현황' },
];

export default function App() {
  const [tab, setTab] = useState('today');
  const state = useStore();

  useEffect(() => {
    init();
  }, []);

  const dueCount = useMemo(() => (state.loaded ? dueCards(state).length : 0), [state]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.brand}>Memento</Text>
            <Text style={styles.tagline}>
              {dueCount > 0 ? `오늘 외울 카드 ${dueCount}장` : '오늘 몫을 끝냈습니다'}
            </Text>
          </View>

          <View style={styles.segment}>
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {item.text}
                  </Text>
                  {item.key === 'today' && dueCount > 0 && (
                    <View style={[styles.dot, active && styles.dotActive]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.content}>
            {tab === 'today' && <TodayScreen onGoDecks={() => setTab('decks')} />}
            {tab === 'decks' && <DecksScreen />}
            {tab === 'stats' && <StatsScreen />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 14 },

  header: { gap: 2 },
  brand: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  tagline: { fontFamily: font.regular, color: colors.textFaint, fontSize: 13 },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { fontFamily: font.bold, color: colors.textDim, fontSize: 14 },
  segmentTextActive: { color: colors.onAccent },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  dotActive: { backgroundColor: colors.onAccent },

  content: { flex: 1 },
});
