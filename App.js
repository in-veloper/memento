import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import AlarmRingScreen from './src/AlarmRingScreen';
import AlarmScreen from './src/AlarmScreen';
import { getActiveChallenge } from './src/alarmStore';
import DecksScreen from './src/DecksScreen';
import StatsScreen from './src/StatsScreen';
import TodayScreen from './src/TodayScreen';
import { dueCards, init, overallStats, useStore } from './src/store';
import { font, radius } from './src/theme';
import { initTheme, toggleThemeMode, useColors, useThemeMode } from './src/themeStore';

const TABS = [
  { key: 'today', text: '오늘', icon: 'today-outline' },
  { key: 'decks', text: '과목', icon: 'albums-outline' },
  { key: 'alarm', text: '알람', icon: 'alarm-outline' },
  { key: 'stats', text: '설정', icon: 'settings-outline' },
];

export default function App() {
  const colors = useColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState('today');
  const [ringing, setRinging] = useState(false);
  const state = useStore();

  useEffect(() => {
    init();
    initTheme();
  }, []);

  // 알람이 울리면 위젯과 같은 방식(memento://alarm 딥링크)으로 앱을 연다 —
  // 앱이 완전히 꺼져 있었어도 이 신호를 받아서 곧장 문제 화면으로 바꾼다.
  useEffect(() => {
    const handleUrl = (url) => {
      if (url && url.includes('alarm')) setRinging(true);
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // 알림이나 최근 앱 목록에서 지워져서 딥링크를 못 받고 그냥 앱 아이콘으로
  // 열었을 때도, 아직 안 푼 알람 문제가 남아 있으면 곧장 그 화면으로 보낸다 —
  // 안 그러면 알림/최근앱을 지운 순간 문제 화면으로 돌아갈 방법이 없어진다.
  useEffect(() => {
    const checkChallenge = () => {
      if (getActiveChallenge()) setRinging(true);
    };
    checkChallenge();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') checkChallenge();
    });
    return () => sub.remove();
  }, []);

  const dueCount = useMemo(() => (state.loaded ? dueCards(state).length : 0), [state]);
  const overall = useMemo(() => overallStats(state), [state]);
  const statusBarStyle = mode === 'dark' ? 'light' : 'dark';

  if (ringing) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style={statusBarStyle} />
        <AlarmRingScreen onSolved={() => setRinging(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={statusBarStyle} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 예전엔 화면 전체를 Pressable 로 감싸 키보드를 닫았는데, 그게 안쪽 스크롤
            제스처까지 먼저 가로채서 손가락 스크롤이 아예 안 먹었다. 순수 View 로 둔다. */}
        <View style={styles.screen}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.brand}>MEMENTO</Text>
              <Pressable onPress={toggleThemeMode} hitSlop={10} style={styles.themeToggle}>
                <Ionicons
                  name={mode === 'dark' ? 'moon' : 'sunny'}
                  size={16}
                  color={colors.accent}
                />
              </Pressable>
            </View>

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
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={active ? colors.onAccent : colors.textFaint}
                  />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {item.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.content}>
            {tab === 'today' && <TodayScreen onGoDecks={() => setTab('decks')} />}
            {tab === 'decks' && <DecksScreen />}
            {tab === 'alarm' && <AlarmScreen />}
            {tab === 'stats' && <StatsScreen />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
    },
    flex: { flex: 1 },
    screen: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },

    header: { gap: 6 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: {
      fontFamily: font.bold,
      color: colors.accent,
      fontSize: 11,
      letterSpacing: 3,
    },
    themeToggle: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentDim,
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

    tabs: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 20,
      marginBottom: 16,
      padding: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceHigh,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: radius.pill,
    },
    tabActive: { backgroundColor: colors.accent },
    tabText: { fontFamily: font.bold, color: colors.textFaint, fontSize: 13 },
    tabTextActive: { fontFamily: font.bold, color: colors.onAccent },

    content: { flex: 1 },
  });
}
