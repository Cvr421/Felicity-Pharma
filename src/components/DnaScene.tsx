import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatmullRomCurve3, Quaternion, Vector3, type Group } from "three";

type SceneColors = { ivory: string; mineral: string; signal: string };

function Helix({ colors, reducedMotion }: { colors: SceneColors; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => {
    const point = (t: number, phase: number) => {
      const angle = t * Math.PI * 3.4 + phase;
      return new Vector3(Math.cos(angle) * 0.92, (t - 0.5) * 6.7, Math.sin(angle) * 0.92);
    };
    const strands = [0, Math.PI].map((phase) => new CatmullRomCurve3(
      Array.from({ length: 101 }, (_, i) => point(i / 100, phase)), false, "centripetal",
    ));
    const rungs = Array.from({ length: 27 }, (_, i) => {
      const t = (i + 0.5) / 27;
      const start = point(t, 0);
      const end = point(t, Math.PI);
      const direction = end.clone().sub(start);
      return {
        position: start.clone().add(end).multiplyScalar(0.5),
        length: direction.length(),
        quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
        color: i % 5 === 0 ? colors.signal : i % 4 === 0 ? colors.mineral : colors.ivory,
      };
    });
    return { strands, rungs };
  }, [colors]);

  useFrame((_, rawDelta) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y += Math.min(rawDelta, 0.05) * 0.14;
  });

  return (
    <group ref={group} rotation={[0.12, -0.35, -0.48]} scale={0.9}>
      {geometry.strands.map((curve, index) => (
        <mesh key={index} castShadow>
          <tubeGeometry args={[curve, 96, 0.145, 8, false]} />
          <meshStandardMaterial color={colors.ivory} metalness={0.2} roughness={0.3} />
        </mesh>
      ))}
      {geometry.rungs.map((rung, index) => (
        <mesh key={index} position={rung.position} quaternion={rung.quaternion} castShadow>
          <cylinderGeometry args={[0.058, 0.058, rung.length, 10]} />
          <meshStandardMaterial color={rung.color} metalness={0.32} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function DnaScene() {
  const [colors, setColors] = useState<SceneColors | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const resolveColor = (value: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) return "#888888";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return `rgb(${red}, ${green}, ${blue})`;
    };
    setColors({
      ivory: resolveColor(styles.getPropertyValue("--ivory").trim()),
      mineral: resolveColor(styles.getPropertyValue("--mineral").trim()),
      signal: resolveColor(styles.getPropertyValue("--signal").trim()),
    });
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (!colors) return <div className="h-full w-full" aria-hidden="true" />;

  return (
    <Canvas dpr={[1, 1.25]} camera={{ position: [0, 0, 9.5], fov: 42 }} gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 5, 6]} intensity={3.4} color={colors.ivory} />
      <pointLight position={[-3, -2, 4]} intensity={13} color={colors.mineral} />
      <Helix colors={colors} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
