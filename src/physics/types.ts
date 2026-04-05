import type { IntegrationMethodId } from '../integrators/types';

export interface PendulumState {
  theta1: number;
  omega1: number;
  theta2: number;
  omega2: number;
  theta3: number;
  omega3: number;
  theta4: number;
  omega4: number;
}

export interface PendulumParams {
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  l1: number;
  l2: number;
  l3: number;
  l4: number;
  g: number;
}

export interface Position2D {
  x: number;
  y: number;
}

export interface TrajectorySample {
  state: PendulumState;
  time: number;
  positions: [Position2D, Position2D, Position2D, Position2D];
  speeds: [number, number, number, number];
  p1: Position2D;
  p2: Position2D;
  p3: Position2D;
  p4: Position2D;
  speed1: number;
  speed2: number;
  speed3: number;
  speed4: number;
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
