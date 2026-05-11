import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Markdown } from '@/components/ui/Markdown';
import { PRIVACY_POLICY_DE } from '@/lib/legal/content';

// Privacy policy is intentionally German-only until a vetted translation
// is delivered — auto-translating legal text would create liability. The
// English imprint covers the § 5 TMG block users actually need to see.
export default function PrivacyScreen() {
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
      <Markdown source={PRIVACY_POLICY_DE} />
    </ScrollView>
  );
}
