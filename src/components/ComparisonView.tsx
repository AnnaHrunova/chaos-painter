import { getIntegrator, getReferenceIntegrator, maxAccuracyRank } from '../integrators';
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
        <p>Считаю все интеграторы для бокового сравнения...</p>
      </div>
    );
  }

  const referenceMethod = getReferenceIntegrator();
  const referenceTrajectory =
    trajectories.find((trajectory) => trajectory.methodId === referenceMethod.id) ??
    trajectories[trajectories.length - 1] ??
    null;

  return (
    <div className="comparison-grid">
      {trajectories.map((trajectory) => {
        const integrator = getIntegrator(trajectory.methodId);

        return (
          <article className="comparison-card" key={trajectory.methodId}>
            <TrajectoryCanvas2D
              trajectory={trajectory}
              frameIndex={frameIndex}
              trailWindow={settings.trailWindow}
              keepFullPath={settings.keepFullPath}
              lineWidth={settings.lineWidth}
              colorMode={settings.colorMode}
              visualMode="trail2d"
              renderMode={settings.renderMode}
              referenceTrajectory={referenceTrajectory}
              showPendulum
              label={trajectory.methodLabel}
              subtitle={`dt = ${trajectory.dt.toFixed(3)}, p${integrator.order}, точность ${integrator.accuracyRank}/${maxAccuracyRank}`}
            />
            <div className="comparison-meta">
              <span>{trajectory.samples[frameIndex]?.time.toFixed(2)} s</span>
              <span>
                макс. дрейф {formatPercent(trajectory.summary.maxEnergyDriftRatio)}
              </span>
            </div>
            <p className="comparison-description">{integrator.description}</p>
          </article>
        );
      })}
    </div>
  );
}
