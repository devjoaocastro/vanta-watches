import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Environment,
  Float,
  Html,
  Lightformer,
  Sparkles,
  useCursor,
  useScroll,
} from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { easing } from '../lib/easing'
import { PAGES, setScrollEl } from '../scrollBus'

/* ------------------------------------------------------------------ */
/* Palette — champagne gold against pure black                         */
/* ------------------------------------------------------------------ */

const GOLD = '#d4af6a'
const GOLD_DEEP = '#a8843e'
const GOLD_HOT = '#f0d9a4'
const BRASS = '#9c7d45'
const DARKPLATE = '#171310'
const RUBY = '#7c1f2d'

type Vec3 = [number, number, number]

/** Shared mutable speed multiplier (1 = real time, hover = hastened). */
type SpeedRef = { current: number }

/* ------------------------------------------------------------------ */
/* Part — a watch component that flies from its exploded position      */
/* into its assembled seat across a window of scroll (section units).  */
/* While exploded it drifts weightlessly, like parts on a bench tray.  */
/* ------------------------------------------------------------------ */

function Part({
  start,
  end,
  from,
  fromRot = [0, 0, 0],
  drift = 0.14,
  seed = 0,
  children,
}: {
  start: number
  end: number
  from: Vec3
  fromRot?: Vec3
  drift?: number
  seed?: number
  children: ReactNode
}) {
  const g = useRef<THREE.Group>(null!)
  const scroll = useScroll()

  useFrame((state) => {
    const p = scroll.offset * (PAGES - 1)
    const t = THREE.MathUtils.smoothstep(p, start, end)
    const k = 1 - t
    const tm = state.clock.elapsedTime + seed * 13.7
    g.current.position.set(
      from[0] * k + Math.sin(tm * 0.6) * drift * k,
      from[1] * k + Math.cos(tm * 0.8) * drift * k,
      from[2] * k + Math.sin(tm * 0.45 + 1.4) * drift * k,
    )
    g.current.rotation.set(
      fromRot[0] * k,
      fromRot[1] * k + Math.sin(tm * 0.35) * 0.12 * k,
      fromRot[2] * k,
    )
  })

  return <group ref={g}>{children}</group>
}

/* ------------------------------------------------------------------ */
/* PartLabel — drei <Html> caption pinned to a component. HTML ignores */
/* fog/depth, so we fade it with the scroll exactly like terranova's   */
/* DistrictPin fix: opacity from section distance, display:none when   */
/* effectively invisible.                                              */
/* ------------------------------------------------------------------ */

function PartLabel({
  position,
  title,
  sub,
  focus,
}: {
  position: Vec3
  title: string
  sub: string
  focus: number
}) {
  const el = useRef<HTMLDivElement>(null)
  const scroll = useScroll()

  useFrame(() => {
    if (!el.current) return
    const p = scroll.offset * (PAGES - 1)
    const visibility = Math.max(0, 1 - Math.abs(p - focus) * 1.8)
    el.current.style.opacity = visibility.toFixed(3)
    el.current.style.display = visibility < 0.04 ? 'none' : ''
  })

  return (
    <Html center position={position} className="part-html" zIndexRange={[20, 0]}>
      <div ref={el} className="part-label" style={{ opacity: 0, display: 'none' }}>
        <strong>{title}</strong>
        <span>{sub}</span>
      </div>
    </Html>
  )
}

/* ------------------------------------------------------------------ */
/* Gear — brass cylinder with teeth as radial boxes, turning at its    */
/* own speed. The shared speedRef hastens the whole train on hover.    */
/* ------------------------------------------------------------------ */

function Gear({
  radius,
  teeth,
  speed,
  speedRef,
  thickness = 0.09,
  tone = BRASS,
}: {
  radius: number
  teeth: number
  speed: number
  speedRef: SpeedRef
  thickness?: number
  tone?: string
}) {
  const g = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    g.current.rotation.z += delta * speed * speedRef.current
  })

  const toothLen = radius * 0.2
  const toothW = radius * 0.18
  const angles = useMemo(
    () => Array.from({ length: teeth }, (_, i) => (i / teeth) * Math.PI * 2),
    [teeth],
  )

  return (
    <group ref={g}>
      {/* wheel */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, thickness, 48]} />
        <meshStandardMaterial color={tone} metalness={1} roughness={0.32} />
      </mesh>
      {/* arbor / hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.16, radius * 0.16, thickness * 2.6, 16]} />
        <meshStandardMaterial color={GOLD_DEEP} metalness={1} roughness={0.2} />
      </mesh>
      {/* jewel bearing */}
      <mesh position={[0, 0, thickness * 1.5]}>
        <sphereGeometry args={[radius * 0.07, 12, 12]} />
        <meshStandardMaterial color={RUBY} emissive={RUBY} emissiveIntensity={0.7} roughness={0.1} />
      </mesh>
      {/* teeth */}
      {angles.map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * (radius + toothLen / 2), Math.sin(a) * (radius + toothLen / 2), 0]}
          rotation={[0, 0, a]}
        >
          <boxGeometry args={[toothLen, toothW, thickness]} />
          <meshStandardMaterial color={tone} metalness={1} roughness={0.32} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* BalanceWheel — the heart. Oscillates back and forth; its phase is   */
/* accumulated so hover-hastening never makes it jump.                 */
/* ------------------------------------------------------------------ */

function BalanceWheel({ speedRef }: { speedRef: SpeedRef }) {
  const wheel = useRef<THREE.Group>(null!)
  const phase = useRef(0)

  useFrame((_, delta) => {
    phase.current += delta * 6.5 * speedRef.current
    wheel.current.rotation.z = Math.sin(phase.current) * 1.15
  })

  return (
    <group>
      <group ref={wheel}>
        {/* rim */}
        <mesh>
          <torusGeometry args={[0.32, 0.034, 12, 48]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.18} />
        </mesh>
        {/* spokes */}
        <mesh>
          <boxGeometry args={[0.6, 0.035, 0.03]} />
          <meshStandardMaterial color={GOLD_DEEP} metalness={1} roughness={0.25} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.6, 0.035, 0.03]} />
          <meshStandardMaterial color={GOLD_DEEP} metalness={1} roughness={0.25} />
        </mesh>
      </group>
      {/* hairspring suggestion */}
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[0.16, 0.008, 8, 40]} />
        <meshStandardMaterial color={GOLD_HOT} metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[0.1, 0.006, 8, 32]} />
        <meshStandardMaterial color={GOLD_HOT} metalness={1} roughness={0.3} />
      </mesh>
      {/* impulse jewel */}
      <mesh position={[0, 0, 0.09]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color={RUBY} emissive={RUBY} emissiveIntensity={1.4} roughness={0.05} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Hands — hour, minute and a slender seconds hand sweeping above the  */
/* movement. Hovering the watch hastens the hours.                     */
/* ------------------------------------------------------------------ */

function Hands({ speedRef }: { speedRef: SpeedRef }) {
  const hour = useRef<THREE.Group>(null!)
  const minute = useRef<THREE.Group>(null!)
  const second = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    const k = speedRef.current
    second.current.rotation.z -= delta * 1.05 * k
    minute.current.rotation.z -= delta * 0.0875 * k
    hour.current.rotation.z -= delta * 0.0073 * k
  })

  return (
    <group>
      {/* hour */}
      <group ref={hour} position={[0, 0, 0.2]} rotation={[0, 0, -1.9]}>
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[0.055, 0.72, 0.022]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.12} />
        </mesh>
      </group>
      {/* minute */}
      <group ref={minute} position={[0, 0, 0.24]} rotation={[0, 0, -0.6]}>
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[0.04, 1.08, 0.018]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.12} />
        </mesh>
      </group>
      {/* seconds — slender, with counterweight */}
      <group ref={second} position={[0, 0, 0.28]}>
        <mesh position={[0, 0.56, 0]}>
          <boxGeometry args={[0.014, 1.2, 0.012]} />
          <meshStandardMaterial color={GOLD_HOT} metalness={1} roughness={0.1} emissive={GOLD} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.05, 0.22, 0.012]} />
          <meshStandardMaterial color={GOLD_HOT} metalness={1} roughness={0.1} />
        </mesh>
      </group>
      {/* center cap */}
      <mesh position={[0, 0, 0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.08} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Crown — small knurled cylinder on the case flank.                   */
/* ------------------------------------------------------------------ */

function Crown() {
  const knurls = useMemo(() => Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2), [])

  return (
    <group>
      {/* stem */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.14, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.26, 12]} />
        <meshStandardMaterial color={GOLD_DEEP} metalness={1} roughness={0.25} />
      </mesh>
      {/* crown body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.16, 24]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.16} />
      </mesh>
      {/* knurling — fine boxes around the rim */}
      {knurls.map((a, i) => (
        <mesh key={i} position={[0, Math.cos(a) * 0.145, Math.sin(a) * 0.145]} rotation={[-a, 0, 0]}>
          <boxGeometry args={[0.17, 0.022, 0.022]} />
          <meshStandardMaterial color={GOLD_DEEP} metalness={1} roughness={0.3} />
        </mesh>
      ))}
      {/* V signet */}
      <mesh position={[0.085, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <meshStandardMaterial color={GOLD_HOT} metalness={1} roughness={0.08} emissive={GOLD} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* ChimeRing — golden shockwave that blooms outward when the watch is  */
/* clicked, like a minute repeater struck once.                        */
/* ------------------------------------------------------------------ */

function ChimeRing({ lifeRef }: { lifeRef: { current: number } }) {
  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useRef<THREE.MeshBasicMaterial>(null!)

  useFrame((_, delta) => {
    lifeRef.current = Math.max(0, lifeRef.current - delta * 0.85)
    const l = lifeRef.current
    mesh.current.visible = l > 0.01
    const k = 1 - l
    mesh.current.scale.setScalar(1 + k * 2.6)
    mat.current.opacity = l * 0.7
  })

  return (
    <mesh ref={mesh} visible={false} position={[0, 0, 0.34]}>
      <torusGeometry args={[1.7, 0.018, 8, 72]} />
      <meshBasicMaterial ref={mat} color={GOLD_HOT} transparent opacity={0} toneMapped={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* WatchAssembly — the exploded Calibre V-47 and its case. The whole   */
/* group travels with the camera through the page, parked at a per-    */
/* section anchor (side, angle, depth, scale). Each Part flies into    */
/* its seat across its own scroll window.                              */
/* ------------------------------------------------------------------ */

const ANCHORS = [
  // x is a fraction of viewport width; y a fraction of viewport height
  // 0 hero — floating, exploded, parked clear of the headline (set per-viewport below)
  { x: 0.26, y: -0.02, z: -0.6, rx: 0.14, ry: -0.38, rz: 0.05, s: 0.92 },
  { x: 0.21, y: 0, z: 0.7, rx: 0.1, ry: 0.55, rz: 0, s: 1.05 }, // 1 movement — train assembling
  { x: -0.23, y: 0, z: 0.2, rx: 0.08, ry: -0.62, rz: -0.04, s: 0.95 }, // 2 craft — case furniture
  { x: 0, y: 0.04, z: 1.5, rx: 0, ry: 0, rz: 0, s: 1.12 }, // 3 the watch — complete, frontal
  { x: 0.24, y: 0, z: 0, rx: 0.04, ry: 1.15, rz: 0, s: 0.85 }, // 4 heritage — profile
  { x: 0, y: 0.16, z: -3.4, rx: 0.18, ry: 0.35, rz: 0, s: 0.5 }, // 5 collection — recedes
  { x: 0, y: 0.3, z: -7.5, rx: 0.26, ry: 0.95, rz: 0, s: 0.3 }, // 6 footer — a memory, above the line
]

// On narrow viewports the right-hand hero park would still cover the
// centered headline — drop the watch into the lower half instead.
const HERO_MOBILE = { x: 0, y: -0.36, z: -1.0, rx: 0.14, ry: -0.38, rz: 0.05, s: 0.66 }

function WatchAssembly() {
  const rig = useRef<THREE.Group>(null!)
  const scroll = useScroll()
  const vh = useThree((s) => s.viewport.height)
  const vw = useThree((s) => s.viewport.width)
  const anchors = useMemo(() => {
    const isNarrow = vw / vh < 0.9 // portrait-ish viewports
    return isNarrow ? [HERO_MOBILE, ...ANCHORS.slice(1)] : ANCHORS
  }, [vw, vh])

  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const speedRef = useRef(1)
  const spin = useRef(0)
  const impulse = useRef(0)
  const chimeLife = useRef(0)
  const chimeLight = useRef<THREE.PointLight>(null!)

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(scroll.offset * (PAGES - 1), 0, PAGES - 1)
    const i = Math.min(Math.floor(p), PAGES - 2)
    const f = THREE.MathUtils.smoothstep(p - i, 0, 1)
    const a = anchors[i]
    const b = anchors[i + 1]
    const mix = (ka: number, kb: number) => ka + (kb - ka) * f

    // hover hastens the whole movement
    easing.damp(speedRef, 'current', hovered ? 6 : 1, 0.35, delta)

    // slow presentation spin, strongest while section 3 is on screen
    const w3 = Math.max(0, 1 - Math.abs(p - 3))
    spin.current += delta * 0.22 * w3 * (hovered ? 2 : 1)

    // chime impulse — a soft scale pulse that breathes back down
    impulse.current = THREE.MathUtils.damp(impulse.current, 0, 3.2, delta)

    const t = state.clock.elapsedTime
    const tx = mix(a.x, b.x) * vw
    const ty = -p * vh + mix(a.y, b.y) * vh + Math.sin(t * 0.7) * 0.07
    const tz = mix(a.z, b.z)

    easing.damp3(rig.current.position, [tx, ty, tz], 0.3, delta)
    easing.dampE(rig.current.rotation, [mix(a.rx, b.rx), mix(a.ry, b.ry) + spin.current, mix(a.rz, b.rz)], 0.3, delta)
    easing.damp3(rig.current.scale, mix(a.s, b.s) * (1 + impulse.current * 0.07), 0.12, delta)

    if (chimeLight.current) chimeLight.current.intensity = 4 + chimeLife.current * 60
  })

  return (
    <group
      ref={rig}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        chimeLife.current = 1
        impulse.current = 1
      }}
    >
      {/* ---- CASE — present from the first frame, floating in the hero */}
      <mesh>
        <torusGeometry args={[1.6, 0.22, 24, 96]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.18} />
      </mesh>
      {/* caseback */}
      <mesh position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.56, 1.56, 0.3, 64]} />
        <meshStandardMaterial color={GOLD_DEEP} metalness={1} roughness={0.28} />
      </mesh>
      {/* lugs */}
      {([1, -1] as const).map((side) =>
        ([1, -1] as const).map((lr) => (
          <mesh key={`${side}${lr}`} position={[lr * 0.85, side * 1.72, -0.05]} rotation={[0, 0, lr * side * -0.35]}>
            <boxGeometry args={[0.26, 0.55, 0.24]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
          </mesh>
        )),
      )}

      {/* ---- MAINPLATE — first thing to seat (intro → movement) */}
      <group position={[0, 0, -0.06]}>
        <Part start={0.2} end={0.7} from={[-2.6, -2.2, 3.2]} fromRot={[0.9, -0.5, 0.4]} seed={1}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.32, 1.32, 0.07, 64]} />
            <meshStandardMaterial color={DARKPLATE} metalness={0.85} roughness={0.45} />
          </mesh>
        </Part>
      </group>

      {/* ---- GOING TRAIN — three gears at three speeds */}
      <group position={[-0.55, 0.38, 0.04]}>
        <Part start={0.45} end={1.0} from={[-4.3, 3.1, 3.4]} fromRot={[1.2, 0.7, -0.5]} seed={2}>
          <Gear radius={0.52} teeth={14} speed={0.55} speedRef={speedRef} />
        </Part>
      </group>
      <group position={[0.48, 0.52, 0.08]}>
        <Part start={0.55} end={1.1} from={[3.4, 2.8, 3.4]} fromRot={[-0.8, 0.9, 0.7]} seed={3}>
          <Gear radius={0.36} teeth={11} speed={-1.05} speedRef={speedRef} tone={GOLD_DEEP} />
        </Part>
      </group>
      <group position={[0.42, -0.52, 0.06]}>
        <Part start={0.65} end={1.2} from={[2.6, -3.2, 4.6]} fromRot={[0.6, -1.1, 0.3]} seed={4}>
          <Gear radius={0.28} teeth={9} speed={1.7} speedRef={speedRef} />
        </Part>
      </group>

      {/* ---- BALANCE WHEEL — the heart, beating */}
      <group position={[-0.42, -0.6, 0.1]}>
        <Part start={0.8} end={1.35} from={[-3.2, -2.8, 3.8]} fromRot={[-0.9, -0.6, 0.8]} seed={5}>
          <BalanceWheel speedRef={speedRef} />
        </Part>
      </group>

      {/* movement captions — drei Html, faded with the scroll */}
      <PartLabel position={[-1.35, 1.35, 0.4]} title="Going train" focus={1} sub="Three wheels, three tempos" />
      <PartLabel position={[-1.5, -1.5, 0.4]} title="Balance wheel" focus={1} sub="28,800 vibrations per hour" />

      {/* ---- BEZEL */}
      <group position={[0, 0, 0.3]}>
        <Part start={1.5} end={2.05} from={[0, 3.6, 5.2]} fromRot={[0.9, 0, 0.6]} seed={6}>
          <mesh>
            <torusGeometry args={[1.45, 0.1, 20, 96]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.1} />
          </mesh>
        </Part>
      </group>

      {/* ---- CHAPTER RING — twelve applied markers */}
      <group position={[0, 0, 0.16]}>
        <Part start={1.7} end={2.2} from={[-2.8, 3, 4.4]} fromRot={[0.5, 0.8, -0.7]} seed={7}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 1.16, Math.sin(a) * 1.16, 0]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.16, 0.045, 0.035]} />
                <meshStandardMaterial color={GOLD} metalness={1} roughness={0.12} />
              </mesh>
            )
          })}
        </Part>
      </group>

      {/* ---- CROWN */}
      <group position={[1.85, 0, 0]}>
        <Part start={1.9} end={2.45} from={[3.8, 1.6, 2.8]} fromRot={[0.7, 0, 1.1]} seed={8}>
          <Crown />
        </Part>
      </group>

      {/* craft caption */}
      <PartLabel position={[2.1, 0.85, 0.4]} title="Knurled crown" focus={2} sub="Eighteen cuts, by feel" />

      {/* ---- HANDS */}
      <Part start={2.3} end={2.8} from={[-2.6, -3.4, 5.4]} fromRot={[-0.6, 0.5, 1.3]} seed={9}>
        <Hands speedRef={speedRef} />
      </Part>

      {/* ---- SAPPHIRE DOME — last to seat, sealing the movement */}
      <group position={[0, 0, 0.26]}>
        <Part start={2.55} end={3.0} from={[0, 4.6, 6.4]} fromRot={[1.1, 0, -0.4]} seed={10} drift={0.2}>
          <mesh scale={[1, 1, 0.42]}>
            <sphereGeometry args={[1.48, 48, 32]} />
            <meshPhysicalMaterial
              color="#ffffff"
              metalness={0}
              roughness={0.04}
              transmission={1}
              thickness={0.4}
              ior={1.5}
              clearcoat={1}
              clearcoatRoughness={0.05}
              transparent
            />
          </mesh>
        </Part>
      </group>

      {/* chime — golden shockwave + light flash on click */}
      <ChimeRing lifeRef={chimeLife} />
      <pointLight ref={chimeLight} position={[0, 0, 1.6]} intensity={4} distance={9} color={GOLD_HOT} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* MiniWatch — collection pieces: same silhouette, three temperaments. */
/* Hover lifts the piece and hastens its hands.                        */
/* ------------------------------------------------------------------ */

function MiniWatch({
  position,
  caseColor,
  dialColor,
  handColor,
}: {
  position: Vec3
  caseColor: string
  dialColor: string
  handColor: string
}) {
  const g = useRef<THREE.Group>(null!)
  const minute = useRef<THREE.Group>(null!)
  const hour = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((state, delta) => {
    g.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35 + position[0]) * 0.4
    easing.damp3(g.current.scale, hovered ? 1.16 : 1, 0.2, delta)
    minute.current.rotation.z -= delta * (hovered ? 2.6 : 0.25)
    hour.current.rotation.z -= delta * (hovered ? 0.5 : 0.04)
  })

  return (
    <group position={position}>
      <Float speed={1.3} rotationIntensity={0.15} floatIntensity={0.5}>
        <group
          ref={g}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* case */}
          <mesh>
            <torusGeometry args={[0.92, 0.13, 20, 72]} />
            <meshStandardMaterial color={caseColor} metalness={1} roughness={0.16} />
          </mesh>
          <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.9, 0.9, 0.18, 48]} />
            <meshStandardMaterial color={caseColor} metalness={1} roughness={0.26} />
          </mesh>
          {/* dial */}
          <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.03, 48]} />
            <meshStandardMaterial color={dialColor} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* markers */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0.05]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.08, 0.022, 0.02]} />
                <meshStandardMaterial color={handColor} metalness={1} roughness={0.15} />
              </mesh>
            )
          })}
          {/* hands */}
          <group ref={hour} position={[0, 0, 0.08]} rotation={[0, 0, -2.2]}>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.035, 0.42, 0.015]} />
              <meshStandardMaterial color={handColor} metalness={1} roughness={0.1} />
            </mesh>
          </group>
          <group ref={minute} position={[0, 0, 0.1]} rotation={[0, 0, -0.9]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.025, 0.62, 0.012]} />
              <meshStandardMaterial color={handColor} metalness={1} roughness={0.1} />
            </mesh>
          </group>
          <mesh position={[0, 0, 0.12]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color={handColor} metalness={1} roughness={0.08} />
          </mesh>
          {/* crown */}
          <mesh position={[1.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.1, 16]} />
            <meshStandardMaterial color={caseColor} metalness={1} roughness={0.2} />
          </mesh>
        </group>
      </Float>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Experience root — camera rig + the watch + lights + post FX         */
/* ------------------------------------------------------------------ */

export default function Experience() {
  const scroll = useScroll()
  const vh = useThree((s) => s.viewport.height)
  const vw = useThree((s) => s.viewport.width)
  const lightRig = useRef<THREE.Group>(null!)

  useEffect(() => {
    setScrollEl(scroll.el)
  }, [scroll.el])

  useFrame((state, delta) => {
    const o = scroll.offset
    const y = -o * vh * (PAGES - 1)
    // travel down the world + restrained mouse parallax
    easing.damp3(state.camera.position, [state.pointer.x * 0.5, y - state.pointer.y * 0.25, 10], 0.32, delta)
    state.camera.lookAt(0, y, 0)
    if (lightRig.current) lightRig.current.position.y = y
    // feed the DOM progress bar
    document.documentElement.style.setProperty('--scroll', o.toFixed(4))
  })

  return (
    <>
      <ambientLight intensity={0.22} />
      <group ref={lightRig}>
        {/* warm gold key */}
        <pointLight position={[5, 2.5, 6]} intensity={55} color="#e8c285" />
        {/* cool fill, faint */}
        <pointLight position={[-6, -1.5, 4]} intensity={14} color="#cfd5e0" />
        {/* dramatic rim from behind */}
        <pointLight position={[-3, 3, -6]} intensity={70} color="#fff3da" />
      </group>

      {/* studio reflections without any network fetch */}
      <Environment resolution={64}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer intensity={3} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
          <Lightformer color="#d4af6a" intensity={2} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
          <Lightformer color="#f4efe6" intensity={1.4} position={[10, 1, 0]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
        </group>
      </Environment>

      {/* gold dust drifting through the whole atelier */}
      <Sparkles
        count={220}
        scale={[vw * 1.6, vh * PAGES, 10]}
        position={[0, (-vh * (PAGES - 1)) / 2, -2]}
        size={1.5}
        speed={0.18}
        color="#d4af6a"
        opacity={0.4}
      />

      {/* the Calibre V-47, exploded → assembled */}
      <WatchAssembly />

      {/* 5 — Collection: three temperaments of the same idea */}
      <group position={[0, -5 * vh - 0.2, 0]}>
        <MiniWatch position={[-vw * 0.27, 0, 0]} caseColor="#c9ccd1" dialColor="#10100f" handColor="#e7e9ee" />
        <MiniWatch position={[0, 0, 0.4]} caseColor="#dba87c" dialColor="#171210" handColor="#f0c9a2" />
        <MiniWatch position={[vw * 0.27, 0, 0]} caseColor="#1a1a1f" dialColor="#0a0a0c" handColor="#d4af6a" />
        <Sparkles count={70} scale={[vw, 4, 5]} size={1.6} speed={0.2} color="#d4af6a" opacity={0.5} />
      </group>

      {/* 6 — Footer: near-darkness, a few last motes of gold */}
      <group position={[0, -6 * vh, 0]}>
        <Sparkles count={50} scale={[vw * 0.8, 4, 5]} size={1.4} speed={0.12} color="#d4af6a" opacity={0.35} />
      </group>

      <EffectComposer>
        <Bloom intensity={0.45} luminanceThreshold={0.3} luminanceSmoothing={0.75} mipmapBlur />
        <Noise opacity={0.035} />
        <Vignette offset={0.18} darkness={0.9} />
      </EffectComposer>
    </>
  )
}
