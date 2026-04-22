import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getElectricPresetDescription,
  getElectricPresetLabel,
  renderElectricFieldScene,
  type ElectricFrameStats,
  type ElectricPresetId,
  type ElectricSettings,
  type ElectricViewMode,
} from '../render/electricField';

const presetOptions = [
  { value: 'dipole', label: 'Dipole' },
  { value: 'quadrupole', label: 'Quadrupole' },
  { value: 'capacitor', label: 'Plate Gate' },
] as const;

const viewOptions = [
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'potential', label: 'Potential' },
  { value: 'lines', label: 'Field Lines' },
] as const;

const defaultSettings: ElectricSettings = {
  preset: 'dipole',
  viewMode: 'hybrid',
  fieldStrength: 14,
  lineDensity: 18,
  probeDrift: 1,
  animate: true,
  glow: true,
};

export function ElectricStudio() {
  const [settings, setSettings] = useState(defaultSettings);
  const [stats, setStats] = useState<ElectricFrameStats | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statsKeyRef = useRef('');
  const statsAtRef = useRef(0);

  const detailLabel = useMemo(() => {
    if (!stats) {
      return '...';
    }

    return `${stats.sampleStep}px / ${stats.streamlineCount} lines`;
  }, [stats]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    let raf = 0;
    let resizeFrame = 0;

    const draw = (time: number) => {
      const nextStats = renderElectricFieldScene({
        canvas,
        settings,
        phase: settings.animate ? time / 1000 : 0,
      });
      const nextKey = [
        nextStats.charges,
        nextStats.streamlineCount,
        nextStats.sampleStep,
        nextStats.maxField.toFixed(3),
        nextStats.minPotential.toFixed(3),
        nextStats.maxPotential.toFixed(3),
      ].join(':');
      const now = performance.now();
      if (
        !settings.animate ||
        nextKey !== statsKeyRef.current ||
        now - statsAtRef.current > 180
      ) {
        statsKeyRef.current = nextKey;
        statsAtRef.current = now;
        setStats(nextStats);
      }
    };

    const animate = (time: number) => {
      draw(time);
      if (settings.animate) {
        raf = window.requestAnimationFrame(animate);
      }
    };

    const queueResizeDraw = () => {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = window.requestAnimationFrame((time) => {
        draw(time);
      });
    };

    const observer = new ResizeObserver(() => {
      queueResizeDraw();
    });

    observer.observe(canvas);
    queueResizeDraw();

    if (settings.animate) {
      raf = window.requestAnimationFrame(animate);
    }

    return () => {
      observer.disconnect();
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
    };
  }, [settings]);

  return (
    <div className="app-grid electric-grid">
      <aside className="controls-panel">
        <section className="panel-section panel-section-hero">
          <div className="panel-kicker">Электрическая секция</div>
          <h1>Field Lab</h1>
          <p>
            Напряжённость, потенциал и структура силовых линий на живом
            электрическом холсте.
          </p>
          <p className="hero-note">
            Здесь картинка строится не для галочки: меняешь конфигурацию
            зарядов и сразу видишь, как ломается поле, где оно схлопывается и
            где начинает тянуть по-настоящему жёстко.
          </p>
        </section>

        <Section title="Конфигурация">
          <SelectField
            label="Пресет"
            value={settings.preset}
            options={presetOptions}
            description={getElectricPresetDescription(settings.preset)}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                preset: value as ElectricPresetId,
              }))
            }
          />
          <SelectField
            label="Режим поля"
            value={settings.viewMode}
            options={viewOptions}
            description="Hybrid даёт и карту потенциала, и силовые линии. Остальные режимы режут сцену по одному слою."
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                viewMode: value as ElectricViewMode,
              }))
            }
          />
          <ToggleField
            label="Анимация"
            checked={settings.animate}
            description="Сдвигает dash-фазу и делает силовые линии живыми, не пересобирая весь UI."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, animate: checked }))
            }
          />
          <ToggleField
            label="Свечение"
            checked={settings.glow}
            description="Добавляет локальный halo на линии и заряды, чтобы сцена выглядела плотнее."
            onChange={(checked) =>
              setSettings((current) => ({ ...current, glow: checked }))
            }
          />
        </Section>

        <Section title="Поле">
          <RangeField
            label="Сила зарядов"
            min={6}
            max={22}
            step={0.5}
            value={settings.fieldStrength}
            digits={1}
            description="Чем выше значение, тем жёстче контраст потенциала и быстрее растёт напряжённость у источников."
            onChange={(value) =>
              setSettings((current) => ({ ...current, fieldStrength: value }))
            }
          />
          <RangeField
            label="Плотность линий"
            min={8}
            max={34}
            step={1}
            value={settings.lineDensity}
            digits={0}
            description="Количество стартовых сидов на положительный заряд. Больше сидов, больше геометрического мяса."
            onChange={(value) =>
              setSettings((current) => ({ ...current, lineDensity: Math.round(value) }))
            }
          />
          <RangeField
            label="Скорость дрейфа"
            min={0}
            max={2.5}
            step={0.1}
            value={settings.probeDrift}
            digits={1}
            description="Насколько быстро бегут заряженные штрихи по линиям поля."
            onChange={(value) =>
              setSettings((current) => ({ ...current, probeDrift: value }))
            }
          />
        </Section>
      </aside>

      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <div className="panel-kicker">Field Lab</div>
            <h2>Электрическое поле</h2>
            <p>
              Третья лаборатория в `Chaos Painter`: от диполя до квазиконденсатора
              с картой потенциала и трассировкой силовых линий в одном окне.
            </p>
          </div>
          <div className="hero-stats">
            <StatChip label="пресет" value={getElectricPresetLabel(settings.preset)} />
            <StatChip label="режим" value={settings.viewMode} />
            <StatChip label="заряды" value={stats ? String(stats.charges) : '...'} />
            <StatChip label="деталь" value={detailLabel} />
          </div>
        </header>

        <section className="phenomenon-note">
          <div className="panel-kicker">Что видно</div>
          <p>
            Карта потенциала показывает, где поле выдавливает систему в плюс или
            в минус, а силовые линии вскрывают саму механику: куда пробная
            частица реально пойдёт, где поток почти ровный и где поле резко
            ломается у границ конфигурации.
          </p>
        </section>

        <div className="capture-shell">
          <div className="viewport-card field-preview-card">
            <canvas className="field-canvas" ref={canvasRef} />
          </div>
        </div>

        <section className="metrics-section">
          <div className="metrics-grid">
            <MetricSummaryCard
              title="Потенциал"
              lines={[
                stats
                  ? `Диапазон потенциала от ${stats.minPotential.toFixed(2)} до ${stats.maxPotential.toFixed(2)}.`
                  : 'Диапазон потенциала появится после первого кадра.',
                'Тёплые зоны тянут в положительный потенциал, холодные проваливаются в отрицательный.',
                'Hybrid-режим полезен для общей формы, Potential удобнее для чистой картины распределения.',
              ]}
            />
            <MetricSummaryCard
              title="Линии поля"
              lines={[
                stats
                  ? `Сейчас выпущено около ${stats.streamlineCount} силовых линий.`
                  : 'Количество линий зависит от плотности сидов и числа положительных зарядов.',
                'Линии стартуют с положительных зарядов и заканчиваются на отрицательных либо уходят за границу сцены.',
                'Плотность сидов регулирует не физику, а читаемость геометрии.',
              ]}
            />
            <MetricSummaryCard
              title="Напряжённость"
              lines={[
                stats
                  ? `Пиковая напряжённость кадра сейчас ${stats.maxField.toFixed(2)}.`
                  : 'Пиковая напряжённость считается на сетке поля.',
                'Максимумы естественно сидят возле зарядов и на краевых разрывах конфигурации.',
                'Plate Gate хорошо показывает почти ровную зону между пластинами и ад на краях.',
              ]}
            />
            <MetricSummaryCard
              title="Куда развивать"
              lines={[
                'Следующий логичный апгрейд: магнитное поле, уравнение Лоренца и траектории частиц в E/B-сцене.',
                'Можно отдельно добавить equipotential contours и режим суперпозиции пользовательских зарядов.',
                'Если понадобится экспорт, этот холст легко доводится до PNG capture по той же схеме, что и остальные секции.',
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
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </div>
      {description ? <small className="field-description">{description}</small> : null}
    </label>
  );
}

function MetricSummaryCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <article className="metric-card">
      <header className="metric-card-header">
        <h3>{title}</h3>
      </header>
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
