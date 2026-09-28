import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { MAX_LEVEL } from './store';
import { font, radius } from './theme';
import { useColors } from './themeStore';

function useUIStyles() {
  const colors = useColors();
  return useMemo(() => createStyles(colors), [colors]);
}

export function Panel({ style, children }) {
  const styles = useUIStyles();
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Label({ children, style }) {
  const styles = useUIStyles();
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function PrimaryButton({ icon, text, onPress, disabled, style }) {
  const colors = useColors();
  const styles = useUIStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        style,
        disabled && styles.dimmed,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? colors.textFaint : colors.onAccent}
        />
      ) : null}
      <Text style={[styles.primaryText, disabled && { color: colors.textFaint }]}>
        {text}
      </Text>
    </Pressable>
  );
}

export function GhostButton({ icon, text, onPress, style }) {
  const colors = useColors();
  const styles = useUIStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ghost, style, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={17} color={colors.accent} /> : null}
      <Text style={styles.ghostText}>{text}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, size = 42, tint, disabled }) {
  const colors = useColors();
  const styles = useUIStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size },
        disabled && styles.dimmed,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={size * 0.44}
        color={disabled ? colors.textFaint : tint || colors.textDim}
      />
    </Pressable>
  );
}

export function Chip({ text, active, onPress, count }) {
  const styles = useUIStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
      {count > 0 && (
        <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
      )}
    </Pressable>
  );
}

// 아이콘 아래쪽 알약 다섯 개를 그대로 가져온 암기도 표시.
export function MasteryMeter({ level, size = 'md' }) {
  const colors = useColors();
  const dims = size === 'sm' ? { w: 13, h: 4, gap: 3 } : { w: 22, h: 5, gap: 5 };

  return (
    <View style={[styles.meter, { gap: dims.gap }]}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => (
        <View
          key={i}
          style={[
            {
              width: dims.w,
              height: dims.h,
              borderRadius: radius.pill,
              backgroundColor: colors.lineStrong,
            },
            i < level && { backgroundColor: colors.accent },
          ]}
        />
      ))}
    </View>
  );
}

export function ProgressRing({ size = 44, stroke = 5, value, tint, children }) {
  const colors = useColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value || 0));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceHigh}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint || colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Bar({ value, tint, height = 6 }) {
  const colors = useColors();
  const styles = useUIStyles();
  return (
    <View style={[styles.barTrack, { height, borderRadius: height }]}>
      <View
        style={{
          height,
          borderRadius: height,
          width: `${Math.max(2, Math.min(100, (value || 0) * 100))}%`,
          backgroundColor: tint || colors.accent,
        }}
      />
    </View>
  );
}

const DURATION_UNITS = [
  { key: 'm', text: '분', minutes: 1 },
  { key: 'h', text: '시간', minutes: 60 },
  { key: 'd', text: '일', minutes: 1440 },
];

function unitFor(minutes) {
  if (minutes >= 1440 && minutes % 1440 === 0) return 'd';
  if (minutes >= 60 && minutes % 60 === 0) return 'h';
  return 'm';
}

// 숫자 입력 + 분/시간/일 단위 선택 — 복습 간격처럼 "N 분/시간/일" 형태의
// 값을 사용자가 직접 정하게 할 때 쓴다. 항상 분 단위 정수로 값을 주고받는다.
export function DurationInput({ label, minutes, onChange }) {
  const colors = useColors();
  const styles = useUIStyles();
  const [unit, setUnit] = useState(() => unitFor(minutes));
  const unitMinutes = DURATION_UNITS.find((u) => u.key === unit).minutes;
  const [text, setText] = useState(() => String(Math.max(1, Math.round(minutes / unitMinutes))));

  // 바깥(다른 화면·초기 로드)에서 값이 바뀌면 표시를 다시 맞춘다.
  useEffect(() => {
    const u = unitFor(minutes);
    const um = DURATION_UNITS.find((x) => x.key === u).minutes;
    setUnit(u);
    setText(String(Math.max(1, Math.round(minutes / um))));
  }, [minutes]);

  function commit(nextText, nextUnit) {
    const um = DURATION_UNITS.find((u2) => u2.key === nextUnit).minutes;
    const n = Math.max(1, parseInt(nextText, 10) || 1);
    onChange(n * um);
  }

  return (
    <View style={styles.durationRow}>
      <Text style={styles.durationLabel}>{label}</Text>
      <View style={styles.durationControls}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9]/g, '').slice(0, 4);
            setText(clean);
            if (clean) commit(clean, unit);
          }}
          onEndEditing={() => {
            if (!text) {
              setText('1');
              commit('1', unit);
            }
          }}
          keyboardType="number-pad"
          style={styles.durationInput}
          selectionColor={colors.accent}
        />
        <View style={styles.durationUnits}>
          {DURATION_UNITS.map((u) => (
            <Pressable
              key={u.key}
              onPress={() => {
                setUnit(u.key);
                commit(text || '1', u.key);
              }}
              style={[styles.durationUnitBtn, unit === u.key && styles.durationUnitBtnActive]}
            >
              <Text
                style={[styles.durationUnitText, unit === u.key && styles.durationUnitTextActive]}
              >
                {u.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export function Sheet({ visible, title, onClose, children }) {
  const colors = useColors();
  const styles = useUIStyles();
  const translateY = useRef(new Animated.Value(0)).current;
  const [keyboard, setKeyboard] = useState(0);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 시트는 Modal 안에 있어서 바깥의 KeyboardAvoidingView 가 닿지 않는다.
  // 키보드 높이를 직접 받아 그만큼 시트를 밀어 올린다.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboard(e.endCoordinates?.height || 0)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const dismissRef = useRef(null);
  dismissRef.current = () => {
    Animated.timing(translateY, {
      toValue: 800,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      closeRef.current?.();
    });
  };

  // 손잡이 띠에서 터치가 시작되면 이 제스처를 확실히 가져간다.
  // 네이티브 드라이버를 쓰면 드래그 중 setValue 가 화면에 반영되지 않아 끄고 쓴다.
  const drag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },

      onPanResponderRelease: (_, g) => {
        // 끌어내렸거나 손잡이를 그냥 탭했을 때도 닫는다.
        if (g.dy > 90 || g.vy > 0.7 || Math.abs(g.dy) < 6) {
          dismissRef.current();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 2,
        }).start();
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 2,
        }).start();
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              marginBottom: keyboard,
              // 키보드가 올라오면 시트가 화면 위로 넘치지 않게 높이를 줄인다.
              maxHeight: keyboard > 0 ? "60%" : "88%",
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragZone} {...drag.panHandlers}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </Pressable>
          </View>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function EmptyState({ icon, title, body }) {
  const colors = useColors();
  const styles = useUIStyles();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 18,
    },
    label: {
      fontFamily: font.bold,
      fontSize: 11,
      letterSpacing: 1.6,
      color: colors.textFaint,
    },
    dimmed: { opacity: 0.4 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

    primary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 17,
      paddingHorizontal: 22,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    primaryText: { fontFamily: font.bold, color: colors.onAccent, fontSize: 16 },

    ghost: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 15,
      borderRadius: radius.md,
      backgroundColor: colors.accentDim,
    },
    ghostText: { fontFamily: font.bold, color: colors.accent, fontSize: 14 },

    iconButton: {
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHigh,
    },

    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.accentDim },
    chipText: { fontFamily: font.semibold, color: colors.textDim, fontSize: 13 },
    chipTextActive: { color: colors.accent },
    chipCount: { fontFamily: font.bold, color: colors.textFaint, fontSize: 11 },
    chipCountActive: { color: colors.accent },

    meter: { flexDirection: 'row', alignItems: 'center' },

    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    durationLabel: { fontFamily: font.semibold, color: colors.text, fontSize: 14 },
    durationControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    durationInput: {
      width: 48,
      paddingVertical: 8,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceHigh,
      textAlign: 'center',
      fontFamily: font.bold,
      color: colors.text,
      fontSize: 15,
    },
    durationUnits: {
      flexDirection: 'row',
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceHigh,
      padding: 3,
      gap: 2,
    },
    durationUnitBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
    durationUnitBtnActive: { backgroundColor: colors.accent },
    durationUnitText: { fontFamily: font.semibold, color: colors.textDim, fontSize: 12 },
    durationUnitTextActive: { color: colors.onAccent },

    barTrack: { width: '100%', backgroundColor: colors.surfaceHigh, overflow: 'hidden' },

    sheetRoot: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    dragZone: { height: 38, alignItems: 'center', justifyContent: 'center' },
    grabber: {
      width: 46,
      height: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.lineStrong,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sheetTitle: { fontFamily: font.bold, color: colors.text, fontSize: 19, letterSpacing: -0.4 },

    empty: { alignItems: 'center', gap: 9, paddingTop: 64, paddingHorizontal: 24 },
    emptyIcon: {
      width: 66,
      height: 66,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentDim,
      marginBottom: 6,
    },
    emptyTitle: { fontFamily: font.bold, color: colors.text, fontSize: 17, letterSpacing: -0.3 },
    emptyBody: {
      fontFamily: font.regular,
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'center',
    },
  });
}

// MasteryMeter 는 컬러 훅 하나로 충분해서 별도 styles 훅 없이 이 모듈 스코프 상수를 그대로 쓴다.
const styles = StyleSheet.create({
  meter: { flexDirection: 'row', alignItems: 'center' },
});
