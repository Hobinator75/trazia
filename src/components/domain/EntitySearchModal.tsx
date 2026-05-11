import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { colors, paletteFor } from '@/theme/colors';

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
  placeholder,
  onClose,
  onSelect,
  search,
  toResult,
  emptyHint,
}: EntitySearchModalProps<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const palette = paletteFor(scheme);
  const effectivePlaceholder = placeholder ?? t('search.placeholder');
  const effectiveEmpty = emptyHint ?? t('search.empty_hint');

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
      <View
        className="flex-1 bg-background-light dark:bg-background-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 border-b border-border-light dark:border-border-dark px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Pressable>
          <Text className="flex-1 text-lg font-semibold text-text-dark dark:text-text-light">
            {title}
          </Text>
        </View>
        <View className="px-4 py-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={effectivePlaceholder}
            placeholderTextColor={colors.text.muted}
            autoFocus
            className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-3 py-3 text-base text-text-dark dark:text-text-light"
          />
        </View>
        {loading ? <ActivityIndicator color={colors.primary} className="my-4" /> : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.view.id}
          ListEmptyComponent={
            !loading ? (
              <Text className="px-4 py-6 text-center text-text-muted-light dark:text-text-muted">
                {query.trim().length === 0 ? effectiveEmpty : t('search.no_results')}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item.raw);
                onClose();
              }}
              className="border-b border-border-light dark:border-border-dark px-4 py-3 active:bg-surface-light dark:active:bg-surface-dark"
            >
              <Text className="text-base font-medium text-text-dark dark:text-text-light">
                {item.view.primary}
              </Text>
              {item.view.secondary ? (
                <Text className="text-sm text-text-muted-light dark:text-text-muted">
                  {item.view.secondary}
                </Text>
              ) : null}
              {item.view.tertiary ? (
                <Text className="text-xs text-text-muted-light dark:text-text-muted">
                  {item.view.tertiary}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
