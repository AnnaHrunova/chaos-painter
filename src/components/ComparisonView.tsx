import { formatPercent } from '../lib/format';
import type { StudioSettings } from '../app/model';
import type { TrajectorySeries } from '../physics/types';
import { TrajectoryCanvas2D } from './TrajectoryCanvas2D';

interface ComparisonViewProps {
  trajectories: TrajectorySeries[];
  frameIndex: number;
  settings: StudioSettings;
}

export function ComparisonView({
  trajectories,
  frameIndex,
  settings,
}: ComparisonViewProps) {
  if (trajectories.length === 0) {
    return (
      <div className="empty-state">
        <p>Running all integrators for side-by-side comparison...</p>
      </div>
    );
  }

  return (
    <div className="comparison-grid">
      {trajectories.map((trajectory) => (
        <article className="comparison-card" key={trajectory.methodId}>
          <TrajectoryCanvas2D
            trajectory={trajectory}
            frameIndex={frameIndex}
            trailWindow={settings.trailWindow}
            lineWidth={settings.lineWidth}
            colorMode={settings.colorMode}
            visualMode="trail2d"
            showPendulum
            label={trajectory.methodLabel}
            subtitle={`dt = ${trajectory.dt.toFixed(3)}, order ${trajectory.methodId === 'euler' ? 1 : trajectory.methodId === 'midpoint' ? 2 : 4}`}
          />
          <div className="comparison-meta">
            <span>{trajectory.samples[frameIndex]?.time.toFixed(2)} s</span>
            <span>
              max drift {formatPercent(trajectory.summary.maxEnergyDriftRatio)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
