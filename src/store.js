import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DATA_KEY = 'memento/data';
const HISTORY_KEY = 'memento/history';
const SETTINGS_KEY = 'memento/settings';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const MAX_LEVEL = 5;

// 간격 반복(Leitner) — 잘 외운 카드는 간격을 늘리고, 틀린 카드는 곧바로 다시 돌린다.
// 레벨이 곧 "얼마나 외웠는지"이자 다음에 다시 볼 때까지의 간격이다.
const INTERVALS = [10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];

export const DEFAULT_SETTINGS = {
  dailyLimit: 60,
  frontFirst: true,
};

const initial = {
  loaded: false,
  decks: [],
  cards: [],
  history: {},
  settings: DEFAULT_SETTINGS,
};

let state = initial;
const listeners = new Set();

function emit(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore() {
  return useSyncExternalStore(subscribe, () => state);
}

export function getState() {
  return state;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.multiSet([
      [DATA_KEY, JSON.stringify({ decks: state.decks, cards: state.cards })],
      [HISTORY_KEY, JSON.stringify(state.history)],
      [SETTINGS_KEY, JSON.stringify(state.settings)],
    ]).catch(() => {});
  }, 250);
}

export async function init() {
  try {
    const [[, data], [, history], [, settings]] = await AsyncStorage.multiGet([
      DATA_KEY,
      HISTORY_KEY,
      SETTINGS_KEY,
    ]);

    const parsed = data ? JSON.parse(data) : { decks: [], cards: [] };

    emit({
      loaded: true,
      decks: parsed.decks || [],
      cards: parsed.cards || [],
      history: history ? JSON.parse(history) : {},
      settings: settings
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) }
        : DEFAULT_SETTINGS,
    });
  } catch {
    emit({ loaded: true });
  }
}

/* ---------- 덱 ---------- */

export function addDeck(name) {
  const clean = (name || '').trim();
  if (!clean) return null;

  const deck = { id: newId(), name: clean, createdAt: Date.now() };
  emit({ decks: [...state.decks, deck] });
  persist();
  return deck;
}

export function renameDeck(id, name) {
  const clean = (name || '').trim();
  if (!clean) return;

  emit({
    decks: state.decks.map((d) => (d.id === id ? { ...d, name: clean } : d)),
  });
  persist();
}

export function deleteDeck(id) {
  emit({
    decks: state.decks.filter((d) => d.id !== id),
    cards: state.cards.filter((c) => c.deckId !== id),
  });
  persist();
}

/* ---------- 카드 ---------- */

function blankCard(deckId, front, back) {
  return {
    id: newId(),
    deckId,
    front: front.trim(),
    // 뒷면은 선택. 비워두면 한 면짜리 카드로 그냥 읽고 넘긴다.
    back: (back || '').trim(),
    level: 0,
    due: 0, // 0 이면 아직 한 번도 안 본 카드 — 바로 오늘 대상이 된다.
    reps: 0,
    lapses: 0,
    createdAt: Date.now(),
    lastReviewedAt: null,
  };
}

export function addCard(deckId, front, back) {
  if (!front.trim()) return null;

  const card = blankCard(deckId, front, back);
  emit({ cards: [...state.cards, card] });
  persist();
  return card;
}

// "앞면 / 뒷면" 여러 줄을 한 번에 넣는다. 구분자는 탭, 콤마, 세미콜론, 대시.
export function addCardsFromText(deckId, text) {
  const rows = (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const made = [];
  for (const row of rows) {
    const match = row.split(/\t|\s+[-–—]\s+|\s*[;:]\s+|\s*,\s{1,}/);

    // 구분자가 없는 줄은 앞면만 있는 카드로 넣는다.
    const front = match[0];
    const back = match.length > 1 ? match.slice(1).join(' ') : '';
    if (!front.trim()) continue;

    made.push(blankCard(deckId, front, back));
  }

  if (made.length) {
    emit({ cards: [...state.cards, ...made] });
    persist();
  }

  return made.length;
}

export function updateCard(id, patch) {
  emit({
    cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
  persist();
}

export function deleteCard(id) {
  emit({ cards: state.cards.filter((c) => c.id !== id) });
  persist();
}

export function resetCard(id) {
  updateCard(id, { level: 0, due: 0, reps: 0, lapses: 0, lastReviewedAt: null });
}

/* ---------- 복습 ---------- */

export function schedule(card, grade) {
  const now = Date.now();

  if (grade === 'again') {
    const level = Math.max(0, card.level - 1);
    return {
      level,
      due: now + 10 * MINUTE,
      reps: card.reps + 1,
      lapses: card.lapses + 1,
      lastReviewedAt: now,
    };
  }

  if (grade === 'hard') {
    return {
      level: card.level,
      due: now + Math.max(10 * MINUTE, INTERVALS[card.level] * 0.5),
      reps: card.reps + 1,
      lapses: card.lapses,
      lastReviewedAt: now,
    };
  }

  const level = Math.min(MAX_LEVEL, card.level + 1);
  return {
    level,
    due: now + INTERVALS[level],
    reps: card.reps + 1,
    lapses: card.lapses,
    lastReviewedAt: now,
  };
}

export function gradeCard(id, grade) {
  const card = state.cards.find((c) => c.id === id);
  if (!card) return;

  const patch = schedule(card, grade);
  const key = dateKey();
  const day = state.history[key] || { reviewed: 0, again: 0, good: 0 };

  emit({
    cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    history: {
      ...state.history,
      [key]: {
        reviewed: day.reviewed + 1,
        again: day.again + (grade === 'again' ? 1 : 0),
        good: day.good + (grade === 'good' ? 1 : 0),
      },
    },
  });

  persist();
}

export function updateSettings(patch) {
  emit({ settings: { ...state.settings, ...patch } });
  persist();
}

/* ---------- 조회 ---------- */

// 오늘 볼 카드: 기한이 된 것부터, 덜 외운 것(레벨 낮은 것) 우선.
export function dueCards(snapshot, deckId = null) {
  const now = Date.now();

  return snapshot.cards
    .filter((c) => (deckId ? c.deckId === deckId : true))
    .filter((c) => c.due <= now)
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.due - b.due;
    })
    .slice(0, snapshot.settings.dailyLimit);
}

export function deckStats(snapshot, deckId) {
  const cards = snapshot.cards.filter((c) => c.deckId === deckId);
  const now = Date.now();

  const levelSum = cards.reduce((sum, c) => sum + c.level, 0);
  const due = cards.filter((c) => c.due <= now).length;
  const fresh = cards.filter((c) => c.reps === 0).length;

  return {
    total: cards.length,
    due,
    fresh,
    mastered: cards.filter((c) => c.level >= MAX_LEVEL).length,
    mastery: cards.length ? levelSum / (cards.length * MAX_LEVEL) : 0,
  };
}

export function overallStats(snapshot) {
  const now = Date.now();
  const cards = snapshot.cards;
  const levelSum = cards.reduce((sum, c) => sum + c.level, 0);

  return {
    total: cards.length,
    due: cards.filter((c) => c.due <= now).length,
    mastered: cards.filter((c) => c.level >= MAX_LEVEL).length,
    mastery: cards.length ? levelSum / (cards.length * MAX_LEVEL) : 0,
  };
}

export function lastDays(history, count = 7) {
  const days = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dateKey(date);
    days.push({ key, date, ...(history[key] || { reviewed: 0, again: 0, good: 0 }) });
  }
  return days;
}

export function streakOf(history) {
  const today = new Date();
  let count = 0;

  for (let i = 0; i < 400; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const day = history[dateKey(date)];

    if (day && day.reviewed > 0) count += 1;
    else if (i > 0) break;
  }

  return count;
}

export function nextDueLabel(card) {
  const diff = card.due - Date.now();
  if (diff <= 0) return '지금';

  const days = Math.round(diff / DAY);
  if (days >= 1) return `${days}일 뒤`;

  const minutes = Math.round(diff / MINUTE);
  if (minutes >= 60) return `${Math.round(minutes / 60)}시간 뒤`;
  return `${Math.max(1, minutes)}분 뒤`;
}
