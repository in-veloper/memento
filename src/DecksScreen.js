import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  MAX_LEVEL,
  addCard,
  addCardsFromText,
  addDeck,
  deckStats,
  deleteCard,
  deleteDeck,
  nextDueLabel,
  renameDeck,
  updateCard,
  useStore,
} from './store';
import { colors, font, radius } from './theme';
import {
  Chip,
  EmptyState,
  IconButton,
  Label,
  MasteryMeter,
  Panel,
  PrimaryButton,
  ProgressRing,
  Sheet,
} from './ui';

export default function DecksScreen() {
  const state = useStore();
  const [openId, setOpenId] = useState(null);

  const [deckSheet, setDeckSheet] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [renaming, setRenaming] = useState(null);

  const [cardSheet, setCardSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [level, setLevel] = useState(0);

  const [bulkSheet, setBulkSheet] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const deck = state.decks.find((d) => d.id === openId) || null;
  const cards = useMemo(
    () => state.cards.filter((c) => c.deckId === openId),
    [state.cards, openId]
  );

  const openCardSheet = (card) => {
    setEditing(card);
    setFront(card ? card.front : '');
    setBack(card ? card.back : '');
    setLevel(card ? card.level : 0);
    setCardSheet(true);
  };

  const saveCard = () => {
    if (!front.trim()) return;

    if (editing) {
      updateCard(editing.id, { front: front.trim(), back: back.trim(), level });
    } else {
      addCard(openId, front, back);
    }

    setCardSheet(false);
    setEditing(null);
    setFront('');
    setBack('');
    setLevel(0);
  };

  const confirmDeleteDeck = (target) => {
    const count = state.cards.filter((c) => c.deckId === target.id).length;
    Alert.alert(
      `'${target.name}' 삭제`,
      count ? `카드 ${count}장이 함께 삭제됩니다.` : '빈 덱을 삭제합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteDeck(target.id);
            if (openId === target.id) setOpenId(null);
          },
        },
      ]
    );
  };

  /* ---------- 덱 목록 ---------- */

  if (!deck) {
    return (
      <View style={styles.root}>
        {state.decks.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="덱을 만들어 보세요"
            body={'과목별로 덱을 나누면\n오늘 외울 카드도 과목별로 볼 수 있습니다.'}
          />
        ) : (
          <FlatList
            data={state.decks}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => {
              const stats = deckStats(state, item.id);
              return (
                <Pressable
                  onPress={() => setOpenId(item.id)}
                  style={({ pressed }) => [styles.deckRow, pressed && styles.pressed]}
                >
                  <ProgressRing size={46} value={stats.mastery}>
                    <Text style={styles.ringText}>
                      {Math.round(stats.mastery * 100)}
                    </Text>
                  </ProgressRing>

                  <View style={styles.deckBody}>
                    <Text style={styles.deckName}>{item.name}</Text>
                    <Text style={styles.deckMeta}>
                      카드 {stats.total}장 · 완전암기 {stats.mastered}장
                    </Text>
                  </View>

                  {stats.due > 0 && (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueBadgeText}>{stats.due}</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => {
                      setRenaming(item);
                      setDeckName(item.name);
                      setDeckSheet(true);
                    }}
                    hitSlop={10}
                    style={styles.deckMenu}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textFaint} />
                  </Pressable>
                </Pressable>
              );
            }}
          />
        )}

        <PrimaryButton
          icon="add"
          text="새 덱 만들기"
          onPress={() => {
            setRenaming(null);
            setDeckName('');
            setDeckSheet(true);
          }}
        />

        <Sheet
          visible={deckSheet}
          title={renaming ? '덱 이름' : '새 덱'}
          onClose={() => setDeckSheet(false)}
        >
          <TextInput
            style={styles.input}
            value={deckName}
            onChangeText={setDeckName}
            placeholder="예: 노동법"
            placeholderTextColor={colors.textFaint}
            autoFocus
          />
          <PrimaryButton
            text="저장"
            style={styles.sheetButton}
            onPress={() => {
              if (renaming) renameDeck(renaming.id, deckName);
              else addDeck(deckName);
              setDeckSheet(false);
              setDeckName('');
            }}
          />
          {renaming && (
            <Pressable
              onPress={() => {
                setDeckSheet(false);
                confirmDeleteDeck(renaming);
              }}
              style={styles.deleteLink}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteLinkText}>덱 삭제</Text>
            </Pressable>
          )}
        </Sheet>
      </View>
    );
  }

  /* ---------- 덱 상세 ---------- */

  const stats = deckStats(state, deck.id);

  return (
    <View style={styles.root}>
      <View style={styles.detailHead}>
        <IconButton icon="chevron-back" onPress={() => setOpenId(null)} size={38} />
        <View style={styles.detailTitleWrap}>
          <Text style={styles.detailTitle} numberOfLines={1}>
            {deck.name}
          </Text>
          <Text style={styles.detailMeta}>
            {stats.total}장 · 암기율 {Math.round(stats.mastery * 100)}% · 오늘 {stats.due}장
          </Text>
        </View>
      </View>

      {cards.length === 0 ? (
        <EmptyState
          icon="add-circle-outline"
          title="카드를 추가해 보세요"
          body={'앞면에 질문이나 키워드를 넣습니다.\n뒷면은 선택이라 비워둬도 됩니다.'}
        />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openCardSheet(item)}
              style={({ pressed }) => [styles.cardRow, pressed && styles.pressed]}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardFront} numberOfLines={2}>
                  {item.front}
                </Text>
                {item.back ? (
                  <Text style={styles.cardBack} numberOfLines={1}>
                    {item.back}
                  </Text>
                ) : null}
                <View style={styles.cardMetaRow}>
                  <MasteryMeter level={item.level} size="sm" />
                  <Text style={styles.cardMeta}>{nextDueLabel(item)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          )}
        />
      )}

      <View style={styles.detailActions}>
        <PrimaryButton
          icon="add"
          text="카드 추가"
          onPress={() => openCardSheet(null)}
          style={styles.grow}
        />
        <IconButton
          icon="documents-outline"
          onPress={() => {
            setBulkText('');
            setBulkSheet(true);
          }}
          size={52}
        />
      </View>

      <Sheet
        visible={cardSheet}
        title={editing ? '카드 수정' : '새 카드'}
        onClose={() => setCardSheet(false)}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Label>앞면</Label>
          <TextInput
            style={[styles.input, styles.inputTall]}
            value={front}
            onChangeText={setFront}
            placeholder="질문 또는 키워드"
            placeholderTextColor={colors.textFaint}
            multiline
          />

          <Label style={styles.sectionLabel}>뒷면 (선택)</Label>
          <TextInput
            style={[styles.input, styles.inputTall]}
            value={back}
            onChangeText={setBack}
            placeholder="답 또는 설명 — 비워두면 한 면짜리 카드가 됩니다"
            placeholderTextColor={colors.textFaint}
            multiline
          />

          {editing && (
            <>
              <Label style={styles.sectionLabel}>암기도</Label>
              <View style={styles.levelRow}>
                {Array.from({ length: MAX_LEVEL + 1 }, (_, i) => (
                  <Chip
                    key={i}
                    text={i === 0 ? '처음' : `${i}단계`}
                    active={level === i}
                    onPress={() => setLevel(i)}
                  />
                ))}
              </View>
              <Text style={styles.levelHint}>
                복습할 때 자동으로 올라가지만, 여기서 직접 조절할 수도 있습니다.
              </Text>
            </>
          )}

          <PrimaryButton
            text="저장"
            onPress={saveCard}
            disabled={!front.trim()}
            style={styles.sheetButton}
          />

          {editing && (
            <Pressable
              onPress={() => {
                deleteCard(editing.id);
                setCardSheet(false);
              }}
              style={styles.deleteLink}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteLinkText}>카드 삭제</Text>
            </Pressable>
          )}
        </ScrollView>
      </Sheet>

      <Sheet visible={bulkSheet} title="여러 장 한 번에" onClose={() => setBulkSheet(false)}>
        <Text style={styles.bulkHint}>
          한 줄에 한 장씩, 앞면과 뒷면을 탭이나 " - "로 나눠 붙여넣으세요.
        </Text>
        <Panel style={styles.example}>
          <Text style={styles.exampleText}>거부처분 - 신청을 명시적으로 거절하는 행위</Text>
          <Text style={styles.exampleText}>부작위 - 아무런 처분을 하지 않는 것</Text>
        </Panel>

        <TextInput
          style={[styles.input, styles.bulkInput]}
          value={bulkText}
          onChangeText={setBulkText}
          placeholder="여기에 붙여넣기"
          placeholderTextColor={colors.textFaint}
          multiline
          textAlignVertical="top"
        />

        <PrimaryButton
          text="추가하기"
          style={styles.sheetButton}
          onPress={() => {
            const made = addCardsFromText(openId, bulkText);
            setBulkSheet(false);
            setBulkText('');
            if (made === 0) {
              Alert.alert('추가된 카드가 없습니다', '앞면과 뒷면을 나누는 구분자를 확인해 주세요.');
            }
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12 },
  grow: { flex: 1 },
  pressed: { opacity: 0.85 },
  list: { paddingBottom: 4 },

  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ringText: { fontFamily: font.bold, color: colors.text, fontSize: 12 },
  deckBody: { flex: 1, gap: 3 },
  deckName: { color: colors.text, fontFamily: font.bold, fontSize: 17 },
  deckMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12 },
  dueBadge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  dueBadgeText: { fontFamily: font.bold, color: colors.onAccent, fontSize: 12 },
  deckMenu: { padding: 4 },

  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailTitleWrap: { flex: 1 },
  detailTitle: { color: colors.text, fontFamily: font.bold, fontSize: 21 },
  detailMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12, marginTop: 2 },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: { flex: 1, gap: 5 },
  cardFront: { fontFamily: font.semibold, color: colors.text, fontSize: 14, lineHeight: 20 },
  cardBack: { fontFamily: font.regular, color: colors.textDim, fontSize: 12 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  cardMeta: { fontFamily: font.regular, color: colors.textFaint, fontSize: 11 },

  detailActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  input: { fontFamily: font.regular, backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 15,
    marginTop: 8,
  },
  inputTall: { minHeight: 76, textAlignVertical: 'top' },
  sectionLabel: { marginTop: 18 },
  sheetButton: { marginTop: 20 },

  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  levelHint: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12, lineHeight: 18, marginTop: 10 },

  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  deleteLinkText: { fontFamily: font.semibold, color: colors.danger, fontSize: 14 },

  bulkHint: { fontFamily: font.regular, color: colors.textDim, fontSize: 13, lineHeight: 20 },
  example: { marginTop: 12, gap: 5, paddingVertical: 12 },
  exampleText: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12 },
  bulkInput: { minHeight: 150, marginTop: 12 },
});
