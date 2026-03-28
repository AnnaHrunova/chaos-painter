import type { IntegrationMethodId } from '../integrators/types';

export interface PendulumState {
  theta1: number;
  omega1: number;
  theta2: number;
  omega2: number;
}

export interface PendulumParams {
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  g: number;
}

export interface Position2D {
  x: number;
  y: number;
}

export interface TrajectorySample {
  state: PendulumState;
  time: number;
  p1: Position2D;
  p2: Position2D;
  speed1: number;
  speed2: number;
  energy: number;
  energyDrift: number;
  energyDriftRatio: number;
  angularVelocity: number;
}

export interface TrajectorySummary {
  initialEnergy: number;
  finalEnergy: number;
  maxEnergyDrift: number;
  maxEnergyDriftRatio: number;
  minEnergy: number;
  maxEnergy: number;
}

export interface TrajectorySeries {
  methodId: IntegrationMethodId;
  methodLabel: string;
  dt: number;
  samples: TrajectorySample[];
  summary: TrajectorySummary;
}

export interface MetricPoint {
  time: number;
  value: number;
}

