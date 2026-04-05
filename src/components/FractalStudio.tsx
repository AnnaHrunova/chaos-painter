import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  drawFractalScene,
  estimateFractalElements,
  presetDescription,
  type FractalPresetId,
  type FractalSettings,
} from '../render/fractals';

const fractalPresetOptions = [
  { value: 'tree', label: 'Tree' },
  { value: 'koch', label: 'Koch' },
  { value: 'sierpinski', label: 'Sierpinski' },
] as const;

const defaultSettings: FractalSettings = {
  preset: 'tree',
  depth: 7,
  branchAngleDeg: 26,
  shrink: 0.7,
  rotationDeg: 0,
  lineWidth: 2.4,
  hueShift: 0,
  animate: true,
  glow: true,
};

export function FractalStudio() {
  const [settings, setSettings] = useState(defaultSettings);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrame = 0;
    const drawNow = (time: number) => {
      if (!canvasRef.current) {
        return;
      }

      drawFractalScene({
        canvas: canvasRef.current,
        settings,
        phase: settings.animate ? time / 1000 : 0,
      });
    };

    const draw = (time: number) => {
      drawNow(time);

      if (settings.animate) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    draw(0);

    const handleResize = () => {
      drawNow(performance.now());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [settings]);

  const estimatedElements = estimateFractalElements(settings.preset, settings.depth);

  return (
    <div className="app-grid fractal-grid">
      <aside className="controls-panel">
        <section className="panel-section panel-section-hero">
          <div className="panel-kicker">Генеративная геометрия</div>
          <h1>Fractal Forge</h1>
          <p>
            Вторая лаборатория в проекте: здесь рекурсия, самоподобие и
            заготовка под будущие полноценные фрактальные режимы.
          </p>
          <p className="hero-note">
            Сейчас это уже рабочий черновик, а не пустая заглушка: можно
            гонять дерево, Коха и Серпинского, а потом без боли втащить сюда
            Mandelbrot, Julia, orbit traps и прочие приятные безобразия.
          </p>
        </section>

        <Section title="Сюжет">
          <SelectField
            label="Фрактал"
            value={settings.preset}
            options={fractalPresetOptions}
            description={presetDescription(settings.preset)}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                preset: value as FractalPresetId,
              }))
            }
          />
          <ToggleField
            label="Анимация"
            checked={settings.animate}
            description="Немного живого движения, чтобы сразу видеть, как ведут себя угол, поворот и глубина."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, animate: checked }))
            }
          />
          <ToggleField
            label="Свечение"
            checked={settings.glow}
            description="Подмешивает мягкий glow к линиям и треугольникам. Чисто визуальная штука, но выглядит бодро."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, glow: checked }))
            }
          />
        </Section>

        <Section title="Геометрия">
          <RangeField
            label="Глубина"
            min={1}
            max={settings.preset === 'koch' ? 6 : 9}
            step={1}
            value={settings.depth}
            digits={0}
            description="Сколько уровней рекурсии рисовать. Дальше детали растут экспоненциально, и браузер уже начинает сопеть."
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
            description="Сильнее всего влияет на дерево; в других пресетах остаётся как ручка для будущих вариаций."
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
            description="Насколько быстро уменьшается следующий уровень рекурсии. Для дерева это одна из главных ручек."
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
            description="Поворачивает общую композицию. Удобно для поиска более собранного или более наглого кадра."
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
            description="Влияет на плотность графики и на то, насколько результат смотрится инженерно или почти плакатно."
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
            description="Сдвиг палитры. Можно быстро уйти в холодную математику или в более тёплый арт-режим."
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
            <h2>Рекурсия как отдельная лаборатория</h2>
            <p>
              Тут уже можно собирать базовый генеративный pipeline: пресет,
              глубина, геометрия и стиль. Дальше сюда легко наращивать и
              настоящие сложные фракталы, и экспорт, и batch-рендер.
            </p>
          </div>
          <div className="hero-stats">
            <StatChip label="режим" value={settings.preset} />
            <StatChip label="глубина" value={String(settings.depth)} />
            <StatChip label="элементы" value={formatCompact(estimatedElements)} />
            <StatChip label="анимация" value={settings.animate ? 'on' : 'off'} />
          </div>
        </header>

        <section className="phenomenon-note">
          <div className="panel-kicker">Зачем это здесь</div>
          <p>
            Маятники показывают хаос и численные ошибки. Фракталы добавляют
            вторую ось проекта: рекурсию, самоподобие и генеративную графику.
            Вместе это уже похоже на небольшую студию про увлекательную
            математику, а не на один-единственный демо-экран.
          </p>
        </section>

        <div className="capture-shell">
          <div className="viewport-card fractal-preview-card">
            <canvas className="fractal-canvas" ref={canvasRef} />
          </div>
        </div>

        <section className="metrics-section">
          <div className="metrics-grid">
            <MetricSummaryCard
              title="Состояние заготовки"
              lines={[
                'Есть живая отрисовка и базовые ручки управления.',
                'Есть отдельная вкладка, визуально связанная с Chaos Painter.',
                'Есть понятная точка роста под Mandelbrot, Julia и пакетный рендер.',
              ]}
            />
            <MetricSummaryCard
              title="Что можно вкрутить дальше"
              lines={[
                'Экспорт PNG / SVG и сохранение пресетов.',
                'Шейдерный рендер для тяжёлых фракталов.',
                'Параметрические анимации и пакетные серии кадров.',
              ]}
            />
            <MetricSummaryCard
              title="Текущий пресет"
              lines={[
                presetDescription(settings.preset),
                `Оценка элементов: ${formatCompact(estimatedElements)}`,
                `Поворот ${settings.rotationDeg.toFixed(0)}° · hue shift ${settings.hueShift.toFixed(0)}°`,
              ]}
            />
            <MetricSummaryCard
              title="Наблюдение"
              lines={[
                'Даже простая рекурсия уже даёт богатый визуальный язык.',
                'Дальше можно спокойно наращивать вычислительную сложность, не ломая интерфейс.',
                'Короче, каркас под фрактальный режим уже не стыдный.',
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
