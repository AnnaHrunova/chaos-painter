import { Suspense, lazy } from 'react';
import type { StudioSettings } from '../app/model';
import type { TrajectorySeries } from '../physics/types';
import { TrajectoryCanvas2D } from './TrajectoryCanvas2D';

const ThreeTrailView = lazy(async () => {
  const module = await import('./ThreeTrailView');
  return { default: module.ThreeTrailView };
});

interface StudioViewportProps {
  trajectory: TrajectorySeries | null;
  referenceTrajectory: TrajectorySeries | null;
  frameIndex: number;
  settings: StudioSettings;
}

export function StudioViewport({
  trajectory,
  referenceTrajectory,
  frameIndex,
  settings,
}: StudioViewportProps) {
  if (!trajectory) {
    return (
      <div className="empty-state">
        <p>Симуляция маятника...</p>
      </div>
    );
  }

  if (settings.visualMode === 'trail3d') {
    return (
      <div className="viewport-card">
        <Suspense fallback={<div className="empty-state"><p>Загружаю 3D-движок...</p></div>}>
          <ThreeTrailView
            trajectory={trajectory}
            frameIndex={frameIndex}
            colorMode={settings.colorMode}
            zAxisMode={settings.zAxisMode}
            lineWidth={settings.lineWidth}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="viewport-card">
      <TrajectoryCanvas2D
        trajectory={trajectory}
        frameIndex={frameIndex}
        trailWindow={settings.trailWindow}
        keepFullPath={settings.keepFullPath}
        lineWidth={settings.lineWidth}
        colorMode={settings.colorMode}
        visualMode={settings.visualMode}
        renderMode={settings.renderMode}
        referenceTrajectory={referenceTrajectory}
        showPendulum={settings.visualMode === 'pendulum2d'}
      />
    </div>
  );
}
