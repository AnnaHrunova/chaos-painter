import { useEffect, useRef } from 'react';
import type { ColorMode, VisualMode } from '../app/model';
import { drawCanvasScene } from '../render/canvas2d';
import type { TrajectorySeries } from '../physics/types';

interface TrajectoryCanvas2DProps {
  trajectory: TrajectorySeries | null;
  frameIndex: number;
  trailWindow: number;
  lineWidth: number;
  colorMode: ColorMode;
  visualMode: VisualMode;
  label?: string;
  subtitle?: string;
  showPendulum?: boolean;
}

export function TrajectoryCanvas2D({
  trajectory,
  frameIndex,
  trailWindow,
  lineWidth,
  colorMode,
  visualMode,
  label,
  subtitle,
  showPendulum,
}: TrajectoryCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trajectory || !canvasRef.current) {
      return;
    }

    drawCanvasScene({
      canvas: canvasRef.current,
      trajectory,
      frameIndex,
      trailWindow,
      lineWidth,
      colorMode,
      visualMode,
      label,
      subtitle,
      showPendulum,
    });
  }, [
    trajectory,
    frameIndex,
    trailWindow,
    lineWidth,
    colorMode,
    visualMode,
    label,
    subtitle,
    showPendulum,
  ]);

  return <canvas className="trajectory-canvas" ref={canvasRef} />;
}

