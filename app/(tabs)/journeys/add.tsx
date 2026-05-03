import { useState } from 'react';
import { View } from 'react-native';

import { FlightForm } from '@/components/domain/AddJourney/FlightForm';
import { OtherForm } from '@/components/domain/AddJourney/OtherForm';
import { TrainForm } from '@/components/domain/AddJourney/TrainForm';
import { type AddJourneyMode, ModePicker, MODES } from '@/components/domain/ModePicker';
import { FEATURE_FLAGS } from '@/config/featureFlags';
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

  const renderForm = () => {
    if (mode === 'flight') return <FlightForm />;
    if (mode === 'train') {
      // Defensive: the ModePicker doesn't allow selecting train when
      // the flag is off (it's locked), but render the FlightForm as a
      // safe fallback rather than crashing if the state somehow lands
      // here (deep link, stale state from a previous build).
      return FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE ? <TrainForm /> : <FlightForm />;
    }
    return <OtherForm />;
  };

  return (
    <View className="flex-1 bg-background-dark">
      <View className="border-b border-border-dark">
        <ModePicker value={mode} onChange={setMode} onLockedTap={onLockedTap} />
      </View>
      {renderForm()}
    </View>
  );
}
