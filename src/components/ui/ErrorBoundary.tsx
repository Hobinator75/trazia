import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <View className="flex-1 items-center justify-center bg-background-dark px-6">
          <Text className="mb-3 text-2xl font-bold text-text-light">Etwas ist schiefgelaufen</Text>
          <Text className="mb-8 text-center text-text-muted">{this.state.error.message}</Text>
          <Pressable
            onPress={this.reset}
            className="rounded-full bg-primary px-6 py-3 active:opacity-80"
          >
            <Text className="font-semibold text-white">Erneut versuchen</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
