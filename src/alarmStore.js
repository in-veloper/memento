import AlarmRing from '../modules/alarm-ring';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function getAlarms() {
  if (!AlarmRing) return [];
  try {
    return JSON.parse(AlarmRing.getAlarms() || '[]');
  } catch {
    return [];
  }
}

// days: 0(일)~6(토) 배열. 비우면 "다음 한 번만" 울리는 알람.
// alertMode: 'sound' | 'vibrate' | 'both'
export function saveAlarm({ id, hour, minute, days, enabled, alertMode }) {
  if (!AlarmRing) return null;
  return AlarmRing.saveAlarm(hour, minute, days, enabled, alertMode ?? 'sound', id ?? null);
}

export function deleteAlarm(id) {
  AlarmRing?.deleteAlarm(id);
}

export function getActiveChallenge() {
  if (!AlarmRing) return null;
  try {
    const raw = AlarmRing.getActiveChallenge();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function submitAnswer(text) {
  if (!AlarmRing) return true;
  return AlarmRing.submitAnswer(text);
}

export function stopRinging() {
  AlarmRing?.stopRinging();
}

export function formatTime(hour, minute) {
  const period = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}:${String(minute).padStart(2, '0')}`;
}

export function formatDays(days) {
  if (!days || days.length === 0) return '한 번만';
  if (days.length === 7) return '매일';
  const weekdays = [1, 2, 3, 4, 5];
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return '평일';
  return [...days].sort().map((d) => WEEKDAY_LABELS[d]).join(' ');
}
