import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Markdown } from '@/components/ui/Markdown';
import { TERMS_DE } from '@/lib/legal/content';

// Terms are intentionally German-only until a vetted translation is
// delivered — see the parallel note in privacy.tsx.
export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <Markdown source={TERMS_DE} />
    </ScrollView>
  );
}
