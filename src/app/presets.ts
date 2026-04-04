import type { StudioSettings } from './model';

export interface StudioPreset {
  id: string;
  name: string;
  description: string;
  patch: Partial<StudioSettings>;
}

export const presets: StudioPreset[] = [
  {
    id: 'balanced-split',
    name: 'Balanced Split',
    description:
      'Сбалансированный сценарий по умолчанию, где RK4 ещё держится чисто, а Euler уже начинает разваливаться.',
    patch: {
      workspaceMode: 'comparison',
      visualMode: 'trail2d',
      methodId: 'rk4',
      dt: 0.012,
      steps: 2800,
      trailWindow: 680,
      theta1Deg: 120,
      theta2Deg: -22,
      theta3Deg: 28,
      omega1: 0,
      omega2: 0.12,
      omega3: -0.06,
      colorMode: 'time',
      lineWidth: 2.1,
    },
  },
  {
    id: 'energy-leak',
    name: 'Energy Leak',
    description:
      'Нарочито жёсткий сценарий, где крупный Euler начинает явно подмешивать численную ерунду в энергетику системы.',
    patch: {
      workspaceMode: 'comparison',
      visualMode: 'trail2d',
      methodId: 'euler',
      dt: 0.03,
      steps: 2400,
      trailWindow: 520,
      theta1Deg: 141,
      theta2Deg: 7,
      theta3Deg: -18,
      omega1: -0.08,
      omega2: 0.02,
      omega3: 0.14,
      colorMode: 'energyDrift',
      renderMode: 'methodDelta',
      lineWidth: 2.5,
    },
  },
  {
    id: 'ribbon-bloom',
    name: 'Ribbon Bloom',
    description:
      'Длинные хвосты и медленный дрейф, настроенные под насыщенный 2D chaos-art рендер.',
    patch: {
      workspaceMode: 'studio',
      visualMode: 'chaosArt',
      methodId: 'rk4',
      dt: 0.006,
      steps: 6200,
      trailWindow: 2400,
      theta1Deg: 135,
      theta2Deg: -4,
      theta3Deg: 41,
      omega1: 0.02,
      omega2: 0.01,
      omega3: -0.08,
      colorMode: 'speed',
      renderMode: 'neon',
      lineWidth: 2.8,
      playbackStride: 8,
    },
  },
  {
    id: 'nebula-tube',
    name: 'Nebula Tube',
    description:
      '3D-пресет, в котором время превращается в глубину, а траектория становится почти скульптурной.',
    patch: {
      workspaceMode: 'studio',
      visualMode: 'trail3d',
      methodId: 'midpoint',
      dt: 0.008,
      steps: 3600,
      trailWindow: 900,
      theta1Deg: 112,
      theta2Deg: -28,
      theta3Deg: 19,
      omega1: -0.03,
      omega2: 0.22,
      omega3: -0.12,
      colorMode: 'angularVelocity',
      zAxisMode: 'time',
      lineWidth: 2.3,
    },
  },
];
