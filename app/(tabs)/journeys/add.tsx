import { useState } from 'react';
import { View } from 'react-native';

import { FlightForm } from '@/components/domain/AddJourney/FlightForm';
import { OtherForm } from '@/components/domain/AddJourney/OtherForm';
import { type AddJourneyMode, ModePicker, MODES } from '@/components/domain/ModePicker';
import { trackModeLockedTapped } from '@/lib/observability/analytics';
import { useSnackbarStore } from '@/stores/snackbarStore';

export default function AddJourneyScreen() {
  const [mode, setMode] = useState<AddJourneyMode>('flight');
  const showSnackbar = useSnackbarStore((s) => s.show);

  const onLockedTap = (locked: AddJourneyMode) => {
    const def = MODES.find((m) => m.value === locked);
    showSnackbar(`${def?.label ?? 'Modus'} ist in Phase 2 verfügbar.`, { variant: 'info' });
    void trackModeLockedTapped(locked);
  };

  return (
    <View className="flex-1 bg-background-dark">
      <View className="border-b border-border-dark">
        <ModePicker value={mode} onChange={setMode} onLockedTap={onLockedTap} />
      </View>
      {mode === 'flight' ? <FlightForm /> : <OtherForm />}
    </View>
  );
}
