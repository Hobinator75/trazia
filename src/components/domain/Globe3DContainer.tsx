import { Component, type ReactNode } from 'react';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';

import { Globe3D } from './Globe3D';
import { MapView2D } from './MapView2D';

interface State {
  failed: boolean;
}

// Wraps Globe3D so a three.js / expo-gl bring-up crash falls back to the
// 2D map instead of bubbling up to the root ErrorBoundary. Hermes Release
// has occasionally thrown "Property 'document' doesn't exist" inside
// three's ImageUtils — the three-dom-shim covers that today, but the
// fallback stays in place so a future shim regression degrades to "2D
// looks fine" rather than "the Map tab is dead".
export class Globe3DContainer extends Component<
  { journeys: JourneyWithRefs[] },
  State
> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    if (__DEV__) {
      console.warn('Globe3D failed, falling back to 2D map:', error.message);
    }
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return <MapView2D journeys={this.props.journeys} />;
    }
    return <Globe3D journeys={this.props.journeys} />;
  }
}
