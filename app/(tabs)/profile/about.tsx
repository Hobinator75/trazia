import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CreditSpec {
  name: string;
  descriptionKey: string;
  href?: string;
}

const CREDITS: CreditSpec[] = [
  { name: 'OurAirports', descriptionKey: 'about.credit_ourairports', href: 'https://ourairports.com' },
  { name: 'OpenFlights', descriptionKey: 'about.credit_openflights', href: 'https://openflights.org' },
  {
    name: 'NASA Visible Earth',
    descriptionKey: 'about.credit_nasa',
    href: 'https://visibleearth.nasa.gov',
  },
  { name: 'Ionicons', descriptionKey: 'about.credit_ionicons', href: 'https://ionic.io/ionicons' },
  { name: 'Drizzle ORM, NativeWind, Reanimated, gifted-charts', descriptionKey: 'about.credit_stack' },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '—';

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <View className="rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
          {t('about.app_info')}
        </Text>
        <Text className="mt-2 text-2xl font-bold text-text-dark dark:text-text-light">Trazia</Text>
        <Text className="mt-1 text-sm text-text-muted-light dark:text-text-muted">
          {t('about.version_label', { version, build: String(buildNumber) })}
        </Text>
      </View>

      <Text className="mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {t('about.credits')}
      </Text>
      <View className="mt-2 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        {CREDITS.map((credit, idx) => (
          <View
            key={credit.name}
            className={`px-4 py-3 ${idx > 0 ? 'border-t border-border-light dark:border-border-dark' : ''}`}
          >
            <Text className="text-base font-semibold text-text-dark dark:text-text-light">
              {credit.name}
            </Text>
            <Text className="text-xs text-text-muted-light dark:text-text-muted">
              {t(credit.descriptionKey)}
            </Text>
            {credit.href ? (
              <Text
                className="mt-1 text-xs text-primary"
                onPress={() => {
                  void Linking.openURL(credit.href!);
                }}
              >
                {credit.href}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      <Text className="mt-6 text-xs text-text-muted-light dark:text-text-muted">
        {t('about.licenses_note')}
      </Text>
    </ScrollView>
  );
}
