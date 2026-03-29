import type { ReactNode } from 'react';
import { integrators, maxAccuracyRank } from '../integrators';
import {
  colorModeOptions,
  renderModeOptions,
  visualModeOptions,
  workspaceModeOptions,
  zAxisModeOptions,
  type StudioSettings,
} from '../app/model';
import type { StudioPreset } from '../app/presets';

interface ControlsPanelProps {
  settings: StudioSettings;
  isPlaying: boolean;
  isPending: boolean;
  presets: StudioPreset[];
  onChange: (patch: Partial<StudioSettings>) => void;
  onApplyPreset: (preset: StudioPreset) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onRegenerate: () => void;
  onExport: () => void;
}

export function ControlsPanel({
  settings,
  isPlaying,
  isPending,
  presets,
  onChange,
  onApplyPreset,
  onTogglePlay,
  onReset,
  onRegenerate,
  onExport,
}: ControlsPanelProps) {
  const currentIntegrator = integrators.find(
    (integrator) => integrator.id === settings.methodId,
  );

  return (
    <aside className="controls-panel">
      <section className="panel-section panel-section-hero">
        <div className="panel-kicker">Лаборатория численного хаоса</div>
        <h1>Chaos Painter</h1>
        <p>
          Одна и та же система, одни и те же начальные условия, но разные
          численные методы. Дальше хаос уже сам делает свою грязную работу.
        </p>
        <p className="hero-note">
          Двойной маятник - простая детерминированная система с экстремальной
          чувствительностью к малым изменениям. Крошечные различия в состоянии
          или численном методе быстро превращаются в заметно разное движение.
        </p>
        <div className="playback-row">
          <button className="primary-button" onClick={onTogglePlay} type="button">
            {isPlaying ? 'Пауза' : 'Старт'}
          </button>
          <button className="ghost-button" onClick={onReset} type="button">
            Сброс
          </button>
          <button className="ghost-button" onClick={onRegenerate} type="button">
            Пересчитать
          </button>
          <button className="ghost-button" onClick={onExport} type="button">
            Экспорт PNG
          </button>
        </div>
        <div className="status-row">
          <span className={`status-pill ${isPending ? 'status-pill-live' : ''}`}>
            {isPending ? 'Пересчёт' : 'Готово'}
          </span>
          <span className="status-pill">Только браузер</span>
          <span className="status-pill">Статический деплой</span>
        </div>
      </section>

      <Section title="Режим работы">
        <Segmented
          value={settings.workspaceMode}
          onChange={(value) => onChange({ workspaceMode: value as StudioSettings['workspaceMode'] })}
          options={workspaceModeOptions}
        />
        <p className="field-note">
          Студия показывает один метод за раз. Сравнение запускает весь набор
          методов на абсолютно одинаковых начальных условиях, чтобы численная
          ошибка была видна сразу и без самообмана.
        </p>
        {settings.workspaceMode === 'studio' ? (
          <SelectField
            label="Вид"
            value={settings.visualMode}
            options={visualModeOptions}
            description="Выбирает способ просмотра: сами стержни, плоский след траектории или 3D-экструзию пути."
            onChange={(value) => onChange({ visualMode: value as StudioSettings['visualMode'] })}
          />
        ) : (
          <p className="field-note">
            Сравнение показывает все доступные методы бок о бок на одних и тех
            же начальных условиях.
          </p>
        )}
      </Section>

      <Section title="Интегратор">
        <SelectField
          label="Метод"
          value={settings.methodId}
          options={integrators.map((integrator) => ({
            value: integrator.id,
            label: `${integrator.shortLabel} · p${integrator.order} · точность ${integrator.accuracyRank}/${maxAccuracyRank}`,
          }))}
          disabled={settings.workspaceMode === 'comparison'}
          description={`Те же самые уравнения интегрируются разными приближениями. Шкала точности здесь практическая: 1 - самый грубый метод, ${maxAccuracyRank} - самые точные из текущего набора при одинаковом dt.`}
          onChange={(value) => onChange({ methodId: value as StudioSettings['methodId'] })}
        />
        <p className="field-note">
          {settings.workspaceMode === 'comparison'
            ? 'В режиме сравнения одновременно считаются все доступные методы на одном и том же наборе параметров.'
            : currentIntegrator?.description}
        </p>
      </Section>

      <Section title="Численные параметры">
        <RangeField
          label="dt"
          min={0.002}
          max={0.05}
          step={0.001}
          value={settings.dt}
          digits={3}
          description="Шаг времени на одно обновление интегратора. Меньший dt обычно даёт более устойчивый и точный результат, но требует больше вычислений."
          onChange={(value) => onChange({ dt: value })}
        />
        <RangeField
          label="Шаги симуляции"
          min={500}
          max={9000}
          step={100}
          value={settings.steps}
          digits={0}
          description="Насколько длинная траектория заранее просчитывается. Большие значения лучше показывают долгосрочное расхождение и сложные узоры."
          onChange={(value) => onChange({ steps: Math.round(value) })}
        />
        <RangeField
          label="Видимый хвост"
          min={80}
          max={3200}
          step={20}
          value={settings.trailWindow}
          digits={0}
          description="Сколько последнего участка траектории остаётся видимым. Большие значения подчёркивают общий рисунок, маленькие - локальное движение."
          onChange={(value) => onChange({ trailWindow: Math.round(value) })}
        />
        <ToggleField
          label="Хранить весь путь"
          checked={settings.keepFullPath}
          description="Если включено, уже пройденный путь не исчезает, и траектория накапливается целиком от начала симуляции."
          onChange={(checked) => onChange({ keepFullPath: checked })}
        />
        <RangeField
          label="Шаг проигрывания"
          min={1}
          max={24}
          step={1}
          value={settings.playbackStride}
          digits={0}
          description="Сколько заранее вычисленных точек проигрывается за один кадр анимации. Чем больше значение, тем быстрее время бежит вперёд."
          onChange={(value) => onChange({ playbackStride: Math.round(value) })}
        />
      </Section>

      <Section title="Начальное состояние">
        <RangeField
          label="theta1 (deg)"
          min={-179}
          max={179}
          step={1}
          value={settings.theta1Deg}
          digits={0}
          description="Начальный угол первого звена относительно вертикали. Он задаёт стартовую геометрию системы и начальную потенциальную энергию."
          onChange={(value) => onChange({ theta1Deg: value })}
        />
        <RangeField
          label="theta2 (deg)"
          min={-179}
          max={179}
          step={1}
          value={settings.theta2Deg}
          digits={0}
          description="Начальный угол второго звена. Из-за хаотичности системы даже очень маленькое изменение здесь может привести к совсем другой траектории."
          onChange={(value) => onChange({ theta2Deg: value })}
        />
        <RangeField
          label="omega1"
          min={-2.5}
          max={2.5}
          step={0.01}
          value={settings.omega1}
          digits={2}
          description="Начальная угловая скорость первого звена. Положительные и отрицательные значения закручивают систему в противоположные стороны."
          onChange={(value) => onChange({ omega1: value })}
        />
        <RangeField
          label="omega2"
          min={-2.5}
          max={2.5}
          step={0.01}
          value={settings.omega2}
          digits={2}
          description="Начальная угловая скорость второго звена. Она влияет на то, как быстро связанное движение станет запутанным."
          onChange={(value) => onChange({ omega2: value })}
        />
      </Section>

      <Section title="Физические параметры">
        <RangeField
          label="mass 1"
          min={0.2}
          max={3}
          step={0.05}
          value={settings.m1}
          digits={2}
          description="Масса первого груза. Более тяжёлое значение меняет характер связи между звеньями и перераспределение энергии в системе."
          onChange={(value) => onChange({ m1: value })}
        />
        <RangeField
          label="mass 2"
          min={0.2}
          max={3}
          step={0.05}
          value={settings.m2}
          digits={2}
          description="Масса второго груза. Она сильно влияет на инерцию нижнего звена и на форму итогового следа."
          onChange={(value) => onChange({ m2: value })}
        />
        <RangeField
          label="length 1"
          min={0.4}
          max={2.2}
          step={0.05}
          value={settings.l1}
          digits={2}
          description="Длина первого стержня. Более длинное звено увеличивает размах движения и меняет естественный временной масштаб маятника."
          onChange={(value) => onChange({ l1: value })}
        />
        <RangeField
          label="length 2"
          min={0.4}
          max={2.2}
          step={0.05}
          value={settings.l2}
          digits={2}
          description="Длина второго стержня. Она меняет доступную геометрию движения и плотность кривизны в следе траектории."
          onChange={(value) => onChange({ l2: value })}
        />
        <RangeField
          label="gravity"
          min={0}
          max={20}
          step={0.05}
          value={settings.g}
          digits={2}
          description="Ускорение свободного падения. Чем оно выше, тем быстрее система проходит через махи и тем сильнее ускорения."
          onChange={(value) => onChange({ g: value })}
        />
      </Section>

      <Section title="Визуализация">
        {settings.visualMode !== 'trail3d' ? (
          <SelectField
            label="Режим отрисовки"
            value={settings.renderMode}
            options={renderModeOptions}
            description="Меняет только способ визуализации уже рассчитанной траектории. Физика, интегратор и данные при этом не подменяются."
            onChange={(value) => onChange({ renderMode: value as StudioSettings['renderMode'] })}
          />
        ) : null}
        <SelectField
          label="Цвет"
          value={settings.colorMode}
          options={colorModeOptions}
          description="Привязывает цвет следа ко времени, скорости, дрейфу энергии или угловой скорости, чтобы по-разному раскрывать структуру одной и той же траектории."
          onChange={(value) => onChange({ colorMode: value as StudioSettings['colorMode'] })}
        />
        {settings.visualMode === 'trail3d' ? (
          <SelectField
            label="Глубина 3D"
            value={settings.zAxisMode}
            options={zAxisModeOptions}
            description="Определяет смысл глубины в 3D: прошедшее время, мгновенная скорость или численный дрейф энергии."
            onChange={(value) => onChange({ zAxisMode: value as StudioSettings['zAxisMode'] })}
          />
        ) : null}
        <RangeField
          label="Толщина линии"
          min={1}
          max={5}
          step={0.1}
          value={settings.lineWidth}
          digits={1}
          description="Визуальная толщина линии траектории. Полезно для баланса между читаемостью и свечением в режиме chaos-art."
          onChange={(value) => onChange({ lineWidth: value })}
        />
      </Section>

      <Section title="Пресеты">
        <p className="field-note">
          Пресеты - это готовые наборы параметров для быстрого старта. Они могут
          на секунду дольше считаться, потому что приложение заново просчитывает
          всю траекторию, референсную траекторию, близкий стартовый seed и набор для
          сравнения. Но теперь это уезжает в фоновый worker, так что
          интерфейс не должен заметно фризить.
        </p>
        <div className="preset-grid">
          {presets.map((preset) => (
            <button
              className="preset-card"
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              type="button"
            >
              <strong>{preset.name}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </Section>
    </aside>
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
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  description?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
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

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          className={value === option.value ? 'segment segment-active' : 'segment'}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
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
