"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A stateless particle field (position = f(seed, t), so any moment can be shown or scrubbed)
 * with a depth-of-field focus pull as an attention cursor. Use this only when depth, attention,
 * or a sensor field of view is the claim, not as generic particle texture. Out-of-focus points grow and fade;
 * a damped spring moves the focal depth to `focus`. Theme colors come from --fs-* tokens.
 * Mount with next/dynamic(..., { ssr: false }) inside a client component, in an aspect-ratio box.
 */
export default function FocusField({
  focus = 6,
  count = 128 * 128,
  playing = true,
  time,
}: {
  /** View-space depth to bring into focus (camera at z = 6; the cloud spans about 4.7-7.3). */
  focus?: number;
  count?: number;
  playing?: boolean;
  /** Set to scrub a deterministic moment instead of playing. */
  time?: number;
}) {
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas
      flat
      dpr={[1, 1.5]}
      frameloop={playing && !reduced && time === undefined ? "always" : "demand"}
      camera={{ fov: 28, position: [0, 0, 6] }}
      gl={{ antialias: true, alpha: true }}
    >
      <Field focus={focus} count={count} time={time} />
    </Canvas>
  );
}

const vertexShader = /* glsl */ `
uniform float uTime; uniform float uFocus; uniform float uBlur; uniform float uPixelRatio;
attribute vec3 seed; varying float vAlpha; varying float vDisc;
// Curl of a smooth trigonometric potential: divergence-free, cheap, deterministic.
vec3 potential(vec3 p) { return vec3(sin(p.y * 1.7 + uTime * 0.21) + cos(p.z * 1.3), sin(p.z * 1.9 - uTime * 0.17) + cos(p.x * 1.1), sin(p.x * 1.5 + uTime * 0.13) + cos(p.y * 1.6)); }
vec3 curlOf(vec3 p) {
  float e = 0.01;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 px = (potential(p + dx) - potential(p - dx)) / (2.0 * e);
  vec3 py = (potential(p + dy) - potential(p - dy)) / (2.0 * e);
  vec3 pz = (potential(p + dz) - potential(p - dz)) / (2.0 * e);
  return vec3(py.z - pz.y, pz.x - px.z, px.y - py.x);
}
void main() {
  vec3 pos = seed + 0.12 * curlOf(seed * 1.1);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float d = abs(uFocus - -mv.z);
  // A few soft bokeh discs give depth; the rest stay fine dust (as in the pmndrs example).
  float pick = fract(sin(dot(seed, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  vDisc = step(0.92, pick);
  gl_PointSize = (1.4 + vDisc * min(d * uBlur, 18.0)) * uPixelRatio;
  vAlpha = vDisc > 0.5 ? (1.04 - clamp(d * 1.5, 0.0, 1.0)) * 0.38 : 0.95 - clamp(d * 0.75, 0.0, 0.8);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor; varying float vAlpha; varying float vDisc;
void main() {
  vec2 c = 2.0 * gl_PointCoord - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  gl_FragColor = vec4(uColor, vAlpha * mix(1.0, smoothstep(1.0, 0.35, r), vDisc));
}`;

function Field({ focus, count, time }: { focus: number; count: number; time?: number }) {
  const { gl, invalidate } = useThree();
  const spring = useRef({ value: focus, velocity: 0 });
  const geometry = useMemo(() => {
    const seeds = new Float32Array(count * 3);
    let s = 7;
    const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < count; i++) {
      // Uniform in a ball of radius 1.3 (fits the 28° frame at distance 6).
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const r = 1.3 * Math.cbrt(rand());
      const q = Math.sqrt(1 - u * u);
      seeds.set([r * q * Math.cos(phi), r * q * Math.sin(phi), r * u], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seeds, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uFocus: { value: focus },
          uBlur: { value: 14 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color() },
        },
        vertexShader,
        fragmentShader,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Theme: read the token from the canvas's figure and follow theme switches.
  useEffect(() => {
    const read = () => {
      const probe = document.createElement("span");
      probe.style.color = "var(--fs-fg)";
      gl.domElement.parentElement?.append(probe);
      material.uniforms.uColor.value.set(getComputedStyle(probe).color);
      probe.remove();
      invalidate();
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-fs-theme", "data-fs-mode", "data-style-palette"] });
    return () => observer.disconnect();
  }, [gl, material, invalidate]);

  useEffect(() => invalidate(), [focus, time, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    // Critically damped spring (smooth damp): frame-rate independent, carries velocity.
    const s = spring.current;
    const omega = 2 / 0.5;
    const x = omega * dt;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = s.value - focus;
    const temp = (s.velocity + omega * change) * dt;
    s.velocity = (s.velocity - omega * temp) * decay;
    s.value = focus + (change + temp) * decay;
    material.uniforms.uFocus.value = s.value;
    material.uniforms.uTime.value = time ?? state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    if (Math.abs(s.value - focus) > 1e-3) state.invalidate();
  });

  return <points geometry={geometry} material={material} />;
}
