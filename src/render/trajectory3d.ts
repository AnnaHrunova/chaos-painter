import { Color } from 'three';
import type { ColorMode, ZAxisMode } from '../app/model';
import { colorForSample, computeTrajectoryExtrema } from '../lib/color';
import type { TrajectorySeries } from '../physics/types';

export interface Trajectory3DData {
  points: [number, number, number][];
  colors: [number, number, number][];
  currentPoint: [number, number, number];
}

export function buildTrajectory3DData(
  trajectory: TrajectorySeries,
  frameIndex: number,
  colorMode: ColorMode,
  zAxisMode: ZAxisMode,
): Trajectory3DData {
  const samples = trajectory.samples;
  const clampedFrame = Math.min(frameIndex, samples.length - 1);
  const visibleSamples = samples.slice(0, clampedFrame + 1);
  const extrema = computeTrajectoryExtrema(samples);
  const total = samples.length;
  const maxDrift = Math.max(extrema.maxEnergyDriftRatio, 1e-6);
  const maxSpeed = Math.max(extrema.maxSpeed, 1e-6);
  const lengthScale = 1.7;

  const points: [number, number, number][] = visibleSamples.map((sample, index) => {
    let z = 0;

    if (zAxisMode === 'time') {
      z = (index / Math.max(1, total - 1)) * 4.5;
    } else if (zAxisMode === 'speed') {
      z = (sample.speed2 / maxSpeed) * 4.5;
    } else {
      z = (sample.energyDriftRatio / maxDrift) * 2.8;
    }

    return [sample.p2.x * lengthScale, -sample.p2.y * lengthScale, z];
  });

  const colors: [number, number, number][] = visibleSamples.map(
    (sample, index) => {
      const color = new Color(
        colorForSample(sample, index, total, colorMode, extrema),
      );
      return [color.r, color.g, color.b];
    },
  );

  return {
    points,
    colors,
    currentPoint: points[points.length - 1],
  };
}
