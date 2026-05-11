import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({ title = 'Trazia', subtitle }: LoadingScreenProps) {
  const { t } = useTranslation();
  const effectiveSubtitle = subtitle ?? t('common.loading_data');
  return (
    <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
      <Text className="mb-2 text-4xl font-bold text-text-dark dark:text-text-light">{title}</Text>
      <Text className="mb-8 text-text-muted-light dark:text-text-muted">{effectiveSubtitle}</Text>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
