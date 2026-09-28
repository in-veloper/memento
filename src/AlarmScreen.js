import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  WEEKDAY_LABELS,
  deleteAlarm,
  formatDays,
  formatTime,
  getAlarms,
  saveAlarm,
} from './alarmStore';
import { font, radius } from './theme';
import { useColors } from './themeStore';
import { EmptyState, GhostButton, Panel, PrimaryButton, Sheet } from './ui';

const ALERT_MODES = [
  { key: 'sound', label: '소리', icon: 'volume-high-outline' },
  { key: 'vibrate', label: '진동', icon: 'phone-portrait-outline' },
  { key: 'both', label: '소리+진동', icon: 'notifications-outline' },
];

function useAlarmStyles() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}

function clampHour(h) {
  return ((h % 24) + 24) % 24;
}
function clampMinute(m) {
  return ((m % 60) + 60) % 60;
}

// 한 번 누르면 한 칸, 누르고 있으면(길게) 계속 올라간다 — 시계 앱들의
// 표준 동작. 처음엔 살짝 뜸을 두고(400ms), 그 다음부턴 빠르게(80ms) 반복한다.
function useHoldRepeat(onTick) {
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const clear = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
  }, []);

  const start = useCallback(() => {
    onTickRef.current();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => onTickRef.current(), 80);
    }, 400);
  }, []);

  useEffect(() => clear, [clear]);

  return { onPressIn: start, onPressOut: clear };
}

function StepButton({ direction, onStep }) {
  const { colors, styles } = useAlarmStyles();
  const hold = useHoldRepeat(onStep);
  return (
    <Pressable {...hold} hitSlop={12} style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
      <Ionicons name={direction === 'up' ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textDim} />
    </Pressable>
  );
}

function Stepper({ value, onChange, format, step = 1, wrap }) {
  const { styles } = useAlarmStyles();
  return (
    <View style={styles.stepper}>
      <StepButton direction="up" onStep={() => onChange(wrap(value + step))} />
      <Text style={styles.stepperValue}>{format(value)}</Text>
      <StepButton direction="down" onStep={() => onChange(wrap(value - step))} />
    </View>
  );
}

// 오전/오후도 다른 숫자칸과 똑같이 위아래 화살표로 — 시계 앱들이 보통 그렇다.
function AmPmStepper({ hour, onChange }) {
  const { styles } = useAlarmStyles();
  const label = hour < 12 ? '오전' : '오후';
  const toggle = () => onChange(clampHour(hour < 12 ? hour + 12 : hour - 12));
  return (
    <View style={styles.stepper}>
      <StepButton direction="up" onStep={toggle} />
      <Text style={styles.periodValue}>{label}</Text>
      <StepButton direction="down" onStep={toggle} />
    </View>
  );
}

function AlarmEditor({ visible, initial, onClose, onSaved, onDeleted }) {
  const { colors, styles } = useAlarmStyles();
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [alertMode, setAlertMode] = useState('sound');

  useEffect(() => {
    if (!visible) return;
    setHour(initial?.hour ?? 7);
    setMinute(initial?.minute ?? 0);
    setDays(initial?.days ?? []);
    setEnabled(initial?.enabled ?? true);
    setAlertMode(initial?.alertMode ?? 'sound');
  }, [visible, initial]);

  function toggleDay(d) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function submit() {
    saveAlarm({ id: initial?.id, hour, minute, days, enabled, alertMode });
    onSaved();
  }

  return (
    <Sheet visible={visible} title={initial ? '알람 수정' : '새 알람'} onClose={onClose}>
      <View style={styles.timeRow}>
        <AmPmStepper hour={hour} onChange={setHour} />
        <Stepper value={hour} onChange={setHour} wrap={clampHour} format={(h) => String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')} />
        <Text style={styles.colon}>:</Text>
        <Stepper value={minute} onChange={setMinute} wrap={clampMinute} step={1} format={(m) => String(m).padStart(2, '0')} />
      </View>

      <Text style={styles.label}>반복 요일</Text>
      <View style={styles.dayRow}>
        {WEEKDAY_LABELS.map((label, i) => {
          const active = days.includes(i);
          return (
            <Pressable key={i} onPress={() => toggleDay(i)} style={[styles.dayChip, active && styles.dayChipActive]}>
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>요일을 아무것도 안 고르면 다음 한 번만 울려요.</Text>

      <Text style={styles.label}>알림 방식</Text>
      <View style={styles.alertRow}>
        {ALERT_MODES.map((m) => {
          const active = alertMode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setAlertMode(m.key)}
              style={[styles.alertChip, active && styles.alertChipActive]}
            >
              <Ionicons name={m.icon} size={18} color={active ? colors.onAccent : colors.textDim} />
              <Text style={[styles.alertChipText, active && styles.alertChipTextActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton text="저장" onPress={submit} style={{ marginTop: 20 }} />

      {initial ? (
        <GhostButton
          text="이 알람 삭제"
          icon="trash-outline"
          onPress={() => {
            deleteAlarm(initial.id);
            onDeleted();
          }}
          style={{ marginTop: 10, backgroundColor: 'transparent' }}
        />
      ) : null}
    </Sheet>
  );
}

export default function AlarmScreen() {
  const { colors, styles } = useAlarmStyles();
  const [alarms, setAlarms] = useState([]);
  const [editing, setEditing] = useState(undefined); // undefined: 닫힘, null: 새로 만들기, object: 수정

  const refresh = useCallback(() => setAlarms(getAlarms()), []);

  useEffect(() => {
    refresh();
    // 안드로이드 13+ 는 알림을 앱이 직접 권한을 받아야 띄울 수 있다 — 이게
    // 없으면 알람이 울려도 전체화면 알림이 조용히 안 뜬다.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
    }
  }, [refresh]);

  function close() {
    setEditing(undefined);
    refresh();
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {alarms.length === 0 ? (
          <EmptyState
            icon="alarm-outline"
            title="빈칸 알람이 없어요"
            body={'알람이 울리면 메멘토 카드 중 하나가\n빈칸으로 나와요. 맞혀야 꺼져요.'}
          />
        ) : (
          alarms
            .slice()
            .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
            .map((alarm) => (
              <Pressable key={alarm.id} onPress={() => setEditing(alarm)}>
                <Panel style={[styles.alarmPanel, !alarm.enabled && styles.alarmPanelOff]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alarmTime, !alarm.enabled && styles.dim]}>
                      {formatTime(alarm.hour, alarm.minute)}
                    </Text>
                    <Text style={styles.alarmDays}>{formatDays(alarm.days)}</Text>
                  </View>
                  <Switch
                    value={alarm.enabled}
                    onValueChange={(v) => {
                      saveAlarm({ ...alarm, enabled: v });
                      refresh();
                    }}
                    trackColor={{ false: colors.surfaceHigh, true: colors.accentDim }}
                    thumbColor={alarm.enabled ? colors.accent : colors.textFaint}
                  />
                </Panel>
              </Pressable>
            ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setEditing(null)}>
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </Pressable>

      <AlarmEditor
        visible={editing !== undefined}
        initial={editing}
        onClose={close}
        onSaved={close}
        onDeleted={close}
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 100, gap: 12 },

  alarmPanel: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  alarmPanelOff: { opacity: 0.55 },
  alarmTime: { fontFamily: font.bold, color: colors.text, fontSize: 24, letterSpacing: -0.5 },
  alarmDays: { fontFamily: font.regular, color: colors.textDim, fontSize: 13, marginTop: 4 },
  dim: { color: colors.textFaint },

  fab: {
    position: 'absolute',
    right: 4,
    bottom: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 },
  colon: { fontFamily: font.bold, color: colors.text, fontSize: 34 },
  stepper: { alignItems: 'center', gap: 0 },
  stepBtn: { padding: 6, borderRadius: radius.sm },
  stepBtnPressed: { backgroundColor: colors.surfaceHigh },
  stepperValue: { fontFamily: font.bold, color: colors.text, fontSize: 40, letterSpacing: -1, minWidth: 64, textAlign: 'center' },
  periodValue: { fontFamily: font.bold, color: colors.accent, fontSize: 17, minWidth: 48, textAlign: 'center' },

  label: { fontFamily: font.bold, letterSpacing: 1.6, color: colors.textFaint, fontSize: 11, marginTop: 22, marginBottom: 10 },
  dayRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  dayChipActive: { backgroundColor: colors.accent },
  dayChipText: { fontFamily: font.semibold, color: colors.textDim, fontSize: 14 },
  dayChipTextActive: { color: colors.onAccent },
  hint: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12, marginTop: 10 },

  alertRow: { flexDirection: 'row', gap: 8 },
  alertChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  alertChipActive: { backgroundColor: colors.accent },
  alertChipText: { fontFamily: font.semibold, color: colors.textDim, fontSize: 12 },
  alertChipTextActive: { color: colors.onAccent },
  });
}
