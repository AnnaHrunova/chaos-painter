import { startTransition, useEffect, useRef, useState } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { ComparisonView } from './components/ComparisonView';
import { FractalStudio } from './components/FractalStudio';
import { MetricsPanel } from './components/MetricsPanel';
import { StudioViewport } from './components/StudioViewport';
import { defaultSettings, degreesToRadians, toInitialState, toPendulumParams } from './app/model';
import { presets } from './app/presets';
import { comparisonMethodIds, getReferenceIntegrator } from './integrators';
import { computeDivergenceSeries } from './simulation/comparison';
import { runTrajectoryBatch, type TrajectoryTask } from './simulation/workerClient';
import type { MetricPoint, TrajectorySeries } from './physics/types';

type LabView = 'pendulum' | 'fractal';

export default function App() {
  const [activeLab, setActiveLab] = useState<LabView>('pendulum');
  const [settings, setSettings] = useState(defaultSettings);
  const [primaryTrajectory, setPrimaryTrajectory] = useState<TrajectorySeries | null>(null);
  const [referenceTrajectory, setReferenceTrajectory] = useState<TrajectorySeries | null>(null);
  const [comparisonTrajectories, setComparisonTrajectories] = useState<TrajectorySeries[]>([]);
  const [sensitivitySeries, setSensitivitySeries] = useState<MetricPoint[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPending, setIsPending] = useState(true);
  const [generation, setGeneration] = useState(0);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const trajectoryCacheRef = useRef<Map<string, TrajectorySeries>>(new Map());

  useEffect(() => {
    if (activeLab !== 'pendulum') {
      return;
    }

    setIsPending(true);
    const initialState = toInitialState(settings);
    const params = toPendulumParams(settings);
    const nearbyState = {
      ...initialState,
      theta4: initialState.theta4 + degreesToRadians(0.05),
    };
    const referenceMethod = getReferenceIntegrator();
    const cache = trajectoryCacheRef.current;

    const buildTaskKey = (
      methodId: string,
      state: typeof initialState,
    ) =>
      [
        methodId,
        settings.dt.toFixed(6),
        settings.steps,
        state.theta1.toFixed(8),
        state.omega1.toFixed(8),
        state.theta2.toFixed(8),
        state.omega2.toFixed(8),
        state.theta3.toFixed(8),
        state.omega3.toFixed(8),
        state.theta4.toFixed(8),
        state.omega4.toFixed(8),
        params.m1.toFixed(6),
        params.m2.toFixed(6),
        params.m3.toFixed(6),
        params.m4.toFixed(6),
        params.l1.toFixed(6),
        params.l2.toFixed(6),
        params.l3.toFixed(6),
        params.l4.toFixed(6),
        params.g.toFixed(6),
      ].join('|');

    const taskMap = new Map<string, TrajectoryTask>();

    const addTask = (methodId: TrajectoryTask['methodId'], state: typeof initialState) => {
      const key = buildTaskKey(methodId, state);
      if (!cache.has(key) && !taskMap.has(key)) {
        taskMap.set(key, {
          key,
          methodId,
          dt: settings.dt,
          steps: settings.steps,
          initialState: state,
          params,
        });
      }
      return key;
    };

    let primaryKey: string | null = null;
    let nearbyKey: string | null = null;
    let referenceKey: string | null = null;
    let comparisonKeys: string[] = [];

    if (settings.workspaceMode === 'comparison') {
      comparisonKeys = comparisonMethodIds.map((methodId) => addTask(methodId, initialState));
      referenceKey = buildTaskKey(referenceMethod.id, initialState);
    } else {
      primaryKey = addTask(settings.methodId, initialState);
      referenceKey = addTask(referenceMethod.id, initialState);
      nearbyKey = addTask(settings.methodId, nearbyState);
    }

    const batch = runTrajectoryBatch([...taskMap.values()]);
    let cancelled = false;

    batch.promise
      .then((freshResults) => {
        if (cancelled) {
          return;
        }

        for (const [key, trajectory] of freshResults) {
          rememberTrajectory(cache, key, trajectory);
        }

        const comparisonSeries = comparisonKeys
          .map((key) => cache.get(key))
          .filter((trajectory): trajectory is TrajectorySeries => Boolean(trajectory));
        const primary = primaryKey ? cache.get(primaryKey) ?? null : null;
        const reference = referenceKey ? cache.get(referenceKey) ?? null : null;
        const nearby = nearbyKey ? cache.get(nearbyKey) ?? null : null;

        startTransition(() => {
          setPrimaryTrajectory(primary);
          setReferenceTrajectory(reference);
          setComparisonTrajectories(comparisonSeries);
          setSensitivitySeries(
            primary && nearby ? computeDivergenceSeries(primary, nearby) : [],
          );
          setFrameIndex(0);
          setIsPending(false);
        });
      })
      .catch((error: Error) => {
        if (cancelled) {
          return;
        }

        console.error('Simulation worker batch failed:', error.message);
        setIsPending(false);
      });

    return () => {
      cancelled = true;
      batch.cancel();
    };
  }, [
    activeLab,
    generation,
    settings.workspaceMode,
    settings.methodId,
    settings.dt,
    settings.steps,
    settings.theta1Deg,
    settings.theta2Deg,
    settings.theta3Deg,
    settings.theta4Deg,
    settings.omega1,
    settings.omega2,
    settings.omega3,
    settings.omega4,
    settings.m1,
    settings.m2,
    settings.m3,
    settings.m4,
    settings.l1,
    settings.l2,
    settings.l3,
    settings.l4,
    settings.g,
  ]);

  useEffect(() => {
    if (activeLab !== 'pendulum') {
      return;
    }

    const activeTrajectory =
      settings.workspaceMode === 'comparison'
        ? comparisonTrajectories[comparisonTrajectories.length - 1] ?? null
        : primaryTrajectory;

    if (!isPlaying || !activeTrajectory) {
      return;
    }

    const lastFrame = activeTrajectory.samples.length - 1;
    let animationFrame = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      if (!lastTime) {
        lastTime = time;
      }

      const elapsed = time - lastTime;
      const frameDuration = 1000 / 60;

      if (elapsed >= frameDuration) {
        const stepsToAdvance =
          Math.max(1, Math.floor(elapsed / frameDuration)) * settings.playbackStride;

        lastTime = time;

        setFrameIndex((current) => {
          const next = Math.min(lastFrame, current + stepsToAdvance);

          if (next >= lastFrame) {
            setIsPlaying(false);
          }

          return next;
        });
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activeLab,
    isPlaying,
    primaryTrajectory,
    comparisonTrajectories,
    settings.workspaceMode,
    settings.playbackStride,
  ]);

  const referenceIntegrator = getReferenceIntegrator();
  const heroTrajectory =
    settings.workspaceMode === 'comparison'
      ? comparisonTrajectories.find((trajectory) => trajectory.methodId === referenceIntegrator.id) ??
        comparisonTrajectories[comparisonTrajectories.length - 1] ??
        null
      : primaryTrajectory;

  const currentSample = heroTrajectory?.samples[frameIndex] ?? null;

  function handleSettingsChange(patch: Partial<typeof settings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function handleTogglePlay() {
    const activeTrajectory =
      settings.workspaceMode === 'comparison'
        ? comparisonTrajectories[comparisonTrajectories.length - 1] ?? null
        : primaryTrajectory;

    if (activeTrajectory && frameIndex >= activeTrajectory.samples.length - 1) {
      setFrameIndex(0);
    }

    setIsPlaying((current) => !current);
  }

  function handleReset() {
    setFrameIndex(0);
    setIsPlaying(false);
  }

  function handleRegenerate() {
    setGeneration((current) => current + 1);
    setFrameIndex(0);
    setIsPlaying(true);
  }

  async function handleExport() {
    if (!captureRef.current) {
      return;
    }

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(captureRef.current, {
      backgroundColor: '#08121c',
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `chaos-painter-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="hub-shell">
        <header className="hub-header">
          <div className="hub-copy">
            <div className="panel-kicker">Численные системы и генеративная графика</div>
            <h1>Chaos Painter</h1>
            <p>
              Две секции в одном проекте: Pendulum Lab для хаотической динамики
              четверного маятника и Fractal Forge для плотной рекурсивной
              графики.
            </p>
          </div>
          <div aria-label="Выбор лаборатории" className="lab-switcher" role="tablist">
            <button
              aria-selected={activeLab === 'pendulum'}
              className={activeLab === 'pendulum' ? 'lab-button lab-button-active' : 'lab-button'}
              onClick={() => setActiveLab('pendulum')}
              role="tab"
              type="button"
            >
              Pendulum Lab
            </button>
            <button
              aria-selected={activeLab === 'fractal'}
              className={activeLab === 'fractal' ? 'lab-button lab-button-active' : 'lab-button'}
              onClick={() => setActiveLab('fractal')}
              role="tab"
              type="button"
            >
              Fractal Forge
            </button>
          </div>
        </header>

        {activeLab === 'pendulum' ? (
          <div className="app-grid">
            <ControlsPanel
              settings={settings}
              isPlaying={isPlaying}
              isPending={isPending}
              presets={presets}
              onChange={handleSettingsChange}
              onApplyPreset={(preset) => {
                setSettings((current) => ({ ...current, ...preset.patch }));
                setFrameIndex(0);
                setIsPlaying(true);
              }}
              onTogglePlay={handleTogglePlay}
              onReset={handleReset}
              onRegenerate={handleRegenerate}
              onExport={handleExport}
            />

            <section className="workspace-shell">
              <header className="workspace-header">
                <div>
                  <div className="panel-kicker">Pendulum Lab</div>
                  <h2>
                    {settings.workspaceMode === 'comparison'
                      ? 'Интеграторы'
                      : settings.visualMode === 'chaosArt'
                        ? 'Chaos Art'
                        : 'Четверной маятник'}
                  </h2>
                  <p>
                    Четверной маятник, численные методы и наглядная разница
                    между аккуратной интеграцией и грубым развалом траектории.
                  </p>
                </div>
                <div className="hero-stats">
                  <StatChip label="dt" value={settings.dt.toFixed(3)} />
                  <StatChip label="шаги" value={String(settings.steps)} />
                  <StatChip
                    label="время"
                    value={currentSample ? `${currentSample.time.toFixed(2)} s` : '...'}
                  />
                  <StatChip
                    label="макс. дрейф"
                    value={
                      heroTrajectory
                        ? `${(heroTrajectory.summary.maxEnergyDriftRatio * 100).toFixed(2)}%`
                        : '...'
                    }
                  />
                </div>
              </header>

              <section className="phenomenon-note">
                <div className="panel-kicker">Что происходит</div>
                <p>
                  Здесь хаос не декоративный. Четверной маятник быстро
                  разносит малые ошибки, поэтому сразу видно, где интегратор
                  держит систему, а где уже начинается численная отсебятина.
                </p>
              </section>

              <div className="capture-shell" ref={captureRef}>
                {settings.workspaceMode === 'comparison' ? (
                  <ComparisonView
                    trajectories={comparisonTrajectories}
                    frameIndex={frameIndex}
                    settings={settings}
                  />
                ) : (
                  <StudioViewport
                    trajectory={primaryTrajectory}
                    referenceTrajectory={referenceTrajectory}
                    frameIndex={frameIndex}
                    settings={settings}
                  />
                )}
              </div>

              <MetricsPanel
                workspaceMode={settings.workspaceMode}
                primaryTrajectory={primaryTrajectory}
                comparisonTrajectories={comparisonTrajectories}
                sensitivitySeries={sensitivitySeries}
                frameIndex={frameIndex}
              />
            </section>
          </div>
        ) : (
          <FractalStudio />
        )}
      </div>
    </main>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function rememberTrajectory(
  cache: Map<string, TrajectorySeries>,
  key: string,
  trajectory: TrajectorySeries,
) {
  if (cache.has(key)) {
    cache.delete(key);
  }

  cache.set(key, trajectory);

  const maxEntries = 48;
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }
}
