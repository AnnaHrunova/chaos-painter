import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  fractalDepthLimits,
  presetDescription,
  type FractalPresetId,
  type FractalScene,
  type FractalSettings,
} from '../fractals/types';
import { requestFractalScene } from '../fractals/workerClient';
import { drawFractalScene, prepareFractalCanvas } from '../render/fractals';

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

const ANIMATION_FRAME_MS = 1000 / 24;

export function FractalStudio() {
  const [settings, setSettings] = useState(defaultSettings);
  const [scene, setScene] = useState<FractalScene | null>(null);
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

    const requestScene = (phase: number) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const canvasInfo = prepareFractalCanvas(canvas);

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
      setIsPending(true);

      requestFractalScene({
        settings,
        width: canvasInfo.width,
        height: canvasInfo.height,
        phase,
      })
        .then((nextScene) => {
          if (disposed || currentRequest !== requestSerial) {
            return;
          }

          startTransition(() => {
            setScene(nextScene);
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
            requestScene(phaseToRender);
          }
        });
    };

    requestScene(0);

    const handleResize = () => {
      requestScene(settings.animate ? performance.now() / 1000 : 0);
    };

    window.addEventListener('resize', handleResize);

    const animate = (time: number) => {
      if (disposed || !settings.animate) {
        return;
      }

      if (time - lastAnimationTick >= ANIMATION_FRAME_MS) {
        lastAnimationTick = time;
        requestScene(time / 1000);
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

  useEffect(() => {
    if (!canvasRef.current || !scene) {
      return;
    }

    drawFractalScene(canvasRef.current, scene, settings);
  }, [scene, settings]);

  const maxDepth = fractalDepthLimits[settings.preset];
  const renderedElements = scene?.renderedElements ?? 0;
  const detailRatio = scene ? `${(scene.detailRatio * 100).toFixed(2)}%` : '...';

  return (
    <div className="app-grid fractal-grid">
      <aside className="controls-panel">
        <section className="panel-section panel-section-hero">
          <div className="panel-kicker">Генеративная геометрия</div>
          <h1>Fractal Forge</h1>
          <p>
            Отдельная лаборатория для рекурсии, самоподобия и генеративных
            структур. Здесь уже не придаток к другому режиму, а самостоятельный
            инструмент для фрактальной графики.
          </p>
          <p className="hero-note">
            Геометрия теперь считается в worker и режется адаптивно по размеру
            видимой детали. Поэтому глубину можно крутить сильно выше прежнего,
            не превращая интерфейс в слайд-шоу.
          </p>
        </section>

        <Section title="Сюжет">
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
            description="Анимируется не браузерный лаг, а реальная перестройка сцены через worker в умеренном темпе."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, animate: checked }))
            }
          />
          <ToggleField
            label="Свечение"
            checked={settings.glow}
            description="Добавляет мягкий glow поверх уже рассчитанной геометрии. На производительность почти не влияет."
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
            description={`Потолок для текущего пресета поднят до ${maxDepth}. Мелочь меньше пиксельной отсечки всё равно не рендерится, так что глубина стала полезной, а не тупо дорогой.`}
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
            description="Сильнее всего влияет на дерево; в остальных пресетах остаётся как художественная ручка под будущие расширения."
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
            description="Насколько быстро мельчает следующий уровень. Для дерева эта ручка решает, будет структура собранной или расползётся по кадру."
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
            description="Поворачивает композицию целиком. Полезно, когда хочешь не просто другой фрактал, а другой характер кадра."
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
            description="Меняет плотность и читаемость. При высокой глубине тонкие линии обычно работают чище."
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
            description="Сдвиг палитры: можно быстро уйти в холодную техничную графику или в более ядовитую постерную подачу."
            onChange={(value) =>
              setSettings((current) => ({ ...current, hueShift: value }))
            }
          />
        </Section>
      </aside>

      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <div className="panel-kicker">Фрактальная мастерская</div>
            <h2>Рекурсия как самостоятельная студия</h2>
            <p>
              Эта вкладка теперь живёт отдельно: worker считает геометрию,
              холст только рисует, а глубина упирается скорее в видимую деталь,
              чем в тупую нагрузку на главный поток.
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
          <div className="panel-kicker">Что здесь важно</div>
          <p>
            Важна не голая теоретическая глубина сама по себе, а видимая
            детализация. Поэтому сцена строится адаптивно: слишком мелкие
            элементы просто не плодятся зря, а вычислительная тяжесть уезжает в
            отдельный worker.
          </p>
        </section>

        <div className="capture-shell">
          <div className="viewport-card fractal-preview-card">
            <canvas className="fractal-canvas" ref={canvasRef} />
            {isPending ? (
              <div className="fractal-status-overlay">
                <span>Пересчитываю фрактальную сцену...</span>
              </div>
            ) : null}
          </div>
        </div>

        <section className="metrics-section">
          <div className="metrics-grid">
            <MetricSummaryCard
              title="Производительность"
              lines={[
                'Рекурсивная геометрия считается в отдельном worker, а не в главном UI-потоке.',
                'Адаптивная отсечка не рисует детали меньше пиксельного порога.',
                `Фактически отрисовано ${formatCompact(renderedElements)} элементов вместо теоретической лавины.`,
              ]}
            />
            <MetricSummaryCard
              title="Текущий пресет"
              lines={[
                presetDescription(settings.preset),
                `Глубина ${settings.depth} из ${maxDepth} для текущего режима.`,
                `Hue shift ${settings.hueShift.toFixed(0)}° · поворот ${settings.rotationDeg.toFixed(0)}°`,
              ]}
            />
            <MetricSummaryCard
              title="Что можно вкрутить дальше"
              lines={[
                'Mandelbrot, Julia и orbit traps на том же worker-каркасе.',
                'Экспорт PNG / SVG и сохранение фрактальных пресетов.',
                'Пакетный рендер кадров без убийства интерфейса.',
              ]}
            />
            <MetricSummaryCard
              title="Состояние вкладки"
              lines={[
                'Это уже не пустая болванка, а рабочая фрактальная лаборатория.',
                'Основные тормоза из-за рекурсии вынесены из main thread.',
                'Потолок глубины поднят, и теперь он реально имеет смысл.',
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
