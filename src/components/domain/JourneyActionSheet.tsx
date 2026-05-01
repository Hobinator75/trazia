import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export type JourneyAction = 'edit' | 'duplicate' | 'add_to_trip' | 'delete';

export interface JourneyActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: JourneyAction) => void;
}

const ACTIONS: {
  id: JourneyAction;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
}[] = [
  { id: 'edit', label: 'Bearbeiten', icon: 'create-outline' },
  { id: 'duplicate', label: 'Duplizieren', icon: 'copy-outline' },
  { id: 'add_to_trip', label: 'Zu Reise hinzufügen', icon: 'folder-open-outline' },
  { id: 'delete', label: 'Löschen', icon: 'trash-outline', danger: true },
];

export function JourneyActionSheet({ visible, onClose, onSelect }: JourneyActionSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface-dark"
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
              className={`flex-row items-center gap-3 px-4 py-4 active:bg-background-dark ${
                idx > 0 ? 'border-t border-border-dark' : ''
              }`}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.danger ? colors.danger : colors.text.light}
              />
              <Text className={`text-base ${action.danger ? 'text-danger' : 'text-text-light'}`}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
