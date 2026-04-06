import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  fractalDepthLimits,
  presetDescription,
  type FractalFrameStats,
  type FractalPresetId,
  type FractalSettings,
} from '../fractals/types';
import { requestFractalFrame } from '../fractals/workerClient';
import { prepareFractalCanvas, presentFractalBitmap } from '../render/fractals';

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

const ANIMATION_FRAME_MS = 1000 / 18;

export function FractalStudio() {
  const [settings, setSettings] = useState(defaultSettings);
  const [stats, setStats] = useState<FractalFrameStats | null>(null);
  const [isPending, setIsPending] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    let disposed = false;
    let raf = 0;
    let inFlight = false;
    let queuedPhase: number | null = null;
    let lastAnimationTick = 0;
    let requestSerial = 0;

    const requestScene = (phase: number, showBusyIndicator: boolean) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const canvasInfo = prepareFractalCanvas(canvas, 1.4);

      if (!canvasInfo) {
        return;
      }

      if (inFlight) {
        queuedPhase = phase;
        return;
      }

      inFlight = true;
      const currentRequest = requestSerial + 1;
      requestSerial = currentRequest;
      if (showBusyIndicator) {
        setIsPending(true);
      }

      requestFractalFrame({
        settings,
        width: canvasInfo.width,
        height: canvasInfo.height,
        phase,
      })
        .then((frame) => {
          if (disposed || currentRequest !== requestSerial) {
            frame.bitmap.close();
            return;
          }

          if (!canvasRef.current) {
            frame.bitmap.close();
            return;
          }

          presentFractalBitmap(canvasRef.current, frame.bitmap);

          startTransition(() => {
            setStats(frame.stats);
            setIsPending(false);
          });
        })
        .catch((error: Error) => {
          if (disposed || currentRequest !== requestSerial) {
            return;
          }

          console.error('Fractal worker failed:', error.message);
          setIsPending(false);
        })
        .finally(() => {
          if (disposed || currentRequest !== requestSerial) {
            return;
          }

          inFlight = false;

          if (queuedPhase !== null) {
            const phaseToRender = queuedPhase;
            queuedPhase = null;
            requestScene(phaseToRender, false);
          }
        });
    };

    requestScene(0, true);

    const handleResize = () => {
      requestScene(settings.animate ? performance.now() / 1000 : 0, true);
    };

    window.addEventListener('resize', handleResize);

    const animate = (time: number) => {
      if (disposed || !settings.animate) {
        return;
      }

      if (time - lastAnimationTick >= ANIMATION_FRAME_MS) {
        lastAnimationTick = time;
        requestScene(time / 1000, false);
      }

      raf = window.requestAnimationFrame(animate);
    };

    if (settings.animate) {
      raf = window.requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [settings]);

  const maxDepth = fractalDepthLimits[settings.preset];
  const renderedElements = stats?.renderedElements ?? 0;
  const detailRatio = stats ? `${(stats.detailRatio * 100).toFixed(2)}%` : '...';

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
            Сцена считается и растеризуется в worker, а на экран прилетает уже
            готовый кадр. Поэтому UI не захлёбывается от рекурсивной лавины.
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
            description="Worker перестраивает кадры в спокойном темпе, без лишней драки за главный поток."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, animate: checked }))
            }
          />
          <ToggleField
            label="Свечение"
            checked={settings.glow}
            description="Добавляет мягкий glow поверх уже собранного кадра."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, glow: checked }))
            }
          />
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
            <StatChip label="отрисовано" value={formatCompact(renderedElements)} />
            <StatChip label="деталь" value={detailRatio} />
          </div>
        </header>

        <section className="phenomenon-note">
          <div className="panel-kicker">Как это едет</div>
          <p>
            Теоретическая глубина сама по себе никому не нужна. Важна видимая
            детализация, поэтому мелочь режется адаптивно, а тяжёлый расчёт и
            растеризация уехали из main thread в worker.
          </p>
        </section>

        <div className="capture-shell">
          <div className="viewport-card fractal-preview-card">
            <canvas className="fractal-canvas" ref={canvasRef} />
            {isPending ? (
              <div className="fractal-status-overlay">
                <span>Собираю следующий кадр...</span>
              </div>
            ) : null}
          </div>
        </div>

        <section className="metrics-section">
          <div className="metrics-grid">
            <MetricSummaryCard
              title="Производительность"
              lines={[
                'Расчёт и растеризация кадра вынесены в worker.',
                'Pixel ratio у фрактального холста ограничен, чтобы не жечь GPU впустую.',
                `Сейчас реально рисуется ${formatCompact(renderedElements)} элементов вместо полной теоретической лавины.`,
              ]}
            />
            <MetricSummaryCard
              title="Текущий режим"
              lines={[
                presetDescription(settings.preset),
                `Глубина ${settings.depth} из ${maxDepth} для текущего режима.`,
                `Hue shift ${settings.hueShift.toFixed(0)}° · поворот ${settings.rotationDeg.toFixed(0)}°`,
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
                'Главный поток больше не рисует рекурсивную геометрию сам.',
                'Повышенная глубина теперь даёт картинку, а не только тормоза.',
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
