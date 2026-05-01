import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export interface EntityResult {
  id: string;
  primary: string;
  secondary?: string;
  tertiary?: string;
}

export interface EntitySearchModalProps<T> {
  visible: boolean;
  title: string;
  placeholder?: string;
  onClose: () => void;
  onSelect: (item: T) => void;
  search: (query: string) => Promise<T[]>;
  toResult: (item: T) => EntityResult;
  emptyHint?: string;
}

export function EntitySearchModal<T>({
  visible,
  title,
  placeholder = 'Suchen…',
  onClose,
  onSelect,
  search,
  toResult,
  emptyHint = 'Tippe einen Suchbegriff ein.',
}: EntitySearchModalProps<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const out = await search(query);
        if (!cancelled) setResults(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, visible, search]);

  const items = useMemo(
    () => results.map((item) => ({ raw: item, view: toResult(item) })),
    [results, toResult],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-3 border-b border-border-dark px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text.light} />
          </Pressable>
          <Text className="flex-1 text-lg font-semibold text-text-light">{title}</Text>
        </View>
        <View className="px-4 py-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            autoFocus
            className="rounded-xl border border-border-dark bg-surface-dark px-3 py-3 text-base text-text-light"
          />
        </View>
        {loading ? <ActivityIndicator color={colors.primary} className="my-4" /> : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.view.id}
          ListEmptyComponent={
            !loading ? (
              <Text className="px-4 py-6 text-center text-text-muted">
                {query.trim().length === 0 ? emptyHint : 'Keine Treffer.'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item.raw);
                onClose();
              }}
              className="border-b border-border-dark px-4 py-3 active:bg-surface-dark"
            >
              <Text className="text-base font-medium text-text-light">{item.view.primary}</Text>
              {item.view.secondary ? (
                <Text className="text-sm text-text-muted">{item.view.secondary}</Text>
              ) : null}
              {item.view.tertiary ? (
                <Text className="text-xs text-text-muted">{item.view.tertiary}</Text>
              ) : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
