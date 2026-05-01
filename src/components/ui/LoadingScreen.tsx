import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({
  title = 'Trazia',
  subtitle = 'Daten werden geladen…',
}: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background-dark">
      <Text className="mb-2 text-4xl font-bold text-text-light">{title}</Text>
      <Text className="mb-8 text-text-muted">{subtitle}</Text>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
