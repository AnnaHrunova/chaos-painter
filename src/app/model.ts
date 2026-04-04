import type { PendulumParams, PendulumState } from '../physics/types';
import type { IntegrationMethodId } from '../integrators/types';

export type WorkspaceMode = 'studio' | 'comparison';
export type VisualMode = 'pendulum2d' | 'trail2d' | 'trail3d' | 'chaosArt';
export type ColorMode = 'time' | 'speed' | 'energyDrift' | 'angularVelocity';
export type ZAxisMode = 'time' | 'speed' | 'energyDrift';
export type RenderMode =
  | 'scientific'
  | 'density'
  | 'phasePortrait'
  | 'methodDelta'
  | 'energyDrift'
  | 'neon';

export interface StudioSettings {
  workspaceMode: WorkspaceMode;
  visualMode: VisualMode;
  methodId: IntegrationMethodId;
  dt: number;
  steps: number;
  trailWindow: number;
  keepFullPath: boolean;
  playbackStride: number;
  theta1Deg: number;
  theta2Deg: number;
  theta3Deg: number;
  omega1: number;
  omega2: number;
  omega3: number;
  m1: number;
  m2: number;
  m3: number;
  l1: number;
  l2: number;
  l3: number;
  g: number;
  lineWidth: number;
  colorMode: ColorMode;
  zAxisMode: ZAxisMode;
  renderMode: RenderMode;
}

export const defaultSettings: StudioSettings = {
  workspaceMode: 'studio',
  visualMode: 'pendulum2d',
  methodId: 'rk4',
  dt: 0.01,
  steps: 3200,
  trailWindow: 560,
  keepFullPath: true,
  playbackStride: 4,
  theta1Deg: 132,
  theta2Deg: -16,
  theta3Deg: 34,
  omega1: 0,
  omega2: 0.12,
  omega3: -0.08,
  m1: 1,
  m2: 1,
  m3: 1,
  l1: 1,
  l2: 1,
  l3: 1,
  g: 9.81,
  lineWidth: 2.2,
  colorMode: 'time',
  zAxisMode: 'time',
  renderMode: 'scientific',
};

export const workspaceModeOptions = [
  { value: 'studio', label: 'Студия' },
  { value: 'comparison', label: 'Сравнение' },
] as const;

export const visualModeOptions = [
  { value: 'pendulum2d', label: 'Маятник 2D' },
  { value: 'trail2d', label: 'След 2D' },
  { value: 'trail3d', label: 'След 3D' },
  { value: 'chaosArt', label: 'Хаос-арт' },
] as const;

export const colorModeOptions = [
  { value: 'time', label: 'Цвет по времени' },
  { value: 'speed', label: 'Цвет по скорости' },
  { value: 'energyDrift', label: 'Цвет по дрейфу энергии' },
  { value: 'angularVelocity', label: 'Цвет по угловой скорости' },
] as const;

export const renderModeOptions = [
  { value: 'scientific', label: 'Научный след' },
  { value: 'density', label: 'Карта плотности' },
  { value: 'phasePortrait', label: 'Фазовый портрет' },
  { value: 'methodDelta', label: 'Расхождение метода' },
  { value: 'energyDrift', label: 'Дрейф энергии' },
  { value: 'neon', label: 'Неон / длинная экспозиция' },
] as const;

export const zAxisModeOptions = [
  { value: 'time', label: 'Z = время' },
  { value: 'speed', label: 'Z = скорость' },
  { value: 'energyDrift', label: 'Z = дрейф энергии' },
] as const;

export function toInitialState(settings: StudioSettings): PendulumState {
  return {
    theta1: degreesToRadians(settings.theta1Deg),
    theta2: degreesToRadians(settings.theta2Deg),
    theta3: degreesToRadians(settings.theta3Deg),
    omega1: settings.omega1,
    omega2: settings.omega2,
    omega3: settings.omega3,
  };
}

export function toPendulumParams(settings: StudioSettings): PendulumParams {
  return {
    m1: settings.m1,
    m2: settings.m2,
    m3: settings.m3,
    l1: settings.l1,
    l2: settings.l2,
    l3: settings.l3,
    g: settings.g,
  };
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
