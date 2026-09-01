import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { MAX_LEVEL } from './store';
import { colors, font, gradient, label, radius } from './theme';

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
        styles.primaryWrap,
        style,
        disabled && styles.dimmed,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={disabled ? [colors.surfaceHigh, colors.surfaceHigh] : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryBody}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={disabled ? colors.textFaint : colors.onAccent}
          />
        ) : null}
        <Text style={[styles.primaryText, disabled && { color: colors.textFaint }]}>
          {text}
        </Text>
      </LinearGradient>
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
        size={size * 0.45}
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
      {count != null && (
        <View style={[styles.chipCount, active && styles.chipCountActive]}>
          <Text style={[styles.chipCountText, active && { color: colors.onAccent }]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// 아이콘 아래쪽의 알약 다섯 개를 그대로 가져온 암기도 표시.
export function MasteryMeter({ level, size = 'md', onPress, tint }) {
  const dims = size === 'sm' ? { w: 12, h: 4, gap: 3 } : { w: 20, h: 6, gap: 5 };

  const body = (
    <View style={[styles.meter, { gap: dims.gap }]}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => (
        <View
          key={i}
          style={[
            {
              width: dims.w,
              height: dims.h,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceHigh,
            },
            i < level && { backgroundColor: tint || colors.accent },
          ]}
        />
      ))}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      {body}
    </Pressable>
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

export function Sheet({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* 시트 안에 입력칸이 있어서 키보드를 직접 피해줘야 한다. */}
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function EmptyState({ icon, title, body }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.accent} />
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: { ...label },
  dimmed: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  primaryWrap: { borderRadius: radius.pill, overflow: 'hidden' },
  primaryBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  primaryText: { fontFamily: font.bold, color: colors.onAccent, fontSize: 16 },

  iconButton: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.surfaceHigh },
  chipText: { fontFamily: font.bold, color: colors.textFaint, fontSize: 13 },
  chipTextActive: { color: colors.text },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
  },
  chipCountActive: { backgroundColor: colors.accent },
  chipCountText: { fontFamily: font.bold, color: colors.textFaint, fontSize: 11 },

  meter: { flexDirection: 'row', alignItems: 'center' },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,48,43,0.38)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginTop: 10,
    marginBottom: 14,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { fontFamily: font.bold, color: colors.text, fontSize: 19, letterSpacing: -0.3 },

  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 20 },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.bold, color: colors.text, fontSize: 17 },
  emptyBody: { fontFamily: font.regular, color: colors.textDim,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
});
