import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  dateKey,
  deckStats,
  lastDays,
  overallStats,
  streakOf,
  useStore,
} from './store';
import { colors, font, radius } from './theme';
import { Bar, EmptyState, Label, Panel } from './ui';

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
        <Label>전체 암기율</Label>

        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>{Math.round(overall.mastery * 100)}</Text>
          <Text style={styles.heroPercent}>%</Text>
        </View>

        <Bar value={overall.mastery} height={8} />

        <Text style={styles.heroMeta}>
          카드 {overall.total}장 중 완전암기 {overall.mastered}장 · 지금 복습할 카드{' '}
          {overall.due}장
        </Text>
      </Panel>

      <View style={styles.summaryRow}>
        <Summary value={`${today.reviewed}`} unit="장" caption="오늘 복습" />
        <Summary value={`${streak}`} unit="일" caption="연속 기록" tint={colors.accent} />
        <Summary
          value={today.reviewed ? `${Math.round((today.good / today.reviewed) * 100)}` : '—'}
          unit={today.reviewed ? '%' : ''}
          caption="오늘 정답률"
          tint={colors.good}
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
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: day.reviewed > 0 ? `${Math.max(5, ratio * 100)}%` : 3,
                        backgroundColor:
                          day.reviewed > 0
                            ? isToday
                              ? colors.accent
                              : colors.accentLine
                            : colors.line,
                      },
                    ]}
                  />
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
                <Bar value={stats.mastery} />
                <Text style={styles.deckMeta}>
                  {stats.total}장 · 완전암기 {stats.mastered}장 · 오늘 {stats.due}장
                </Text>
              </View>
            );
          })}
        </View>
      </Panel>

      <View style={styles.tip}>
        <Ionicons name="bulb-outline" size={16} color={colors.accent} />
        <Text style={styles.tipText}>
          틀린 카드는 10분 뒤 다시, 맞힌 카드는 1일 → 3일 → 7일 → 16일 → 35일로 간격이
          늘어납니다. 잊어버릴 즈음에 다시 보는 게 가장 오래 남습니다.
        </Text>
      </View>
    </ScrollView>
  );
}

function Summary({ value, unit, caption, tint }) {
  return (
    <View style={styles.summary}>
      <View style={styles.summaryValueRow}>
        <Text style={[styles.summaryValue, tint && { color: tint }]}>{value}</Text>
        {unit ? <Text style={styles.summaryUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.summaryCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 8 },

  hero: { gap: 12 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: -2 },
  heroValue: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 44,
    letterSpacing: -2,
  },
  heroPercent: { fontFamily: font.semibold, color: colors.textDim, fontSize: 20 },
  heroMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12, lineHeight: 18 },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summary: {
    flex: 1,
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  summaryValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  summaryValue: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 22,
    letterSpacing: -0.8,
  },
  summaryUnit: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 12 },
  summaryCaption: { fontFamily: font.regular, color: colors.textFaint, fontSize: 11 },

  chartCard: { gap: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 128 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barValue: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 10, height: 13 },
  barTrack: {
    flex: 1,
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: radius.sm },
  barLabel: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 11 },
  barLabelToday: { color: colors.accent },

  deckList: { marginTop: 16, gap: 18 },
  deckRow: { gap: 8 },
  deckHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deckName: { flex: 1, fontFamily: font.semibold, color: colors.text, fontSize: 14 },
  deckPercent: { fontFamily: font.bold, color: colors.accent, fontSize: 13 },
  deckMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 11 },

  tip: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: font.regular,
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 19,
  },
});
