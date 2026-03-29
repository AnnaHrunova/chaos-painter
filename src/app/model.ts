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
  playbackStride: number;
  theta1Deg: number;
  theta2Deg: number;
  omega1: number;
  omega2: number;
  m1: number;
  m2: number;
  l1: number;
  l2: number;
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
  playbackStride: 4,
  theta1Deg: 123,
  theta2Deg: -18,
  omega1: 0,
  omega2: 0.18,
  m1: 1,
  m2: 1,
  l1: 1,
  l2: 1,
  g: 9.81,
  lineWidth: 2.2,
  colorMode: 'time',
  zAxisMode: 'time',
  renderMode: 'scientific',
};

export const workspaceModeOptions = [
  { value: 'studio', label: 'Studio' },
  { value: 'comparison', label: 'Compare' },
] as const;

export const visualModeOptions = [
  { value: 'pendulum2d', label: '2D Pendulum' },
  { value: 'trail2d', label: '2D Trail' },
  { value: 'trail3d', label: '3D Trail' },
  { value: 'chaosArt', label: 'Chaos Art' },
] as const;

export const colorModeOptions = [
  { value: 'time', label: 'Color by time' },
  { value: 'speed', label: 'Color by speed' },
  { value: 'energyDrift', label: 'Color by energy drift' },
  { value: 'angularVelocity', label: 'Color by angular velocity' },
] as const;

export const renderModeOptions = [
  { value: 'scientific', label: 'Scientific trail' },
  { value: 'density', label: 'Density map' },
  { value: 'phasePortrait', label: 'Phase portrait' },
  { value: 'methodDelta', label: 'Method delta view' },
  { value: 'energyDrift', label: 'Energy drift view' },
  { value: 'neon', label: 'Neon long-exposure' },
] as const;

export const zAxisModeOptions = [
  { value: 'time', label: 'Z = time' },
  { value: 'speed', label: 'Z = speed' },
  { value: 'energyDrift', label: 'Z = energy drift' },
] as const;

export function toInitialState(settings: StudioSettings): PendulumState {
  return {
    theta1: degreesToRadians(settings.theta1Deg),
    theta2: degreesToRadians(settings.theta2Deg),
    omega1: settings.omega1,
    omega2: settings.omega2,
  };
}

export function toPendulumParams(settings: StudioSettings): PendulumParams {
  return {
    m1: settings.m1,
    m2: settings.m2,
    l1: settings.l1,
    l2: settings.l2,
    g: settings.g,
  };
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
