import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { dueCards, gradeCard, nextDueLabel, schedule, useStore } from './store';
import { colors, font, radius } from './theme';
import { Chip, EmptyState, MasteryMeter, PrimaryButton } from './ui';

// 글이 길수록 글자를 줄여 한 화면에 최대한 담는다.
function typeScale(text, { answer = false } = {}) {
  const length = (text || '').length;
  const steps = answer
    ? [
        [30, 22, 33],
        [80, 19, 30],
        [200, 17, 27],
        [420, 15, 24],
      ]
    : [
        [24, 33, 46],
        [60, 28, 41],
        [140, 22, 34],
        [320, 18, 29],
      ];

  for (const [limit, fontSize, lineHeight] of steps) {
    if (length <= limit) {
      return { fontSize, lineHeight, textAlign: length > 90 ? 'left' : 'center' };
    }
  }

  return {
    fontSize: answer ? 14 : 16,
    lineHeight: answer ? 22 : 26,
    textAlign: 'left',
  };
}

const GRADES = [
  { key: 'again', label: '다시', color: colors.again },
  { key: 'hard', label: '애매', color: colors.hard },
  { key: 'good', label: '완벽', color: colors.good },
];

export default function TodayScreen({ onGoDecks }) {
  const state = useStore();
  const [deckId, setDeckId] = useState(null);
  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const reveal = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(1)).current;

  const queue = useMemo(() => dueCards(state, deckId), [state, deckId]);

  const deckCounts = useMemo(() => {
    const now = Date.now();
    const counts = {};
    state.cards.forEach((c) => {
      if (c.due <= now) counts[c.deckId] = (counts[c.deckId] || 0) + 1;
    });
    return counts;
  }, [state.cards]);

  const startSession = useCallback(() => {
    setSession(queue.map((c) => c.id));
    setIndex(0);
    setDone(0);
    setRevealed(false);
    reveal.setValue(0);
  }, [queue, reveal]);

  useEffect(() => {
    setSession([]);
    setIndex(0);
    setDone(0);
    setRevealed(false);
    reveal.setValue(0);
  }, [deckId, reveal]);

  const card = state.cards.find((c) => c.id === session[index]) || null;
  const deck = card ? state.decks.find((d) => d.id === card.deckId) : null;
  const hasBack = Boolean(card && card.back);

  const showAnswer = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    Haptics.selectionAsync().catch(() => {});

    Animated.timing(reveal, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealed, reveal]);

  const grade = useCallback(
    (key) => {
      if (!card) return;

      Haptics.impactAsync(
        key === 'good'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});

      gradeCard(card.id, key);
      setSession((prev) => (key === 'again' ? [...prev, card.id] : prev));
      setDone((prev) => prev + 1);

      Animated.sequence([
        Animated.timing(enter, {
          toValue: 0,
          duration: 110,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(enter, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setRevealed(false);
        reveal.setValue(0);
        setIndex((prev) => prev + 1);
      }, 110);
    },
    [card, enter, reveal]
  );

  if (state.cards.length === 0) {
    return (
      <EmptyState
        icon="albums-outline"
        title="아직 카드가 없습니다"
        body={'덱 탭에서 과목을 만들고 카드를 추가하면\n오늘 외울 카드가 여기 모입니다.'}
      />
    );
  }

  if (!card) {
    const finished = session.length > 0;
    const waiting = queue.length > 0;

    return (
      <View style={styles.notice}>
        <View style={styles.noticeMark}>
          <Ionicons
            name={finished ? 'checkmark-done' : waiting ? 'sparkles' : 'moon-outline'}
            size={26}
            color={colors.accent}
          />
        </View>
        <Text style={styles.noticeTitle}>
          {finished
            ? `${done}장 복습 완료`
            : waiting
            ? `오늘 외울 카드 ${queue.length}장`
            : '지금 볼 카드가 없습니다'}
        </Text>
        <Text style={styles.noticeBody}>
          {finished
            ? '다음 복습은 간격에 맞춰 다시 올라옵니다.'
            : waiting
            ? '덜 외운 카드부터 먼저 나옵니다.'
            : '모두 복습 간격 안에 있습니다. 카드를 더 넣거나 나중에 다시 오세요.'}
        </Text>

        {finished || waiting ? (
          <PrimaryButton
            icon={finished ? 'refresh' : 'play'}
            text={finished ? '한 번 더 돌기' : '시작하기'}
            onPress={startSession}
            style={styles.noticeButton}
          />
        ) : (
          <Pressable onPress={onGoDecks} style={styles.linkButton}>
            <Text style={styles.linkText}>덱 관리로 가기</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const progress = session.length ? done / session.length : 0;

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip text="전체" active={deckId === null} onPress={() => setDeckId(null)} />
          {state.decks.map((d) => (
            <Chip
              key={d.id}
              text={d.name}
              active={deckId === d.id}
              count={deckCounts[d.id] || 0}
              onPress={() => setDeckId(d.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {done} / {session.length}
        </Text>
      </View>

      {/* 아이콘처럼 카드가 겹쳐 쌓인 모습. 맨 앞 카드만 flex 로 공간을 채운다. */}
      <View style={styles.stack}>
        <View style={styles.ghostBack} />
        <View style={styles.ghostFront} />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: enter,
              transform: [
                {
                  scale: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.cardPress} onPress={showAnswer}>
            <View style={styles.cardHead}>
              <Text style={styles.deckTag}>{deck?.name || '미분류'}</Text>
              <MasteryMeter level={card.level} size="sm" />
            </View>

            <ScrollView
              style={styles.cardScrollView}
              contentContainerStyle={styles.cardScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.question, typeScale(card.front)]}>{card.front}</Text>

              {revealed && hasBack && (
                <Animated.View
                  style={[
                    styles.answerBlock,
                    {
                      opacity: reveal,
                      transform: [
                        {
                          translateY: reveal.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.rule} />
                  <Text style={[styles.answer, typeScale(card.back, { answer: true })]}>
                    {card.back}
                  </Text>
                </Animated.View>
              )}
            </ScrollView>

            <Text style={styles.cardHint}>
              {revealed || !hasBack
                ? card.reps > 0
                  ? `${card.reps}번째 복습`
                  : '첫 복습'
                : '탭하면 답이 나옵니다'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {revealed || !hasBack ? (
        <View style={styles.gradeRow}>
          {GRADES.map((g) => {
            const preview = schedule(card, g.key);
            return (
              <Pressable
                key={g.key}
                onPress={() => grade(g.key)}
                style={({ pressed }) => [
                  styles.gradeButton,
                  pressed && { backgroundColor: colors.surfaceHigh },
                ]}
              >
                <View style={[styles.gradeDot, { backgroundColor: g.color }]} />
                <Text style={[styles.gradeLabel, { color: g.color }]}>{g.label}</Text>
                <Text style={styles.gradeHint}>{nextDueLabel({ due: preview.due })}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <PrimaryButton icon="eye-outline" text="답 보기" onPress={showAnswer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12 },

  topRow: { flexDirection: 'row', alignItems: 'center' },
  chipRow: { gap: 8, paddingRight: 4 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: radius.pill, backgroundColor: colors.accent },
  progressText: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 12 },

  stack: { flex: 1, paddingBottom: 12 },
  ghostBack: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 14,
    bottom: 0,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  ghostFront: {
    position: 'absolute',
    left: 11,
    right: 11,
    top: 7,
    bottom: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    opacity: 0.8,
  },

  card: {
    flex: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentLine,
    elevation: 8,
    shadowColor: colors.accent,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  cardPress: { flex: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16 },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckTag: {
    fontFamily: font.bold,
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 1.4,
  },

  cardScrollView: { flex: 1 },
  cardScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  question: { fontFamily: font.semibold, color: colors.text, letterSpacing: -0.4 },

  answerBlock: { marginTop: 22, alignItems: 'center' },
  rule: {
    width: 40,
    height: 1,
    backgroundColor: colors.lineStrong,
    marginBottom: 18,
  },
  answer: { fontFamily: font.regular, color: colors.textDim },

  cardHint: {
    fontFamily: font.regular,
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
  },

  gradeRow: { flexDirection: 'row', gap: 9 },
  gradeButton: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  gradeDot: { width: 7, height: 7, borderRadius: radius.pill },
  gradeLabel: { fontFamily: font.bold, fontSize: 14 },
  gradeHint: { fontFamily: font.regular, color: colors.textFaint, fontSize: 10 },

  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 24 },
  noticeMark: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDim,
    marginBottom: 6,
  },
  noticeTitle: { fontFamily: font.bold, color: colors.text, fontSize: 20, letterSpacing: -0.4 },
  noticeBody: {
    fontFamily: font.regular,
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  noticeButton: { marginTop: 18, alignSelf: 'stretch' },
  linkButton: { marginTop: 14, paddingVertical: 10 },
  linkText: { fontFamily: font.bold, color: colors.accent, fontSize: 14 },
});
