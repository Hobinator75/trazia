import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Markdown } from '@/components/ui/Markdown';
import { resolveImprint } from '@/lib/legal/content';

export default function ImprintScreen() {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const source = resolveImprint(i18n.language);
  return (
    <ScrollView
      className="flex-1 bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <Markdown source={source} />
    </ScrollView>
  );
}
