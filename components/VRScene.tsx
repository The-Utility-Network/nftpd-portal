'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface VRSceneProps {
  onLoad?: () => void;
  orientation?: THREE.Euler | null;
}

// The core visual component: A large sphere with the "radio.jpg" texture on the inside.
// This replicates the previous A-Frame <a-sphere src="/radio.jpg" ... scale="-1 1 1"> logic
// but uses the modern R3F stack consistent with the TUC project.
function RadioBiosphere({ onLoad }: { onLoad?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Load texture
  // We use standard TextureLoader. In R3F we can use useLoader.
  // We handle the onLoad callback here to signal readiness.
  const texture = useLoader(THREE.TextureLoader, '/radio.jpg', (loader) => {
    // Optional: Setup loading manager or handled by Suspense in parent
  });

  useEffect(() => {
    if (texture && onLoad) {
      onLoad();
    }
  }, [texture, onLoad]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Auto-rotate slowly, matching the old behavior
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]} rotation={[0, 0, 0]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide} // Render on inside (redundant with scale -1 but safe)
        toneMapped={false}
      />
    </mesh>
  );
}

const VRScene: React.FC<VRSceneProps> = ({ onLoad, orientation }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        {/* Black background fallback */}
        <color attach="background" args={['#000000']} />

        {/* Suspense wrapper would be ideal, but for now we rely on standard async loading behavior inside Canvas */}
        <React.Suspense fallback={null}>
          <RadioBiosphere onLoad={onLoad} />
        </React.Suspense>

        {!orientation && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableDamping
            rotateSpeed={-0.5} // Invert rotation feel for inside-sphere
          />
        )}

        {/* Sync Camera with Orientation */}
        <CameraHandler orientation={orientation} />
      </Canvas>
    </div>
  );
};

function CameraHandler({ orientation }: { orientation?: THREE.Euler | null }) {
  useFrame((state) => {
    if (orientation) {
      state.camera.quaternion.setFromEuler(orientation);
    }
  });
  return null;
}

export default VRScene;
