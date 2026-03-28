import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import type { ColorMode, ZAxisMode } from '../app/model';
import { buildTrajectory3DData } from '../render/trajectory3d';
import type { TrajectorySeries } from '../physics/types';

interface ThreeTrailViewProps {
  trajectory: TrajectorySeries;
  frameIndex: number;
  colorMode: ColorMode;
  zAxisMode: ZAxisMode;
  lineWidth: number;
}

export function ThreeTrailView({
  trajectory,
  frameIndex,
  colorMode,
  zAxisMode,
  lineWidth,
}: ThreeTrailViewProps) {
  const data = buildTrajectory3DData(
    trajectory,
    frameIndex,
    colorMode,
    zAxisMode,
  );

  return (
    <div className="three-shell">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 7.5], fov: 44 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#07111a']} />
        <fog attach="fog" args={['#07111a', 6, 13]} />
        <ambientLight intensity={0.7} />
        <pointLight position={[2, 3, 5]} intensity={35} color="#7af8ff" />
        <pointLight position={[-3, -2, 4]} intensity={24} color="#ff875c" />
        <gridHelper args={[12, 24, '#284861', '#132636']} position={[0, -3.1, 0]} />
        <Line
          points={data.points}
          vertexColors={data.colors}
          lineWidth={lineWidth * 1.4}
          transparent
          opacity={0.94}
        />
        <mesh position={data.currentPoint}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshStandardMaterial
            color="#f4f8fb"
            emissive="#7af8ff"
            emissiveIntensity={1.4}
            roughness={0.15}
          />
        </mesh>
        <OrbitControls enableDamping makeDefault />
      </Canvas>
    </div>
  );
}

