import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'compass-outline', title, subtitle }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Ionicons name={icon} size={48} color={colors.text.muted} />
      <Text className="mt-4 text-center text-lg font-semibold text-text-light">{title}</Text>
      {subtitle ? <Text className="mt-1 text-center text-text-muted">{subtitle}</Text> : null}
    </View>
  );
}
