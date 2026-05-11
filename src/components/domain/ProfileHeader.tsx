import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/stores/settings.store';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

export function ProfileHeader() {
  const { t } = useTranslation();
  const profileName = useSettingsStore((s) => s.profileName);
  const setProfileName = useSettingsStore((s) => s.setProfileName);
  const avatarUri = useSettingsStore((s) => s.avatarUri);
  const setAvatarUri = useSettingsStore((s) => s.setAvatarUri);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profileName ?? '');

  const pickAvatar = async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showSnackbar(t('profile_header.photo_perm_denied'), { variant: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const openEditor = (): void => {
    setDraft(profileName ?? '');
    setEditing(true);
  };

  const saveName = (): void => {
    const trimmed = draft.trim();
    setProfileName(trimmed.length > 0 ? trimmed : null);
    setEditing(false);
  };

  return (
    <View className="mb-4 flex-row items-center gap-4 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
      <Pressable onPress={pickAvatar} hitSlop={6}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
        )}
      </Pressable>
      <View className="flex-1">
        <Pressable onPress={openEditor} hitSlop={6}>
          <Text className="text-xl font-bold text-text-dark dark:text-text-light">
            {profileName ?? t('profile_header.default_name')}
          </Text>
          <Text className="text-xs text-text-muted-light dark:text-text-muted">
            {profileName ? t('profile_header.tap_to_edit') : t('profile_header.tap_to_set')}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setEditing(false)}>
          <Pressable
            className="rounded-t-3xl bg-surface-light dark:bg-surface-dark px-5"
            style={{ paddingTop: 16, paddingBottom: insets.bottom + 16 }}
            onPress={() => {}}
          >
            <Text className="text-lg font-semibold text-text-dark dark:text-text-light">
              {t('profile_header.edit_title')}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('profile_header.edit_placeholder')}
              placeholderTextColor={colors.text.muted}
              maxLength={48}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
              className="mt-3 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-3 text-base text-text-dark dark:text-text-light"
            />
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setEditing(false)}
                className="flex-1 items-center rounded-full border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark py-3"
              >
                <Text className="text-sm text-text-dark dark:text-text-light">
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={saveName}
                className="flex-1 items-center rounded-full bg-primary py-3"
              >
                <Text className="text-sm font-semibold text-white">{t('common.save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
