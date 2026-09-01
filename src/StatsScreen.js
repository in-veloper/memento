import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  dateKey,
  deckStats,
  lastDays,
  overallStats,
  streakOf,
  useStore,
} from './store';
import { colors, font, gradient, radius } from './theme';
import { EmptyState, Label, Panel, ProgressRing } from './ui';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function StatsScreen() {
  const state = useStore();

  const overall = useMemo(() => overallStats(state), [state]);
  const week = useMemo(() => lastDays(state.history, 7), [state.history]);
  const streak = useMemo(() => streakOf(state.history), [state.history]);
  const today = state.history[dateKey()] || { reviewed: 0, again: 0, good: 0 };

  const peak = Math.max(10, ...week.map((d) => d.reviewed));

  if (state.cards.length === 0) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        title="아직 기록이 없습니다"
        body={'카드를 만들고 복습을 시작하면\n여기에 암기 상황이 쌓입니다.'}
      />
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      <Panel style={styles.hero}>
        <ProgressRing size={92} stroke={8} value={overall.mastery}>
          <Text style={styles.heroValue}>{Math.round(overall.mastery * 100)}%</Text>
        </ProgressRing>

        <View style={styles.heroBody}>
          <Text style={styles.heroTitle}>전체 암기율</Text>
          <Text style={styles.heroMeta}>
            카드 {overall.total}장 중 완전암기 {overall.mastered}장
          </Text>
          <Text style={styles.heroMeta}>지금 복습할 카드 {overall.due}장</Text>
        </View>
      </Panel>

      <View style={styles.summaryRow}>
        <Summary icon="today-outline" value={`${today.reviewed}장`} caption="오늘 복습" />
        <Summary icon="flame-outline" value={`${streak}일`} caption="연속 기록" tint="#F0A05B" />
        <Summary
          icon="checkmark-circle-outline"
          value={today.reviewed ? `${Math.round((today.good / today.reviewed) * 100)}%` : '—'}
          caption="오늘 정답률"
        />
      </View>

      <Panel style={styles.chartCard}>
        <Label>최근 7일 복습</Label>
        <View style={styles.chart}>
          {week.map((day) => {
            const ratio = day.reviewed / peak;
            const isToday = day.key === dateKey();

            return (
              <View key={day.key} style={styles.barColumn}>
                <Text style={styles.barValue}>{day.reviewed || ''}</Text>
                <View style={styles.barTrack}>
                  {day.reviewed > 0 ? (
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[styles.barFill, { height: `${Math.max(5, ratio * 100)}%` }]}
                    />
                  ) : (
                    <View style={styles.barEmpty} />
                  )}
                </View>
                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                  {WEEKDAYS[day.date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Panel>

      <Panel>
        <Label>덱별 암기율</Label>
        <View style={styles.deckList}>
          {state.decks.map((deck) => {
            const stats = deckStats(state, deck.id);
            return (
              <View key={deck.id} style={styles.deckRow}>
                <View style={styles.deckHead}>
                  <Text style={styles.deckName} numberOfLines={1}>
                    {deck.name}
                  </Text>
                  <Text style={styles.deckPercent}>
                    {Math.round(stats.mastery * 100)}%
                  </Text>
                </View>
                <View style={styles.deckTrack}>
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.deckFill,
                      { width: `${Math.max(2, stats.mastery * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.deckMeta}>
                  {stats.total}장 · 완전암기 {stats.mastered}장 · 오늘 {stats.due}장
                </Text>
              </View>
            );
          })}
        </View>
      </Panel>

      <Panel style={styles.tip}>
        <Ionicons name="bulb-outline" size={17} color={colors.accent} />
        <Text style={styles.tipText}>
          틀린 카드는 10분 뒤 다시, 맞힌 카드는 1일 → 3일 → 7일 → 16일 → 35일로 간격이
          늘어납니다. 잊어버릴 즈음에 다시 보는 게 가장 오래 남습니다.
        </Text>
      </Panel>
    </ScrollView>
  );
}

function Summary({ icon, value, caption, tint }) {
  return (
    <View style={styles.summary}>
      <Ionicons name={icon} size={17} color={tint || colors.accent} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 8 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  heroValue: { fontFamily: font.bold, color: colors.text, fontSize: 19 },
  heroBody: { flex: 1, gap: 3 },
  heroTitle: { color: colors.text, fontFamily: font.bold, fontSize: 18 },
  heroMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12 },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summary: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { fontFamily: font.bold, color: colors.text, fontSize: 16 },
  summaryCaption: { fontFamily: font.regular, color: colors.textFaint, fontSize: 11 },

  chartCard: { gap: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barValue: { fontFamily: font.regular, color: colors.textFaint, fontSize: 10, height: 13 },
  barTrack: {
    flex: 1,
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: radius.sm },
  barEmpty: { height: 3, backgroundColor: colors.border },
  barLabel: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 11 },
  barLabelToday: { color: colors.text },

  deckList: { marginTop: 14, gap: 16 },
  deckRow: { gap: 7 },
  deckHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deckName: { fontFamily: font.semibold, flex: 1, color: colors.text, fontSize: 14 },
  deckPercent: { fontFamily: font.bold, color: colors.accent, fontSize: 13 },
  deckTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  deckFill: { height: 6, borderRadius: radius.pill },
  deckMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 11 },

  tip: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  tipText: { fontFamily: font.regular, flex: 1, color: colors.textDim, fontSize: 12, lineHeight: 19 },
});
