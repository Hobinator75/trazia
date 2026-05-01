import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

export interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxLength?: number;
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Hinzufügen…',
  suggestions = [],
  maxLength = 32,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const visibleSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <View>
      <View className="rounded-xl border border-border-dark bg-surface-dark px-2 py-2">
        <View className="flex-row flex-wrap items-center gap-2">
          {value.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => remove(tag)}
              className="flex-row items-center gap-1 rounded-full bg-primary/20 px-3 py-1"
            >
              <Text className="text-sm text-primary">{tag}</Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => commit(draft)}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            maxLength={maxLength}
            returnKeyType="done"
            className="min-w-[100] flex-1 px-1 py-1 text-base text-text-light"
            blurOnSubmit={false}
          />
        </View>
      </View>
      {visibleSuggestions.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {visibleSuggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => commit(s)}
              className="rounded-full border border-border-dark px-3 py-1"
            >
              <Text className="text-xs text-text-muted">+ {s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
