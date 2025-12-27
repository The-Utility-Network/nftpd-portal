'use client'

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useActiveWallet } from 'thirdweb/react';
import * as THREE from 'three';
import { readContract, getContract, createThirdwebClient, prepareContractCall, sendAndConfirmTransaction } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond'; // Updated import

type Facet = { facetAddress: string; selectors: string[] };
type MethodNames = { [facetAddress: string]: { readMethods: string[]; writeMethods: string[] } };
type FacetNames = { [facetAddress: string]: string };
type FacetAbis = { [facetAddress: string]: any[] };

type Props = {
  facets: Facet[];
  methodNames: MethodNames;
  facetNames: FacetNames;
  facetAbis?: FacetAbis;
  isMobile?: boolean;
};

// Portal Color Palette (Grayscale / Mono)
const PORTAL_COLORS = {
  ringBase: '#cccccc', // Light Gray
  ringFocus: '#ffffff', // White
  nodeRead: '#ffffff', // White
  nodeWrite: '#888888', // Darker Gray for contrast
  hudBg: 'rgba(5, 5, 5, 0.9)', // Very dark background
  hudBorder: '#ffffff', // White border
  text: '#eeeeee'
};


function mixColor(hex: string, ratioToWhite: number) {
  const c = new THREE.Color(hex);
  const white = new THREE.Color('#ffffff');
  return c.clone().lerp(white, ratioToWhite).getStyle();
}

function darken(hex: string, factor: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - factor);
  return c.getStyle();
}

function colorWithAlpha(color: string, alpha: number) {
  const c = new THREE.Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgba(${r},${g},${b},${alpha})`;
}

function Node({ position, color, onClick, size = 0.08 }: { position: [number, number, number]; color: string; onClick: () => void; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);

  // Subtle pulse for nodes
  useFrame((state) => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
  })

  return (
    <mesh ref={ref} position={position} onClick={onClick} castShadow receiveShadow>
      <sphereGeometry args={[size, 24, 24]} />
      <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={0.8} toneMapped={false} />
    </mesh>
  );
}

function Rings({
  rings,
  onSelect,
  focusedIndex,
  yOffset,
  nodeSize,
}: {
  rings: Array<{
    z: number;
    radius: number;
    baseColor: string;
    label: string;
    reads: Array<{ method: string; position: [number, number, number] }>;
    writes: Array<{ method: string; position: [number, number, number] }>;
    facetAddress: string;
  }>;
  onSelect: (sel: { facet: string; method: string; type: 'read' | 'write'; color: string }) => void;
  focusedIndex: number;
  yOffset: number;
  nodeSize: number;
}) {
  return (
    <group>
      {rings.map((ring, idx) => (
        <group key={`${ring.facetAddress}-${ring.z}`} position={[0, yOffset, ring.z]}>
          {/* ring torus around viewer (in XY plane) */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[ring.radius, 0.003, 16, 96]} />
            <meshBasicMaterial color={ring.baseColor} opacity={idx === focusedIndex ? 0.9 : 0.15} transparent />
          </mesh>
          {/* ring glow when focused */}
          {idx === focusedIndex && (
            <mesh rotation={[0, 0, 0]}>
              <torusGeometry args={[ring.radius, 0.02, 16, 96]} />
              <meshBasicMaterial color={ring.baseColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
            </mesh>
          )}

          {/* nodes */}
          {ring.reads.map((r, i) => (
            <Node
              key={`r-${ring.facetAddress}-${r.method}-${i}`}
              position={r.position}
              color={mixColor(PORTAL_COLORS.nodeRead, idx === focusedIndex ? 0.2 : 0.5)}
              onClick={() => onSelect({ facet: ring.facetAddress, method: r.method, type: 'read', color: PORTAL_COLORS.nodeRead })}
              size={nodeSize}
            />
          ))}
          {ring.writes.map((w, i) => (
            <Node
              key={`w-${ring.facetAddress}-${w.method}-${i}`}
              position={w.position}
              color={darken(PORTAL_COLORS.nodeWrite, idx === focusedIndex ? 0.1 : 0.3)}
              onClick={() => onSelect({ facet: ring.facetAddress, method: w.method, type: 'write', color: PORTAL_COLORS.nodeWrite })}
              size={nodeSize}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

function Spine({ length }: { length: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -3.6, -length / 2]}>
      <cylinderGeometry args={[0.01, 0.01, length, 12]} />
      <meshBasicMaterial color={'#ffffff'} opacity={0.15} transparent />
    </mesh>
  );
}

function parseParams(raw: string) {
  if (!raw.trim()) return [] as any[];
  return raw.split(',').map((p) => {
    const v = p.trim();
    if (/^\d+$/.test(v)) return BigInt(v);
    if (/^\d+\.\d+$/.test(v)) return Number(v);
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
    return v;
  });
}

function safeStringify(value: any): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (key, val) => {
      if (typeof val === 'bigint') return val.toString();
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    },
    2
  );
}

function formatAsPretty(value: any): string {
  try {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const looksJson =
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'));
      if (looksJson) {
        return safeStringify(JSON.parse(value));
      }
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      return safeStringify(value);
    }
    return String(value);
  } catch {
    try {
      return safeStringify(value);
    } catch {
      return String(value);
    }
  }
}

export default function Diamond3D({ facets, methodNames, facetNames, facetAbis = {}, isMobile = false }: Props) {
  const [selection, setSelection] = useState<{ facet: string; method: string; type: 'read' | 'write'; color: string } | null>(null);
  const [params, setParams] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [walletAccount, setWalletAccount] = useState<any>(null);
  const [formInputs, setFormInputs] = useState<Array<{ name: string; type: string; value: string }>>([]);
  const [abiResolved, setAbiResolved] = useState(false);
  const [abiInputsCount, setAbiInputsCount] = useState<number | null>(null);
  const [diamondAddr, setDiamondAddr] = useState<string>('');

  // Fetch Diamond Addr for execution
  React.useEffect(() => {
    getDiamondAddress().then(setDiamondAddr);
  }, []);

  // Robust mobile/small viewport detection (in addition to prop)
  const [smallViewport, setSmallViewport] = useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;
    const mqWidth = window.matchMedia('(max-width: 820px)');
    const mqCoarse = window.matchMedia('(pointer: coarse)');
    const check = () => setSmallViewport(mqWidth.matches || mqCoarse.matches);
    check();
    mqWidth.addEventListener?.('change', check);
    mqCoarse.addEventListener?.('change', check);
    return () => {
      mqWidth.removeEventListener?.('change', check);
      mqCoarse.removeEventListener?.('change', check);
    };
  }, []);
  const isMobileView = isMobile || smallViewport;

  // capture active wallet account (for writes)
  const activeWallet = useActiveWallet();
  React.useEffect(() => {
    setWalletAccount(activeWallet?.getAccount() || null);
  }, [activeWallet]);

  const rings = useMemo(() => {
    const radius = isMobileView ? 0.78 : 1.6;
    const spacing = isMobileView ? 0.92 : 1.6;

    return facets.map((f, i) => {
      let reads = methodNames[f.facetAddress]?.readMethods || [];
      let writes = methodNames[f.facetAddress]?.writeMethods || [];
      if ((reads.length + writes.length) === 0 && Array.isArray((f as any).selectors)) {
        // Fallback: synthesize from selectors when ABI lookup failed
        const count = (f as any).selectors.length;
        reads = Array.from({ length: count }, (_, idx) => `fn_${idx}`);
        writes = [];
      }
      const total = Math.max(1, reads.length + writes.length);
      const ringColor = PORTAL_COLORS.ringBase;
      const angleStep = (Math.PI * 2) / total;
      const items: Array<{ method: string; type: 'read' | 'write' }> = [
        ...reads.map((m) => ({ method: m, type: 'read' as const })),
        ...writes.map((m) => ({ method: m, type: 'write' as const })),
      ];
      const readsPos: Array<{ method: string; position: [number, number, number] }> = [];
      const writesPos: Array<{ method: string; position: [number, number, number] }> = [];
      for (let k = 0; k < items.length; k++) {
        const a = -Math.PI / 2 + k * angleStep; // start at top and go clockwise
        const pos: [number, number, number] = [
          Math.cos(a) * radius,
          Math.sin(a) * radius,
          0, // relative to group (group already placed at ring.z)
        ];
        if (items[k].type === 'read') readsPos.push({ method: items[k].method, position: pos });
        else writesPos.push({ method: items[k].method, position: pos });
      }

      return {
        z: i * -spacing,
        radius,
        baseColor: ringColor,
        label: facetNames[f.facetAddress] || f.facetAddress.slice(0, 10),
        reads: readsPos,
        writes: writesPos,
        facetAddress: f.facetAddress,
      };
    });
  }, [facets, methodNames, facetNames, isMobileView]);

  // listen to nav events from in-ring arrows rendered via Html (after rings is defined)
  React.useEffect(() => {
    const onPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
    const onNext = () => setCurrentIndex((i) => Math.min(rings.length - 1, i + 1));
    window.addEventListener('nav-prev', onPrev as EventListener);
    window.addEventListener('nav-next', onNext as EventListener);
    return () => {
      window.removeEventListener('nav-prev', onPrev as EventListener);
      window.removeEventListener('nav-next', onNext as EventListener);
    };
  }, [rings.length]);

  const ringZ = useMemo(() => rings.map((r) => r.z), [rings]);

  // Build ABI-driven inputs whenever selection changes
  React.useEffect(() => {
    setOutput('');
    setParams('');
    if (!selection) {
      setFormInputs([]);
      setAbiResolved(false);
      setAbiInputsCount(null);
      return;
    }
    const abi = facetAbis[selection.facet];
    if (!abi) {
      setFormInputs([]);
      setAbiResolved(false);
      setAbiInputsCount(null);
      return;
    }
    const fn = (abi as any[]).find((item) => item?.type === 'function' && item?.name === selection.method);
    if (!fn || !Array.isArray(fn.inputs)) {
      setFormInputs([]);
      setAbiResolved(false);
      setAbiInputsCount(null);
      return;
    }
    const inputs = fn.inputs.map((inp: any, idx: number) => ({
      name: inp?.name || `arg${idx}`,
      type: inp?.type || 'string',
      value: '',
    }));
    setFormInputs(inputs);
    setAbiResolved(true);
    setAbiInputsCount(Array.isArray(fn.inputs) ? fn.inputs.length : 0);
  }, [selection, facetAbis]);

  const runRead = async () => {
    if (!selection) return;
    setBusy(true);
    setOutput('');
    try {
      const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT as string });
      const address = diamondAddr;
      const contractDyn = getContract({ client, chain: base, address, abi: facetAbis[selection.facet] as any });
      const res = await readContract({
        contract: contractDyn,
        method: selection.method as any,
        params: (formInputs.length > 0 ? formInputs.map((fi) => formatInput(fi)) : parseParams(params)) as any,
      } as any);
      setOutput(formatAsPretty(res));
    } catch (e: any) {
      setOutput(e?.message || 'Read failed');
    } finally {
      setBusy(false);
    }
  };

  const runWrite = async () => {
    if (!selection) return;
    setBusy(true);
    setOutput('');
    try {
      const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT as string });
      const address = diamondAddr;
      const contractDyn = getContract({ client, chain: base, address, abi: facetAbis[selection.facet] as any });
      const tx = prepareContractCall({
        contract: contractDyn,
        method: selection.method as any,
        params: (formInputs.length > 0 ? formInputs.map((fi) => formatInput(fi)) : parseParams(params)) as any,
        value: 0n,
      } as any);
      const receipt = await sendAndConfirmTransaction({ transaction: tx, account: walletAccount });
      setOutput(formatAsPretty(receipt));
    } catch (e: any) {
      setOutput(e?.message || 'Write failed');
    } finally {
      setBusy(false);
    }
  };

  // Input formatting (ported from Directory.tsx)
  function formatInput(input: { name: string; type: string; value: string }): any {
    const val = input.value;
    try {
      switch (input.type) {
        case 'address':
          return (val || '').trim();
        case 'uint256':
        case 'uint8':
        case 'int256':
        case 'int8':
          return BigInt(val);
        case 'bool':
          return String(val).toLowerCase() === 'true';
        case 'string':
          return val;
        case 'bytes':
          return val;
        case 'uint256[]':
          return val.split(',').map((v) => BigInt(v.trim()));
        case 'address[]':
          return val.split(',').map((v) => (v.trim()));
        default:
          return val;
      }
    } catch (err: any) {
      throw new Error(`Invalid input for ${input.name}: ${err?.message || 'parse error'}`);
    }
  }

  const cylLength = Math.max(1, facets.length) * (isMobileView ? 0.92 : 1.6) + 4.0;

  function CameraLerp({ targetZ }: { targetZ: number }) {
    const { camera } = useThree();
    useFrame(() => {
      const fov = (camera as THREE.PerspectiveCamera).fov || 52;
      const ringR = rings[currentIndex]?.radius ?? (isMobileView ? 1.2 : 2.2);
      const distance = (ringR / Math.tan(THREE.MathUtils.degToRad(fov / 2))) * (isMobileView ? 2.1 : 1.2);
      const desiredZ = targetZ + distance;
      const desiredY = (isMobileView ? -0.06 : 0);
      camera.position.z += (desiredZ - camera.position.z) * 0.12;
      camera.position.x += (0 - camera.position.x) * 0.1;
      camera.position.y += (desiredY - camera.position.y) * 0.1;
      camera.lookAt(0, 0, targetZ);
    });
    return null;
  }

  return (
    <div className="w-full h-full" style={{ position: 'absolute', inset: 0 }}>
      {/* Glassmorphic overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(5,5,5,0.95) 100%)' }} />
      <Canvas gl={{ alpha: true }} style={{ background: 'transparent' }} camera={{ position: [0, isMobileView ? -0.06 : 0.0, isMobileView ? 3.95 : 2.6], fov: isMobileView ? 60 : 50 }} shadows>
        <fog attach="fog" args={['#050a14', 8, 26]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, 10]} intensity={1.5} color="#ffffff" />

        <Spine length={cylLength} />

        <Rings rings={rings} onSelect={setSelection} focusedIndex={currentIndex} yOffset={isMobileView ? 0.10 : 0.2} nodeSize={isMobileView ? 0.055 : 0.08} />

        <CameraLerp targetZ={ringZ[currentIndex] ?? 0} />
      </Canvas>

      {/* bottom lip micro HUD with arrows + label */}
      <div style={{ position: 'absolute', bottom: isMobileView ? 'calc(90px + env(safe-area-inset-bottom))' as unknown as number : 120, left: '50%', transform: 'translateX(-50%)', display: 'grid', gridTemplateColumns: 'auto 200px auto', alignItems: 'center', gap: 8, pointerEvents: 'auto', zIndex: 120 }}>
        {(() => {
          const hudColor = PORTAL_COLORS.hudBorder;
          const hudGlow = colorWithAlpha(hudColor, 0.4);
          const hudBg = colorWithAlpha(PORTAL_COLORS.hudBg, 0.5);
          return (
            <>
              <button
                onClick={() => { const ev = new Event('nav-prev'); window.dispatchEvent(ev); }}
                style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `10px solid ${hudColor}`, filter: `drop-shadow(0 0 4px ${hudGlow})`, transform: 'perspective(300px) rotateX(15deg)', background: 'transparent' }}
              />
              <div style={{
                background: hudBg,
                padding: '2px 6px',
                borderRadius: 2,
                border: `1px solid ${hudColor}`,
                color: PORTAL_COLORS.text,
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                width: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                boxShadow: `0 0 10px ${hudGlow}`
              }}>
                {rings[currentIndex]?.label || 'Facet'}
              </div>
              <button
                onClick={() => { const ev = new Event('nav-next'); window.dispatchEvent(ev); }}
                style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `10px solid ${hudColor}`, filter: `drop-shadow(0 0 4px ${hudGlow})`, transform: 'perspective(300px) rotateX(-15deg)', background: 'transparent' }}
              />
            </>
          );
        })()}
      </div>

      {/* floating form in center */}
      {selection && (
        <div
          className="rounded-lg diamond-card font-mono"
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 400, maxWidth: '95vw', maxHeight: '70vh', overflowY: 'auto',
            background: PORTAL_COLORS.hudBg,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${PORTAL_COLORS.hudBorder}`, boxShadow: `0 0 18px ${PORTAL_COLORS.hudBorder}`, color: PORTAL_COLORS.text, padding: 12,
            ['--cardColor' as any]: PORTAL_COLORS.hudBorder,
          } as React.CSSProperties}
        >
          <style>{`
            .diamond-card { scrollbar-width: thin; scrollbar-color: var(--cardColor) rgba(255,255,255,0.1); }
            .diamond-card::-webkit-scrollbar { width: 10px; height: 10px; }
            .diamond-card::-webkit-scrollbar-thumb { background: var(--cardColor); border-radius: 10px; }
            .diamond-card::-webkit-scrollbar-track { background: rgba(255,255,255,0.08); }
          `}</style>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: `1px solid ${PORTAL_COLORS.hudBorder}`, paddingBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>EXECUTE.METHOD</div>
            <button onClick={() => { setSelection(null); setParams(''); setOutput(''); }} style={{ color: '#ffffff', fontSize: 11, opacity: 0.7 }}>[CLOSE]</button>
          </div>

          <div style={{ fontSize: 10, opacity: 0.7 }}>TARGET.FACET</div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: '#fff' }}>{facetNames[selection.facet] || selection.facet.slice(0, 10)}</div>

          <div style={{ fontSize: 10, opacity: 0.7 }}>METHOD.ID</div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: '#fff' }}>{selection.method}</div>

          <div style={{ fontSize: 10, opacity: 0.7 }}>TYPE</div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: selection.type === 'read' ? PORTAL_COLORS.nodeRead : PORTAL_COLORS.nodeWrite }}>{selection.type.toUpperCase()}</div>

          {formInputs.length > 0 ? (
            <div style={{ display: 'grid', gap: 6, gridTemplateColumns: formInputs.length > 6 ? '1fr 1fr' : '1fr' }}>
              {formInputs.map((inp, idx) => (
                <div key={`${inp.name}-${idx}`}>
                  <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: '0.03em' }}>{inp.name} ({inp.type})</div>
                  <input
                    value={inp.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormInputs((prev) => prev.map((p, i) => i === idx ? { ...p, value: v } : p));
                    }}
                    placeholder={inp.type}
                    style={{ width: '100%', borderRadius: 2, padding: 6, color: '#fff', background: 'rgba(255,255,255,0.1)', border: `1px solid ${PORTAL_COLORS.hudBorder}`, fontSize: 12, fontFamily: 'monospace' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {!abiResolved ? (
                <>
                  <div style={{ fontSize: 10, opacity: 0.9, marginBottom: 4 }}>PARAMS (CSV)</div>
                  <input
                    value={params}
                    onChange={(e) => setParams(e.target.value)}
                    placeholder="e.g. 1, 0xabc..., true"
                    style={{ width: '100%', borderRadius: 2, padding: 6, color: '#fff', background: 'rgba(255,255,255,0.1)', border: `1px solid ${PORTAL_COLORS.hudBorder}`, fontSize: 12, fontFamily: 'monospace' }}
                  />
                </>
              ) : null}
            </>
          )}
          <div style={{ height: 12 }} />
          {selection.type === 'read' ? (
            <button
              disabled={busy}
              onClick={runRead}
              className="hover:bg-white/20 transition-colors"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 2, background: 'transparent', color: PORTAL_COLORS.nodeRead, border: `1px solid ${PORTAL_COLORS.nodeRead}`, cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', fontWeight: 'bold' }}
            >
              {busy ? 'READING...' : '> RUN_READ'}
            </button>
          ) : (
            <button disabled={!walletAccount || busy} onClick={runWrite} style={{ width: '100%', padding: '8px 10px', borderRadius: 2, background: walletAccount ? 'transparent' : 'rgba(255,255,255,0.1)', color: PORTAL_COLORS.nodeWrite, border: `1px solid ${PORTAL_COLORS.nodeWrite}`, cursor: walletAccount ? 'pointer' : 'not-allowed', fontSize: 12, letterSpacing: '0.1em', fontWeight: 'bold' }}>
              {busy ? 'WRITING...' : walletAccount ? '> RUN_WRITE' : 'CONNECT_WALLET'}
            </button>
          )}
          <div style={{ height: 6 }} />
          {output && (
            <div className="micro-output" style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 2, border: `1px dashed ${PORTAL_COLORS.hudBorder}`, maxHeight: '30vh', overflowY: 'auto', fontFamily: 'monospace', color: '#fff' }}>{output}</div>
          )}
        </div>
      )}
    </div>
  );
}
