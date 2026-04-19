import { computeDivergenceSeries } from '../simulation/comparison';
import { getIntegrator, getReferenceIntegrator } from '../integrators';
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

const energySeriesCache = new WeakMap<TrajectorySeries, ChartSeries>();
const divergenceSeriesCache = new WeakMap<
  TrajectorySeries,
  WeakMap<TrajectorySeries, MetricPoint[]>
>();

export function MetricsPanel({
  workspaceMode,
  primaryTrajectory,
  comparisonTrajectories,
  sensitivitySeries,
  frameIndex,
}: MetricsPanelProps) {
  if (workspaceMode === 'comparison' && comparisonTrajectories.length > 0) {
    const referenceIntegrator = getReferenceIntegrator();
    const reference =
      comparisonTrajectories.find((trajectory) => trajectory.methodId === referenceIntegrator.id) ??
      comparisonTrajectories[comparisonTrajectories.length - 1];
    const energySeries = comparisonTrajectories.map(getEnergySeries);
    const divergenceSeries = comparisonTrajectories
      .filter((trajectory) => trajectory.methodId !== reference.methodId)
      .map((trajectory) => ({
        id: trajectory.methodId,
        label: `${trajectory.methodLabel} vs ${reference.methodLabel}`,
        color: getIntegrator(trajectory.methodId).accentColor,
        points: getDivergenceSeries(reference, trajectory),
      }));

    return (
      <section className="metrics-section">
        <MetricHint />
        <div className="metrics-grid">
          <MetricSummaryCard
            title="Референсный метод"
            lines={[
              `${reference.methodLabel} используется как самый точный эталон текущего набора.`,
              `текущее время ${formatFixed(reference.samples[frameIndex]?.time ?? 0, 2)} s`,
              `макс. дрейф референса ${formatPercent(reference.summary.maxEnergyDriftRatio)}`,
              `макс. дрейф Euler ${formatPercent(
                comparisonTrajectories.find((item) => item.methodId === 'euler')?.summary
                  .maxEnergyDriftRatio ?? 0,
              )}`,
            ]}
          />
          <MetricSummaryCard
            title="Как это читать"
            lines={[
              'Те же уравнения и те же начальные условия, но разная ошибка аппроксимации.',
              'Если dt слишком крупный, методы низкого порядка начинают подмешивать заметную фальшивую физику.',
              'Хаос затем раздувает эти маленькие численные ошибки в крупные различия траекторий.',
            ]}
          />
          <ChartCard title="Дрейф энергии во времени" series={energySeries} />
          <ChartCard title="Расхождение относительно референса" series={divergenceSeries} />
        </div>
      </section>
    );
  }

  if (!primaryTrajectory) {
    return null;
  }

  const sample = primaryTrajectory.samples[frameIndex] ?? primaryTrajectory.samples[0];
  const energySeries = [getEnergySeries(primaryTrajectory)];

  return (
    <section className="metrics-section">
      <MetricHint />
      <div className="metrics-grid">
        <MetricSummaryCard
          title="Текущий сэмпл"
          lines={[
            `время ${formatFixed(sample.time, 2)} s`,
            `скорость ${formatFixed(sample.speed2, 3)}`,
            `дрейф энергии ${formatSigned(sample.energyDriftRatio * 100, 2)}%`,
          ]}
        />
        <MetricSummaryCard
          title="Сводка траектории"
          lines={[
            `${primaryTrajectory.methodLabel} при dt ${formatFixed(primaryTrajectory.dt, 3)}`,
            `макс. дрейф ${formatPercent(primaryTrajectory.summary.maxEnergyDriftRatio)}`,
            `диапазон энергии ${formatFixed(primaryTrajectory.summary.minEnergy, 3)} .. ${formatFixed(primaryTrajectory.summary.maxEnergy, 3)}`,
          ]}
        />
        <ChartCard title="Дрейф энергии во времени" series={energySeries} />
        <ChartCard
          title="Расхождение близких начальных условий"
          series={[
            {
              id: 'sensitivity',
              label: '\u0394 theta2 = 0.05°',
              color: '#ff8b5a',
              points: sensitivitySeries,
            },
          ]}
        />
      </div>
    </section>
  );
}

function MetricHint() {
  return (
    <div className="metrics-hint">
      <strong>Что такое макс. дрейф:</strong> это максимальное относительное
      отклонение полной энергии от стартового значения за всё время симуляции.
      Чем оно больше, тем сильнее численный метод и шаг `dt` искажают физику.
    </div>
  );
}

function getEnergySeries(trajectory: TrajectorySeries): ChartSeries {
  const cached = energySeriesCache.get(trajectory);
  if (cached) {
    return cached;
  }

  const palette: Record<TrajectorySeries['methodId'], string> = {
    euler: getIntegrator('euler').accentColor,
    midpoint: getIntegrator('midpoint').accentColor,
    heun: getIntegrator('heun').accentColor,
    ralston: getIntegrator('ralston').accentColor,
    rk3: getIntegrator('rk3').accentColor,
    bogacki_shampine: getIntegrator('bogacki_shampine').accentColor,
    rk4: getIntegrator('rk4').accentColor,
    rk4_38: getIntegrator('rk4_38').accentColor,
    dopri5: getIntegrator('dopri5').accentColor,
  };

  const series = {
    id: trajectory.methodId,
    label: trajectory.methodLabel,
    color: palette[trajectory.methodId],
    points: trajectory.samples.map((sample) => ({
      time: sample.time,
      value: sample.energyDriftRatio,
    })),
  };

  energySeriesCache.set(trajectory, series);
  return series;
}

function getDivergenceSeries(
  reference: TrajectorySeries,
  candidate: TrajectorySeries,
): MetricPoint[] {
  let candidateCache = divergenceSeriesCache.get(reference);

  if (!candidateCache) {
    candidateCache = new WeakMap<TrajectorySeries, MetricPoint[]>();
    divergenceSeriesCache.set(reference, candidateCache);
  }

  const cached = candidateCache.get(candidate);
  if (cached) {
    return cached;
  }

  const points = computeDivergenceSeries(reference, candidate);
  candidateCache.set(candidate, points);
  return points;
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
