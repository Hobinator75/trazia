import Constants from 'expo-constants';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CREDITS = [
  {
    name: 'OurAirports',
    description: 'Frei nutzbare Daten zu Flughäfen weltweit.',
    href: 'https://ourairports.com',
  },
  {
    name: 'OpenFlights',
    description: 'Datenbank für Flughäfen, Airlines und Routen.',
    href: 'https://openflights.org',
  },
  {
    name: 'NASA Visible Earth',
    description: 'Public-Domain-Texturen, geplant für den 3D-Globus.',
    href: 'https://visibleearth.nasa.gov',
  },
  {
    name: 'Ionicons',
    description: 'Icon-Set unter MIT-Lizenz.',
    href: 'https://ionic.io/ionicons',
  },
  {
    name: 'Drizzle ORM, NativeWind, Reanimated, gifted-charts',
    description: 'Open-Source-Bibliotheken, die Trazia möglich machen.',
  },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '—';

  return (
    <ScrollView
      className="flex-1 bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <View className="rounded-3xl border border-border-dark bg-surface-dark p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          App-Info
        </Text>
        <Text className="mt-2 text-2xl font-bold text-text-light">Trazia</Text>
        <Text className="mt-1 text-sm text-text-muted">
          Version {version} · Build {String(buildNumber)}
        </Text>
      </View>

      <Text className="mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Credits
      </Text>
      <View className="mt-2 rounded-2xl border border-border-dark bg-surface-dark">
        {CREDITS.map((credit, idx) => (
          <View
            key={credit.name}
            className={`px-4 py-3 ${idx > 0 ? 'border-t border-border-dark' : ''}`}
          >
            <Text className="text-base font-semibold text-text-light">{credit.name}</Text>
            <Text className="text-xs text-text-muted">{credit.description}</Text>
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

      <Text className="mt-6 text-xs text-text-muted">
        Open-Source-Lizenzen werden in CC-3.10 als generierte Liste hinterlegt.
      </Text>
    </ScrollView>
  );
}
