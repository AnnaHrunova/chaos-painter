import type { StudioSettings } from '../app/model';
import type { TrajectorySeries } from '../physics/types';
import { TrajectoryCanvas2D } from './TrajectoryCanvas2D';
import { ThreeTrailView } from './ThreeTrailView';

interface StudioViewportProps {
  trajectory: TrajectorySeries | null;
  frameIndex: number;
  settings: StudioSettings;
}

export function StudioViewport({
  trajectory,
  frameIndex,
  settings,
}: StudioViewportProps) {
  if (!trajectory) {
    return (
      <div className="empty-state">
        <p>Simulating the pendulum...</p>
      </div>
    );
  }

  if (settings.visualMode === 'trail3d') {
    return (
      <div className="viewport-card">
        <ThreeTrailView
          trajectory={trajectory}
          frameIndex={frameIndex}
          colorMode={settings.colorMode}
          zAxisMode={settings.zAxisMode}
          lineWidth={settings.lineWidth}
        />
      </div>
    );
  }

  return (
    <div className="viewport-card">
      <TrajectoryCanvas2D
        trajectory={trajectory}
        frameIndex={frameIndex}
        trailWindow={settings.trailWindow}
        lineWidth={settings.lineWidth}
        colorMode={settings.colorMode}
        visualMode={settings.visualMode}
        showPendulum={settings.visualMode === 'pendulum2d'}
      />
    </div>
  );
}

