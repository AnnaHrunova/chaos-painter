import type { FractalScene, FractalSceneInput } from './types';

export interface FractalWorkerRequest {
  type: 'build-fractal-scene';
  requestId: number;
  input: FractalSceneInput;
}

export interface FractalWorkerResult {
  type: 'fractal-scene';
  requestId: number;
  scene: FractalScene;
}

export interface FractalWorkerError {
  type: 'error';
  requestId: number;
  message: string;
}

export type FractalWorkerResponse = FractalWorkerResult | FractalWorkerError;
