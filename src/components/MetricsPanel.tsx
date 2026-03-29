import { computeDivergenceSeries } from '../simulation/comparison';
import { formatFixed, formatPercent, formatSigned } from '../lib/format';
import type { WorkspaceMode } from '../app/model';
import type { MetricPoint, TrajectorySeries } from '../physics/types';

interface MetricsPanelProps {
  workspaceMode: WorkspaceMode;
  primaryTrajectory: TrajectorySeries | null;
  comparisonTrajectories: TrajectorySeries[];
  sensitivitySeries: MetricPoint[];
  frameIndex: number;
}

interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: MetricPoint[];
}

export function MetricsPanel({
  workspaceMode,
  primaryTrajectory,
  comparisonTrajectories,
  sensitivitySeries,
  frameIndex,
}: MetricsPanelProps) {
  if (workspaceMode === 'comparison' && comparisonTrajectories.length > 0) {
    const reference =
      comparisonTrajectories.find((trajectory) => trajectory.methodId === 'rk4') ??
      comparisonTrajectories[comparisonTrajectories.length - 1];
    const energySeries = comparisonTrajectories.map(toEnergySeries);
    const divergenceSeries = comparisonTrajectories
      .filter((trajectory) => trajectory.methodId !== reference.methodId)
      .map((trajectory, index) => ({
        id: trajectory.methodId,
        label: `${trajectory.methodLabel} vs ${reference.methodLabel}`,
        color: ['#ff8b5a', '#9ec1ff'][index] ?? '#ff8b5a',
        points: computeDivergenceSeries(reference, trajectory),
      }));

    return (
      <section className="metrics-grid">
        <MetricSummaryCard
          title="RK4 Reference"
          lines={[
            `current time ${formatFixed(reference.samples[frameIndex]?.time ?? 0, 2)} s`,
            `RK4 max drift ${formatPercent(reference.summary.maxEnergyDriftRatio)}`,
            `Euler max drift ${formatPercent(
              comparisonTrajectories.find((item) => item.methodId === 'euler')?.summary
                .maxEnergyDriftRatio ?? 0,
            )}`,
          ]}
        />
        <MetricSummaryCard
          title="Interpretation"
          lines={[
            'Same equations, same initial state, different truncation error.',
            'When dt is coarse, low-order methods inject visible fake physics.',
            'Chaos then magnifies those tiny numerical lies into big pattern changes.',
          ]}
        />
        <ChartCard title="Energy Drift Over Time" series={energySeries} />
        <ChartCard title="Divergence From RK4" series={divergenceSeries} />
      </section>
    );
  }

  if (!primaryTrajectory) {
    return null;
  }

  const sample = primaryTrajectory.samples[frameIndex] ?? primaryTrajectory.samples[0];
  const energySeries = [toEnergySeries(primaryTrajectory)];

  return (
    <section className="metrics-grid">
      <MetricSummaryCard
        title="Current Sample"
        lines={[
          `time ${formatFixed(sample.time, 2)} s`,
          `speed ${formatFixed(sample.speed2, 3)}`,
          `energy drift ${formatSigned(sample.energyDriftRatio * 100, 2)}%`,
        ]}
      />
      <MetricSummaryCard
        title="Trajectory Summary"
        lines={[
          `${primaryTrajectory.methodLabel} at dt ${formatFixed(primaryTrajectory.dt, 3)}`,
          `max drift ${formatPercent(primaryTrajectory.summary.maxEnergyDriftRatio)}`,
          `energy span ${formatFixed(primaryTrajectory.summary.minEnergy, 3)} .. ${formatFixed(primaryTrajectory.summary.maxEnergy, 3)}`,
        ]}
      />
      <ChartCard title="Energy Drift Over Time" series={energySeries} />
      <ChartCard
        title="Nearby Initial Condition Divergence"
        series={[
          {
            id: 'sensitivity',
            label: '\u0394 theta2 = 0.05\u00b0',
            color: '#ff8b5a',
            points: sensitivitySeries,
          },
        ]}
      />
    </section>
  );
}

function toEnergySeries(trajectory: TrajectorySeries): ChartSeries {
  const palette: Record<TrajectorySeries['methodId'], string> = {
    euler: '#ff8b5a',
    midpoint: '#8fe1ff',
    heun: '#ffd36e',
    rk3: '#d7a8ff',
    rk4: '#a6ff9e',
  };

  return {
    id: trajectory.methodId,
    label: trajectory.methodLabel,
    color: palette[trajectory.methodId],
    points: trajectory.samples.map((sample) => ({
      time: sample.time,
      value: sample.energyDriftRatio,
    })),
  };
}

function ChartCard({
  title,
  series,
}: {
  title: string;
  series: ChartSeries[];
}) {
  if (series.length === 0 || series.every((item) => item.points.length === 0)) {
    return null;
  }

  const width = 520;
  const height = 190;
  const padding = 18;
  const values = series.flatMap((item) => item.points.map((point) => point.value));
  const times = series.flatMap((item) => item.points.map((point) => point.time));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const valueSpan = Math.max(1e-6, maxValue - minValue);
  const timeSpan = Math.max(1e-6, maxTime - minTime);

  return (
    <article className="metric-card chart-card">
      <div className="metric-card-header">
        <h3>{title}</h3>
        <div className="chart-legend">
          {series.map((item) => (
            <span key={item.id}>
              <i style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img">
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="rgba(255,255,255,0.02)"
          rx="18"
        />
        {[0.2, 0.4, 0.6, 0.8].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={padding + (height - padding * 2) * line}
            y2={padding + (height - padding * 2) * line}
            stroke="rgba(170, 199, 221, 0.08)"
          />
        ))}
        {series.map((item) => (
          <path
            key={item.id}
            d={toPath(item.points, width, height, padding, minValue, valueSpan, minTime, timeSpan)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </article>
  );
}

function toPath(
  points: MetricPoint[],
  width: number,
  height: number,
  padding: number,
  minValue: number,
  valueSpan: number,
  minTime: number,
  timeSpan: number,
): string {
  return points
    .map((point, index) => {
      const x =
        padding + ((point.time - minTime) / timeSpan) * (width - padding * 2);
      const y =
        height -
        padding -
        ((point.value - minValue) / valueSpan) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function MetricSummaryCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <article className="metric-card summary-card">
      <div className="metric-card-header">
        <h3>{title}</h3>
      </div>
      <div className="summary-lines">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </article>
  );
}
