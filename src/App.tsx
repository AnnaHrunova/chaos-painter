import { startTransition, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { ControlsPanel } from './components/ControlsPanel';
import { ComparisonView } from './components/ComparisonView';
import { MetricsPanel } from './components/MetricsPanel';
import { StudioViewport } from './components/StudioViewport';
import { defaultSettings, degreesToRadians, toInitialState, toPendulumParams } from './app/model';
import { presets } from './app/presets';
import type { MetricPoint, TrajectorySeries } from './physics/types';
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from './simulation/workerProtocol';

export default function App() {
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
  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/simulationWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      const message = event.data;

      if (message.requestId !== latestRequestIdRef.current) {
        return;
      }

      if (message.type === 'error') {
        console.error('Simulation worker failed:', message.message);
        setIsPending(false);
        return;
      }

      startTransition(() => {
        setPrimaryTrajectory(message.primaryTrajectory);
        setReferenceTrajectory(message.referenceTrajectory);
        setComparisonTrajectories(message.comparisonTrajectories);
        setSensitivitySeries(message.sensitivitySeries);
        setFrameIndex(0);
        setIsPending(false);
      });
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) {
      return;
    }

    setIsPending(true);
    const initialState = toInitialState(settings);
    const params = toPendulumParams(settings);
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const message: SimulationWorkerRequest = {
      type: 'simulate',
      requestId,
      workspaceMode: settings.workspaceMode,
      methodId: settings.methodId,
      dt: settings.dt,
      steps: settings.steps,
      initialState,
      params,
      nearbyState: {
        ...initialState,
        theta2: initialState.theta2 + degreesToRadians(0.05),
      },
    };
    workerRef.current.postMessage(message);
  }, [
    generation,
    settings.workspaceMode,
    settings.methodId,
    settings.dt,
    settings.steps,
    settings.theta1Deg,
    settings.theta2Deg,
    settings.omega1,
    settings.omega2,
    settings.m1,
    settings.m2,
    settings.l1,
    settings.l2,
    settings.g,
  ]);

  useEffect(() => {
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
    isPlaying,
    primaryTrajectory,
    comparisonTrajectories,
    settings.workspaceMode,
    settings.playbackStride,
  ]);

  const heroTrajectory =
    settings.workspaceMode === 'comparison'
      ? comparisonTrajectories.find((trajectory) => trajectory.methodId === 'rk4') ??
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
              <div className="panel-kicker">Интерактивная лаборатория</div>
              <h2>
                {settings.workspaceMode === 'comparison'
                  ? 'Сравнение интеграторов'
                  : settings.visualMode === 'chaosArt'
                    ? 'Режим хаос-арта'
                    : 'Студия одной системы'}
              </h2>
              <p>
                Одна и та же физика, но разные приближения. Уменьшаешь dt - и
                численная ложь становится тише. Берёшь Euler - и она орёт уже
                в полный голос.
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
            <div className="panel-kicker">Что ты видишь</div>
            <p>
              Двойной маятник - классическая хаотическая система: её движение
              полностью детерминировано, но крошечные различия в начальных
              условиях или численном приближении быстро нарастают со временем.
              Поэтому он отлично показывает и реальную чувствительность к
              малым изменениям, и ложные артефакты, которые вносит грубая
              интеграция.
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
