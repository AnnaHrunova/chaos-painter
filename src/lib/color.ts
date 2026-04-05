import type { ColorMode } from '../app/model';
import type { TrajectorySample } from '../physics/types';
import { clamp, lerp } from './format';

export interface TrajectoryExtrema {
  maxSpeed: number;
  maxEnergyDriftRatio: number;
  maxAngularVelocity: number;
}

export function computeTrajectoryExtrema(
  samples: TrajectorySample[],
): TrajectoryExtrema {
  let maxSpeed = 1e-6;
  let maxEnergyDriftRatio = 1e-6;
  let maxAngularVelocity = 1e-6;

  for (const sample of samples) {
    maxSpeed = Math.max(maxSpeed, sample.speed4);
    maxEnergyDriftRatio = Math.max(
      maxEnergyDriftRatio,
      Math.abs(sample.energyDriftRatio),
    );
    maxAngularVelocity = Math.max(
      maxAngularVelocity,
      sample.angularVelocity,
    );
  }

  return {
    maxSpeed,
    maxEnergyDriftRatio,
    maxAngularVelocity,
  };
}

export function colorForSample(
  sample: TrajectorySample,
  index: number,
  total: number,
  colorMode: ColorMode,
  extrema: TrajectoryExtrema,
): string {
  const progress = total <= 1 ? 0 : index / (total - 1);

  if (colorMode === 'time') {
    return hsl(lerp(210, 24, progress), lerp(78, 92, progress), lerp(62, 68, progress));
  }

  if (colorMode === 'speed') {
    const intensity = clamp(sample.speed4 / extrema.maxSpeed, 0, 1);
    return hsl(lerp(170, 340, intensity), 88, lerp(60, 70, intensity));
  }

  if (colorMode === 'energyDrift') {
    const intensity = clamp(
      Math.abs(sample.energyDriftRatio) / extrema.maxEnergyDriftRatio,
      0,
      1,
    );
    return hsl(lerp(45, 8, intensity), 90, lerp(63, 58, intensity));
  }

  const intensity = clamp(
    sample.angularVelocity / extrema.maxAngularVelocity,
    0,
    1,
  );
  return hsl(lerp(220, 286, intensity), 82, lerp(72, 62, intensity));
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
}
