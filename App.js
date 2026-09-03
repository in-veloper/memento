import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Keyboard,
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
import { dueCards, init, overallStats, useStore } from './src/store';
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
  const overall = useMemo(() => overallStats(state), [state]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <Text style={styles.brand}>MEMENTO</Text>

            <View style={styles.headline}>
              <Text style={styles.headlineNumber}>{dueCount}</Text>
              <Text style={styles.headlineUnit}>장</Text>
              <Text style={styles.headlineTail}>
                {dueCount > 0 ? '오늘 외울 카드' : '오늘 몫 완료'}
              </Text>
            </View>

            {state.cards.length > 0 && (
              <Text style={styles.headlineSub}>
                전체 {overall.total}장 · 암기율 {Math.round(overall.mastery * 100)}%
              </Text>
            )}
          </View>

          <View style={styles.tabs}>
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={styles.tab}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {item.text}
                  </Text>
                  <View style={[styles.tabLine, active && styles.tabLineActive]} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.content}>
            {tab === 'today' && <TodayScreen onGoDecks={() => setTab('decks')} />}
            {tab === 'decks' && <DecksScreen />}
            {tab === 'stats' && <StatsScreen />}
          </View>
        </Pressable>
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
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },

  header: { gap: 6 },
  brand: {
    fontFamily: font.bold,
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 3,
  },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  headlineNumber: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 40,
    letterSpacing: -1.6,
  },
  headlineUnit: {
    fontFamily: font.semibold,
    color: colors.text,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  headlineTail: {
    fontFamily: font.regular,
    color: colors.textFaint,
    fontSize: 14,
    marginLeft: 8,
  },
  headlineSub: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12 },

  tabs: { flexDirection: 'row', gap: 22, marginTop: 20, marginBottom: 16 },
  tab: { gap: 8 },
  tabText: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 15 },
  tabTextActive: { fontFamily: font.bold, color: colors.text },
  tabLine: { height: 2, borderRadius: radius.pill, backgroundColor: 'transparent' },
  tabLineActive: { backgroundColor: colors.accent },

  content: { flex: 1 },
});
