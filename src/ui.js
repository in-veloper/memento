import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { MAX_LEVEL } from './store';
import { colors, font, label, radius } from './theme';

export function Panel({ style, children }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function PrimaryButton({ icon, text, onPress, disabled, style }) {
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

export function Sheet({ visible, title, onClose, children }) {
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
      translateY.setValue(0);
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

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
  },
  label: { ...label },
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
  chipTextActive: { color: colors.accentSoft },
  chipCount: { fontFamily: font.bold, color: colors.textFaint, fontSize: 11 },
  chipCountActive: { color: colors.accent },

  meter: { flexDirection: 'row', alignItems: 'center' },

  barTrack: { width: '100%', backgroundColor: colors.surfaceHigh, overflow: 'hidden' },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.66)' },
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
