import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getActiveChallenge, stopRinging, submitAnswer } from './alarmStore';
import { font, radius } from './theme';
import { useColors } from './themeStore';

// RandomCardPicker(네이티브)가 빈칸 자리를 이 문자(＿)의 반복으로 채워서 보낸다.
// 문장을 그 자리에서 잘라서, 빈칸 자리에 실제 입력칸을 문장 속에 끼워 넣는다.
function splitDisplay(display) {
  if (!display) return null;
  const match = display.match(/＿+/);
  if (!match) return { before: display, blankWidth: 4, after: '' };
  return {
    before: display.slice(0, match.index),
    blankWidth: match[0].length,
    after: display.slice(match.index + match[0].length),
  };
}

// 알람이 울릴 때(딥링크로 이 화면이 뜬다) 전체 화면을 덮는다 — 하드웨어
// 뒤로가기도 막아서, 정답을 맞히기 전엔 이 화면을 빠져나갈 방법이 없게 한다.
// (상단 알림창을 내리거나 강제종료하는 것까지는 앱이 막을 수 없다 — 다른
// 알람 앱들도 마찬가지다.)
export default function AlarmRingScreen({ onSolved }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [challenge, setChallenge] = useState(() => getActiveChallenge());
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);
  const cardScrollRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();

  const parts = useMemo(() => splitDisplay(challenge?.display), [challenge]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // 화면 전체는 안 움직이고(레이아웃 고정), 문장이 길어서 카드 안에서
  // 입력칸이 안 보일 때만 카드 내부 스크롤로 그 위치까지 보여준다.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      requestAnimationFrame(() => {
        inputRef.current?.measureLayout(
          cardScrollRef.current,
          (x, y) => cardScrollRef.current?.scrollTo({ y: Math.max(0, y - 30), animated: true }),
          () => {}
        );
      });
    });
    return () => showSub.remove();
  }, []);

  function finish() {
    Keyboard.dismiss();
    onSolved();
  }

  function handleNoQuestion() {
    stopRinging();
    finish();
  }

  async function handleSubmit() {
    if (!answer.trim()) return;
    const correct = await submitAnswer(answer);
    if (correct) {
      finish();
      return;
    }
    setWrong(true);
    setAnswer('');
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] });
  const cardMaxHeight = Math.max(180, windowHeight * 0.45);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Ionicons name="alarm" size={30} color={colors.accent} />
        <Text style={styles.title}>빈칸을 채우면 알람이 꺼져요</Text>
      </View>

      <View style={styles.middle}>
        {challenge ? (
          <Animated.View style={[styles.card, { maxHeight: cardMaxHeight, transform: [{ translateX }] }]}>
            <ScrollView
              ref={cardScrollRef}
              contentContainerStyle={styles.cardContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.sentence}>
                <Text style={styles.display}>{parts.before}</Text>
                <TextInput
                  ref={inputRef}
                  value={answer}
                  onChangeText={(t) => {
                    setAnswer(t);
                    setWrong(false);
                  }}
                  style={[
                    styles.blankInput,
                    { minWidth: Math.max(2, parts.blankWidth) * 15 },
                    wrong && styles.blankInputWrong,
                  ]}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                />
                <Text style={styles.display}>{parts.after}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        ) : (
          <Text style={styles.noCard}>등록된 카드가 없어서 문제를 낼 수 없어요.</Text>
        )}
      </View>

      <View style={styles.bottom}>
        {wrong ? <Text style={styles.wrongText}>다시 생각해보세요</Text> : null}
        <Pressable
          style={[styles.submit, challenge && !answer.trim() && styles.submitDisabled]}
          onPress={challenge ? handleSubmit : handleNoQuestion}
          disabled={!!challenge && !answer.trim()}
        >
          <Text style={styles.submitText}>알람 끄기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 28,
      paddingTop: Platform.OS === 'android' ? 40 : 60,
      paddingBottom: 24,
    },
    top: { alignItems: 'center', gap: 10, marginBottom: 14 },
    title: { fontFamily: font.bold, color: colors.text, fontSize: 20, textAlign: 'center' },

    middle: { flex: 1, justifyContent: 'flex-start', paddingTop: 10 },

    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    cardContent: { paddingVertical: 44, paddingHorizontal: 26 },
    sentence: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
    },
    display: { fontFamily: font.semibold, color: colors.text, fontSize: 22, lineHeight: 36, textAlign: 'center' },
    blankInput: {
      fontFamily: font.bold,
      color: colors.accent,
      fontSize: 22,
      lineHeight: 28,
      textAlign: 'center',
      backgroundColor: colors.surfaceHigh,
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 2,
      marginHorizontal: 4,
    },
    blankInputWrong: { borderColor: colors.danger },

    bottom: {},
    wrongText: { fontFamily: font.regular, color: colors.danger, fontSize: 13, marginBottom: 10, textAlign: 'center' },

    submit: {
      width: '100%',
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: 18,
      alignItems: 'center',
    },
    submitDisabled: { opacity: 0.4 },
    submitText: { fontFamily: font.bold, color: colors.onAccent, fontSize: 17 },

    noCard: { fontFamily: font.regular, color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  });
}
