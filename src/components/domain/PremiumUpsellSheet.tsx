import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export interface PremiumUpsellSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  ctaLabel?: string;
}

export function PremiumUpsellSheet({
  visible,
  onClose,
  title = 'Premium freischalten',
  message,
  ctaLabel = 'Jetzt Premium ansehen',
}: PremiumUpsellSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface-dark px-5"
          style={{ paddingTop: 20, paddingBottom: insets.bottom + 20 }}
          onPress={() => {}}
        >
          <View className="self-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/20">
              <Ionicons name="sparkles" size={26} color={colors.primary} />
            </View>
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-text-light">{title}</Text>
          <Text className="mt-2 text-center text-sm text-text-muted">{message}</Text>
          <Pressable
            onPress={() => {
              onClose();
              router.push('/profile/premium');
            }}
            className="mt-5 items-center rounded-full bg-primary py-3 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">{ctaLabel}</Text>
          </Pressable>
          <Pressable onPress={onClose} className="mt-2 items-center py-3">
            <Text className="text-sm text-text-muted">Vielleicht später</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
