import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MapJourneyDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <Redirect href={{ pathname: '/journeys/[id]', params: { id } }} />;
}
