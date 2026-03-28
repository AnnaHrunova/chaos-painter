import type { ReactNode } from 'react';
import { integrators } from '../integrators';
import {
  colorModeOptions,
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
        <div className="panel-kicker">Numerical Chaos Studio</div>
        <h1>Chaos Painter</h1>
        <p>
          Same system, same initial conditions, different solvers. Then chaos
          does its delightful dirty work.
        </p>
        <div className="playback-row">
          <button className="primary-button" onClick={onTogglePlay} type="button">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className="ghost-button" onClick={onReset} type="button">
            Reset
          </button>
          <button className="ghost-button" onClick={onRegenerate} type="button">
            Regenerate
          </button>
          <button className="ghost-button" onClick={onExport} type="button">
            Export PNG
          </button>
        </div>
        <div className="status-row">
          <span className={`status-pill ${isPending ? 'status-pill-live' : ''}`}>
            {isPending ? 'Recomputing' : 'Ready'}
          </span>
          <span className="status-pill">Browser only</span>
          <span className="status-pill">Static deploy</span>
        </div>
      </section>

      <Section title="Workspace">
        <Segmented
          value={settings.workspaceMode}
          onChange={(value) => onChange({ workspaceMode: value as StudioSettings['workspaceMode'] })}
          options={workspaceModeOptions}
        />
        {settings.workspaceMode === 'studio' ? (
          <SelectField
            label="Viewport"
            value={settings.visualMode}
            options={visualModeOptions}
            onChange={(value) => onChange({ visualMode: value as StudioSettings['visualMode'] })}
          />
        ) : (
          <p className="field-note">
            Comparison mode renders Euler, RK2, and RK4 side by side with the
            same initial state.
          </p>
        )}
      </Section>

      <Section title="Integrator">
        <SelectField
          label="Method"
          value={settings.methodId}
          options={integrators.map((integrator) => ({
            value: integrator.id,
            label: `${integrator.shortLabel} · order ${integrator.order}`,
          }))}
          disabled={settings.workspaceMode === 'comparison'}
          onChange={(value) => onChange({ methodId: value as StudioSettings['methodId'] })}
        />
        <p className="field-note">
          {settings.workspaceMode === 'comparison'
            ? 'Comparison mode always runs Euler, RK2, and RK4 with the same setup.'
            : currentIntegrator?.description}
        </p>
      </Section>

      <Section title="Numerics">
        <RangeField
          label="dt"
          min={0.002}
          max={0.05}
          step={0.001}
          value={settings.dt}
          digits={3}
          onChange={(value) => onChange({ dt: value })}
        />
        <RangeField
          label="Simulation steps"
          min={500}
          max={9000}
          step={100}
          value={settings.steps}
          digits={0}
          onChange={(value) => onChange({ steps: Math.round(value) })}
        />
        <RangeField
          label="Visible trail"
          min={80}
          max={3200}
          step={20}
          value={settings.trailWindow}
          digits={0}
          onChange={(value) => onChange({ trailWindow: Math.round(value) })}
        />
        <RangeField
          label="Playback stride"
          min={1}
          max={24}
          step={1}
          value={settings.playbackStride}
          digits={0}
          onChange={(value) => onChange({ playbackStride: Math.round(value) })}
        />
      </Section>

      <Section title="Initial State">
        <RangeField
          label="theta1 (deg)"
          min={-179}
          max={179}
          step={1}
          value={settings.theta1Deg}
          digits={0}
          onChange={(value) => onChange({ theta1Deg: value })}
        />
        <RangeField
          label="theta2 (deg)"
          min={-179}
          max={179}
          step={1}
          value={settings.theta2Deg}
          digits={0}
          onChange={(value) => onChange({ theta2Deg: value })}
        />
        <RangeField
          label="omega1"
          min={-2.5}
          max={2.5}
          step={0.01}
          value={settings.omega1}
          digits={2}
          onChange={(value) => onChange({ omega1: value })}
        />
        <RangeField
          label="omega2"
          min={-2.5}
          max={2.5}
          step={0.01}
          value={settings.omega2}
          digits={2}
          onChange={(value) => onChange({ omega2: value })}
        />
      </Section>

      <Section title="Physical Parameters">
        <RangeField
          label="mass 1"
          min={0.2}
          max={3}
          step={0.05}
          value={settings.m1}
          digits={2}
          onChange={(value) => onChange({ m1: value })}
        />
        <RangeField
          label="mass 2"
          min={0.2}
          max={3}
          step={0.05}
          value={settings.m2}
          digits={2}
          onChange={(value) => onChange({ m2: value })}
        />
        <RangeField
          label="length 1"
          min={0.4}
          max={2.2}
          step={0.05}
          value={settings.l1}
          digits={2}
          onChange={(value) => onChange({ l1: value })}
        />
        <RangeField
          label="length 2"
          min={0.4}
          max={2.2}
          step={0.05}
          value={settings.l2}
          digits={2}
          onChange={(value) => onChange({ l2: value })}
        />
        <RangeField
          label="gravity"
          min={0}
          max={20}
          step={0.05}
          value={settings.g}
          digits={2}
          onChange={(value) => onChange({ g: value })}
        />
      </Section>

      <Section title="Visual Mapping">
        <SelectField
          label="Color"
          value={settings.colorMode}
          options={colorModeOptions}
          onChange={(value) => onChange({ colorMode: value as StudioSettings['colorMode'] })}
        />
        {settings.visualMode === 'trail3d' ? (
          <SelectField
            label="3D depth"
            value={settings.zAxisMode}
            options={zAxisModeOptions}
            onChange={(value) => onChange({ zAxisMode: value as StudioSettings['zAxisMode'] })}
          />
        ) : null}
        <RangeField
          label="Line width"
          min={1}
          max={5}
          step={0.1}
          value={settings.lineWidth}
          digits={1}
          onChange={(value) => onChange({ lineWidth: value })}
        />
      </Section>

      <Section title="Presets">
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
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
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
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  digits: number;
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
