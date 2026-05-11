import { Text, View } from 'react-native';

export interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
}

export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark px-6">
      <Text className="mb-2 text-2xl font-bold text-text-dark dark:text-text-light">{title}</Text>
      {subtitle ? (
        <Text className="text-center text-text-muted-light dark:text-text-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
