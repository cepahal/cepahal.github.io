import { Component, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';

// three.js ships in its own chunk, fetched while the welcome letter is still open.
const CampusDiorama = lazy(() => import('./CampusDiorama'));

class MapBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

interface CampusMapProps {
  active: boolean;
  onOpenProject: (id: string, opener: HTMLElement | null) => void;
  /** Called if WebGL or the map chunk fails, so the room can fall back to the card carousel. */
  onFail: () => void;
}

export default function CampusMap({ onFail, ...map }: CampusMapProps) {
  return <section className="campus room-view" aria-label="Campus map of projects">
    <MapBoundary onFail={onFail}>
      <Suspense fallback={<p className="campus-loading">unfolding the campus map…</p>}>
        <CampusDiorama {...map} />
      </Suspense>
    </MapBoundary>
  </section>;
}
