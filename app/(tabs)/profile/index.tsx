import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { useSettingsStore } from '@/stores/settings.store';

const ROWS = [
  { href: '/profile/premium' as const, label: 'Premium', icon: 'star-outline' as const },
  {
    href: '/profile/about' as const,
    label: 'Über Trazia',
    icon: 'information-circle-outline' as const,
  },
  { href: '/profile/privacy' as const, label: 'Datenschutz', icon: 'lock-closed-outline' as const },
  { href: '/profile/export' as const, label: 'Daten-Export', icon: 'download-outline' as const },
  { href: '/profile/backup' as const, label: 'Backup', icon: 'cloud-upload-outline' as const },
];

export default function ProfileScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);

  return (
    <ScrollView className="flex-1 bg-background-dark" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-3xl font-bold text-text-light">Profil</Text>

      <View className="mb-4 rounded-2xl border border-border-dark bg-surface-dark p-4">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Erscheinungsbild
        </Text>
        <View className="flex-row gap-2">
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setTheme(mode)}
              className={`flex-1 items-center rounded-full border px-3 py-2 ${
                theme === mode
                  ? 'border-primary bg-primary/20'
                  : 'border-border-dark bg-background-dark'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  theme === mode ? 'text-primary' : 'text-text-light'
                }`}
              >
                {mode === 'dark' ? 'Dunkel' : mode === 'light' ? 'Hell' : 'System'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-border-dark bg-surface-dark p-4">
        <View className="flex-1 pr-3">
          <Text className="text-base text-text-light">Sounds</Text>
          <Text className="text-xs text-text-muted">
            Achievement-Chime beim Freischalten abspielen.
          </Text>
        </View>
        <Switch
          value={soundEnabled}
          onValueChange={setSoundEnabled}
          trackColor={{ true: colors.primary, false: colors.border.dark }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View className="overflow-hidden rounded-2xl border border-border-dark bg-surface-dark">
        {ROWS.map((row, idx) => (
          <Link key={row.href} href={row.href} asChild>
            <Pressable
              className={`flex-row items-center justify-between px-4 py-4 active:bg-background-dark ${
                idx > 0 ? 'border-t border-border-dark' : ''
              }`}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name={row.icon} size={20} color="#9CA3AF" />
                <Text className="text-base text-text-light">{row.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
