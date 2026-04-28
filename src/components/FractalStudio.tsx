import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import {
  fractalDepthLimits,
  presetDescription,
  type FractalCamera,
  type FractalQuality,
  type FractalFrameStats,
  type FractalPresetId,
  type FractalSettings,
} from '../fractals/types';
import { createFractalWorkerClient, type FractalWorkerClient } from '../fractals/workerClient';
import { measureFractalCanvas } from '../render/fractals';

const fractalPresetOptions = [
  { value: 'tree', label: 'Tree' },
  { value: 'koch', label: 'Koch' },
  { value: 'sierpinski', label: 'Sierpinski' },
] as const;

const defaultSettings: FractalSettings = {
  preset: 'tree',
  depth: 10,
  branchAngleDeg: 26,
  shrink: 0.7,
  rotationDeg: 0,
  lineWidth: 2.4,
  hueShift: 0,
  animate: true,
  glow: true,
};

const ANIMATION_FRAME_MS = 1000 / 15;
const SETTLE_DELAY_MS = 180;
const PREVIEW_STATS_INTERVAL_MS = 180;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1_000_000;

const defaultCamera: FractalCamera = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export function FractalStudio() {
  const [settings, setSettings] = useState(defaultSettings);
  const [settledSettings, setSettledSettings] = useState(defaultSettings);
  const [camera, setCamera] = useState(defaultCamera);
  const [settledCamera, setSettledCamera] = useState(defaultCamera);
  const [stats, setStats] = useState<FractalFrameStats | null>(null);
  const [isPending, setIsPending] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerClientRef = useRef<FractalWorkerClient | null>(null);
  const viewportRef = useRef<{ width: number; height: number } | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const statsUpdateAtRef = useRef(0);
  const statsKeyRef = useRef('');
  const hasFrameRef = useRef(false);
  const maxDepth = fractalDepthLimits[settings.preset];
  const renderedElements = stats?.renderedElements ?? 0;
  const detailRatio = stats ? `${(stats.detailRatio * 100).toFixed(2)}%` : '...';
  const renderQualityLabel = stats?.quality === 'preview' ? 'preview' : 'full';
  const renderIsSettled = useMemo(
    () =>
      settings.preset === settledSettings.preset &&
      settings.depth === settledSettings.depth &&
      settings.branchAngleDeg === settledSettings.branchAngleDeg &&
      settings.shrink === settledSettings.shrink &&
      settings.rotationDeg === settledSettings.rotationDeg &&
      settings.lineWidth === settledSettings.lineWidth &&
      settings.hueShift === settledSettings.hueShift &&
      settings.glow === settledSettings.glow &&
      settings.animate === settledSettings.animate &&
      camera.zoom === settledCamera.zoom &&
      camera.panX === settledCamera.panX &&
      camera.panY === settledCamera.panY,
    [settings, settledSettings, camera, settledCamera],
  );

  useEffect(() => {
    if (!canvasRef.current || workerClientRef.current) {
      return;
    }

    const workerClient = createFractalWorkerClient(canvasRef.current);
    workerClientRef.current = workerClient;

    return () => {
      workerClient.dispose();
      workerClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettledSettings(settings);
      setSettledCamera(camera);
    }, SETTLE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [settings, camera]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const updateViewport = () => {
      viewportRef.current = measureFractalCanvas(canvas, 1.15);
    };

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
      void requestRender(settings, camera, 'preview', settings.animate ? performance.now() / 1000 : 0, !hasFrameRef.current);
      if (!settings.animate) {
        void requestRender(settledSettings, settledCamera, 'full', 0, true);
      }
    });

    observer.observe(canvas);
    window.addEventListener('resize', updateViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewport);
    };
  }, [settings, settledSettings, camera, settledCamera]);

  useEffect(() => {
    if (settings.animate) {
      return;
    }

    void requestRender(settings, camera, 'preview', 0, !hasFrameRef.current);
  }, [settings, camera]);

  useEffect(() => {
    if (settledSettings.animate) {
      return;
    }

    void requestRender(settledSettings, settledCamera, 'full', 0, true);
  }, [settledSettings, settledCamera]);

  useEffect(() => {
    if (!settings.animate) {
      return;
    }

    let raf = 0;
    let lastTick = 0;

    const animate = (time: number) => {
      if (time - lastTick >= ANIMATION_FRAME_MS) {
        lastTick = time;
        void requestRender(
          settings,
          camera,
          renderIsSettled ? 'full' : 'preview',
          time / 1000,
          !hasFrameRef.current,
        );
      }

      raf = window.requestAnimationFrame(animate);
    };

    void requestRender(
      settings,
      camera,
      renderIsSettled ? 'full' : 'preview',
      performance.now() / 1000,
      !hasFrameRef.current,
    );
    raf = window.requestAnimationFrame(animate);

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [settings, camera, renderIsSettled]);

  async function requestRender(
    nextSettings: FractalSettings,
    nextCamera: FractalCamera,
    quality: FractalQuality,
    phase: number,
    showBusyIndicator: boolean,
  ): Promise<void> {
    const workerClient = workerClientRef.current;
    const viewport = viewportRef.current;

    if (!workerClient || !viewport) {
      return;
    }

    if (showBusyIndicator && quality === 'full') {
      setIsPending(true);
    }

    try {
      const nextStats = await workerClient.render({
        settings: nextSettings,
        camera: nextCamera,
        width: viewport.width,
        height: viewport.height,
        phase,
        quality,
      });

      hasFrameRef.current = true;
      commitStats(nextStats);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Fractal render superseded by a newer request'
      ) {
        return;
      }

      if (error instanceof Error) {
        console.error('Fractal worker failed:', error.message);
      }
    } finally {
      if (quality === 'full') {
        setIsPending(false);
      }
    }
  }

  function commitStats(nextStats: FractalFrameStats) {
    const now = performance.now();
    const key = `${nextStats.quality}:${nextStats.renderedElements}:${nextStats.detailRatio.toFixed(4)}:${nextStats.cappedByBudget}`;

    if (
      nextStats.quality === 'preview' &&
      key === statsKeyRef.current &&
      now - statsUpdateAtRef.current < PREVIEW_STATS_INTERVAL_MS
    ) {
      return;
    }

    if (
      nextStats.quality === 'preview' &&
      now - statsUpdateAtRef.current < PREVIEW_STATS_INTERVAL_MS &&
      nextStats.renderedElements === stats?.renderedElements
    ) {
      return;
    }

    statsKeyRef.current = key;
    statsUpdateAtRef.current = now;

    startTransition(() => {
      setStats(nextStats);
    });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const point = getCanvasPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    const scale = Math.exp(-event.deltaY * 0.0012);
    setCamera((current) => zoomCameraAt(current, point.x, point.y, scale));
  }

  function handleDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    const point = getCanvasPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    setCamera((current) => zoomCameraAt(current, point.x, point.y, 2));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !viewport || !canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) * viewport.width) / Math.max(1, rect.width);
    const dy = ((event.clientY - drag.y) * viewport.height) / Math.max(1, rect.height);
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setCamera((current) => ({
      ...current,
      panX: current.panX + dx,
      panY: current.panY + dy,
    }));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function zoomFromCenter(scale: number) {
    const viewport = viewportRef.current;

    if (!viewport) {
      setCamera((current) => ({
        ...current,
        zoom: clamp(current.zoom * scale, MIN_ZOOM, MAX_ZOOM),
      }));
      return;
    }

    setCamera((current) =>
      zoomCameraAt(current, viewport.width * 0.5, viewport.height * 0.5, scale),
    );
  }

  function resetCamera() {
    setCamera(defaultCamera);
  }

  function getCanvasPoint(clientX: number, clientY: number) {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;

    if (!viewport || !canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * viewport.width) / Math.max(1, rect.width),
      y: ((clientY - rect.top) * viewport.height) / Math.max(1, rect.height),
    };
  }

  function zoomCameraAt(
    current: FractalCamera,
    x: number,
    y: number,
    scale: number,
  ): FractalCamera {
    const viewport = viewportRef.current;
    const nextZoom = clamp(current.zoom * scale, MIN_ZOOM, MAX_ZOOM);

    if (!viewport || nextZoom === current.zoom) {
      return { ...current, zoom: nextZoom };
    }

    const ratio = nextZoom / current.zoom;
    const centerX = viewport.width * 0.5;
    const centerY = viewport.height * 0.5;

    return {
      zoom: nextZoom,
      panX: x - centerX - (x - centerX - current.panX) * ratio,
      panY: y - centerY - (y - centerY - current.panY) * ratio,
    };
  }

  return (
    <div className="app-grid fractal-grid">
      <aside className="controls-panel">
        <section className="panel-section panel-section-hero">
          <div className="panel-kicker">Фрактальная секция</div>
          <h1>Fractal Forge</h1>
          <p>
            Рекурсивная графика, самоподобные структуры и плотные технические
            паттерны на отдельном холсте.
          </p>
          <p className="hero-note">
            Worker теперь держит и расчёт, и сам рендер. Во время правки идёт
            быстрый preview, а после паузы дорисовывается полный кадр.
          </p>
        </section>

        <Section title="Режим">
          <SelectField
            label="Фрактал"
            value={settings.preset}
            options={fractalPresetOptions}
            description={presetDescription(settings.preset)}
            onChange={(value) =>
              setSettings((current) => {
                const preset = value as FractalPresetId;
                return {
                  ...current,
                  preset,
                  depth: Math.min(current.depth, fractalDepthLimits[preset]),
                };
              })
            }
          />
          <ToggleField
            label="Анимация"
            checked={settings.animate}
            description="При анимации вкладка живёт в preview-качестве, чтобы не душить интерфейс полной геометрией на каждый тик."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, animate: checked }))
            }
          />
          <ToggleField
            label="Свечение"
            checked={settings.glow}
            description="Glow теперь дорог только в финальном кадре. Preview рисуется без жирного размытия."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, glow: checked }))
            }
          />
        </Section>

        <Section title="Камера">
          <div className="fractal-camera-panel">
            <div className="zoom-readout">
              <span>Zoom</span>
              <strong>{formatZoom(camera.zoom)}</strong>
            </div>
            <div className="fractal-camera-actions">
              <button className="ghost-button" type="button" onClick={() => zoomFromCenter(0.5)}>
                -
              </button>
              <button className="ghost-button" type="button" onClick={resetCamera}>
                Reset
              </button>
              <button className="ghost-button" type="button" onClick={() => zoomFromCenter(2)}>
                +
              </button>
            </div>
          </div>
        </Section>

        <Section title="Геометрия">
          <RangeField
            label="Глубина"
            min={1}
            max={maxDepth}
            step={1}
            value={settings.depth}
            digits={0}
            description={`Потолок для текущего пресета ${maxDepth}. Микродеталь ниже экранной отсечки не плодится зря.`}
            onChange={(value) =>
              setSettings((current) => ({ ...current, depth: Math.round(value) }))
            }
          />
          <RangeField
            label="Угол ветвления"
            min={8}
            max={65}
            step={1}
            value={settings.branchAngleDeg}
            digits={0}
            description="Главная ручка для дерева; на остальных режимах работает как композиционный сдвиг."
            onChange={(value) =>
              setSettings((current) => ({ ...current, branchAngleDeg: value }))
            }
          />
          <RangeField
            label="Масштаб шага"
            min={0.45}
            max={0.82}
            step={0.01}
            value={settings.shrink}
            digits={2}
            description="Скорость уменьшения следующего уровня. Определяет плотность и разлёт структуры."
            onChange={(value) =>
              setSettings((current) => ({ ...current, shrink: value }))
            }
          />
          <RangeField
            label="Поворот"
            min={-180}
            max={180}
            step={1}
            value={settings.rotationDeg}
            digits={0}
            description="Поворачивает всю сцену и меняет посадку композиции в кадре."
            onChange={(value) =>
              setSettings((current) => ({ ...current, rotationDeg: value }))
            }
          />
        </Section>

        <Section title="Стиль">
          <RangeField
            label="Толщина линии"
            min={0.8}
            max={5}
            step={0.1}
            value={settings.lineWidth}
            digits={1}
            description="Меняет плотность штриха и читаемость формы."
            onChange={(value) =>
              setSettings((current) => ({ ...current, lineWidth: value }))
            }
          />
          <RangeField
            label="Hue shift"
            min={-180}
            max={180}
            step={1}
            value={settings.hueShift}
            digits={0}
            description="Сдвиг палитры между холодной техничной и более жёсткой постерной графикой."
            onChange={(value) =>
              setSettings((current) => ({ ...current, hueShift: value }))
            }
          />
        </Section>
      </aside>

      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <div className="panel-kicker">Fractal Forge</div>
            <h2>Рекурсивная графика</h2>
            <p>
              Отдельная секция для фракталов: высокая глубина, плотная геометрия
              и аккуратный вывод без забивания основного интерфейса.
            </p>
          </div>
          <div className="hero-stats">
            <StatChip label="режим" value={settings.preset} />
            <StatChip label="глубина" value={`${settings.depth}/${maxDepth}`} />
            <StatChip label="zoom" value={formatZoom(camera.zoom)} />
            <StatChip label="отрисовано" value={formatCompact(renderedElements)} />
            <StatChip label="деталь" value={detailRatio} />
            <StatChip label="качество" value={renderQualityLabel} />
          </div>
        </header>

        <section className="phenomenon-note">
          <div className="panel-kicker">Как это едет</div>
          <p>
            Тяжёлые перестройки теперь latest-wins: старый кадр не держит новый
            за яйца. Во время изменений рендер идёт в preview-режиме с жёстким
            quality budget, а потом добивается полная версия.
          </p>
        </section>

        <div className="capture-shell">
          <div
            className="viewport-card fractal-preview-card"
            onDoubleClick={handleDoubleClick}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerEnd}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onWheel={handleWheel}
          >
            <canvas className="fractal-canvas" ref={canvasRef} />
            {isPending ? (
              <div className="fractal-status-overlay">
                <span>Досчитываю полный кадр...</span>
              </div>
            ) : null}
          </div>
        </div>

        <section className="metrics-section">
          <div className="metrics-grid">
            <MetricSummaryCard
              title="Производительность"
              lines={[
                'Worker владеет рендером напрямую, без перегона полного bitmap на каждый кадр в main thread.',
                'Preview и full quality разведены: во время правки ограничивается depth budget и агрессивнее режется микродеталь.',
                `Сейчас реально рисуется ${formatCompact(renderedElements)} элементов вместо полной теоретической лавины.`,
              ]}
            />
            <MetricSummaryCard
              title="Текущий режим"
              lines={[
                presetDescription(settings.preset),
                `Глубина ${settings.depth} из ${maxDepth} для текущего режима.`,
                `Zoom ${formatZoom(camera.zoom)} · Hue shift ${settings.hueShift.toFixed(0)}° · поворот ${settings.rotationDeg.toFixed(0)}° · ${renderIsSettled ? 'full ready' : 'preview pending'}`,
              ]}
            />
            <MetricSummaryCard
              title="Следующие режимы"
              lines={[
                'Mandelbrot, Julia и orbit traps на том же worker-каркасе.',
                'Экспорт PNG / SVG и сохранение фрактальных пресетов.',
                'Пакетный рендер кадров без убийства интерфейса.',
              ]}
            />
            <MetricSummaryCard
              title="Секция"
              lines={[
                'Это рабочая фрактальная секция, а не заглушка.',
                'Старая тяжёлая задача теперь не блокирует новую при смене пресета или слайдера.',
                'Повышенная глубина теперь упирается в quality budget, а не в тупую объектную рекурсию.',
              ]}
            />
          </div>
        </section>
      </section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-section">
      <div className="section-title">{title}</div>
      <div className="section-content">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  description,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  description?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description ? <small className="field-description">{description}</small> : null}
    </label>
  );
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  digits,
  description,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  digits: number;
  description?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-field">
      <div className="range-field-head">
        <span>{label}</span>
        <input
          className="range-number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value.toFixed(digits)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {description ? <small className="field-description">{description}</small> : null}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  description,
  onChange,
}: {
  label: string;
  checked: boolean;
  description?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-field">
      <div className="toggle-head">
        <span>{label}</span>
        <input
          checked={checked}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
      </div>
      {description ? <small className="field-description">{description}</small> : null}
    </label>
  );
}

function MetricSummaryCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <article className="metric-card">
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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return String(value);
}

function formatZoom(value: number): string {
  if (value >= 1000) {
    return `${value.toExponential(1)}x`;
  }

  if (value >= 10) {
    return `${value.toFixed(1)}x`;
  }

  return `${value.toFixed(2)}x`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
