import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export type JourneyAction = 'edit' | 'duplicate' | 'add_to_trip' | 'delete';

export interface JourneyActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: JourneyAction) => void;
}

interface ActionSpec {
  id: JourneyAction;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
}

const ACTIONS: ActionSpec[] = [
  { id: 'edit', labelKey: 'journey.action_edit', icon: 'create-outline' },
  { id: 'duplicate', labelKey: 'journey.action_duplicate', icon: 'copy-outline' },
  { id: 'add_to_trip', labelKey: 'journey.action_add_to_trip', icon: 'folder-open-outline' },
  { id: 'delete', labelKey: 'journey.action_delete', icon: 'trash-outline', danger: true },
];

export function JourneyActionSheet({ visible, onClose, onSelect }: JourneyActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface-light dark:bg-surface-dark"
          style={{ paddingBottom: insets.bottom + 8 }}
          onPress={() => {}}
        >
          {ACTIONS.map((action, idx) => (
            <Pressable
              key={action.id}
              onPress={() => {
                onSelect(action.id);
                onClose();
              }}
              className={`flex-row items-center gap-3 px-4 py-4 active:bg-background-light dark:active:bg-background-dark ${
                idx > 0 ? 'border-t border-border-light dark:border-border-dark' : ''
              }`}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.danger ? colors.danger : colors.text.muted}
              />
              <Text
                className={`text-base ${
                  action.danger ? 'text-danger' : 'text-text-dark dark:text-text-light'
                }`}
              >
                {t(action.labelKey)}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
