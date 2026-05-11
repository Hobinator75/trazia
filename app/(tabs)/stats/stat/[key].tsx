import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function StatDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('achievement.stat_drilldown_title')}
      subtitle={t('achievement.stat_drilldown_subtitle', { key: String(key ?? '') })}
    />
  );
}
