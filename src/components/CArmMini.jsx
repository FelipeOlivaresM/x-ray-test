import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { tubeDir } from '../lib/carm.js';

// Paciente en decúbito supino sobre la mesa. Mapeo paciente → escena:
// craneal (Y) → +X, anterior (Z) → +Y (arriba), izquierda (X) → +Z.
const toWorld = (v) => new THREE.Vector3(v.y, v.z, v.x);

function line(geo, color, opacity = 1) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

/** Esquema 3D pequeño del arco en C, la mesa y el paciente. */
export default function CArmMini({ rot = 0, ang = 0, regionY = 8, className = '' }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const st = useRef({});

  useEffect(() => {
    const s = st.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    cam.position.set(-3.2, 3.0, 5.2);
    cam.lookAt(0, 0.1, 0);

    const fill = (c, o = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o });
    // suelo
    const grid = new THREE.GridHelper(8, 16, 0x1d5560, 0x10343b);
    grid.position.y = -1.05;
    scene.add(grid);
    // mesa
    const tableGeo = new THREE.BoxGeometry(4.2, 0.08, 0.9);
    const table = new THREE.Mesh(tableGeo, fill(0x0d2026));
    table.position.set(0.2, -0.12, 0);
    table.add(line(tableGeo, 0x2fbfd4, 0.8));
    const legGeo = new THREE.BoxGeometry(0.25, 0.9, 0.5);
    const leg = new THREE.Mesh(legGeo, fill(0x0b1a1f));
    leg.position.set(1.3, -0.6, 0);
    leg.add(line(legGeo, 0x1f7f8d, 0.6));
    scene.add(table, leg);
    // paciente (silueta)
    const pat = new THREE.Group();
    const pm = fill(0x2a6f7a, 0.55);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 6, 16), pm);
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 0.7);
    body.position.set(0.15, 0.12, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), pm);
    head.position.set(1.32, 0.14, 0);
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.4, 6, 12), pm);
    legs.rotation.z = Math.PI / 2;
    legs.position.set(-1.25, 0.06, 0);
    legs.scale.set(1, 1, 1.4);
    pat.add(body, head, legs);
    pat.traverse((o) => o.isMesh && o.add(line(o.geometry, 0x6fe3f2, 0.35)));
    scene.add(pat);
    // arco en C
    const carm = new THREE.Group();
    const R = 1.05;
    const ringGeo = new THREE.TorusGeometry(R, 0.055, 10, 64, Math.PI * 1.25);
    const ring = new THREE.Mesh(ringGeo, fill(0x14343c));
    ring.rotation.z = Math.PI * 0.375;
    ring.add(line(ringGeo, 0x38e1f5, 0.5));
    const tubeGeo = new THREE.BoxGeometry(0.32, 0.26, 0.32);
    const tube = new THREE.Mesh(tubeGeo, fill(0x3a2a10));
    tube.position.y = R - 0.12;
    tube.add(line(tubeGeo, 0xffb547));
    const detGeo = new THREE.BoxGeometry(0.62, 0.06, 0.62);
    const det = new THREE.Mesh(detGeo, fill(0x0f2b33));
    det.position.y = -R + 0.08;
    det.add(line(detGeo, 0x38e1f5));
    const beamGeo = new THREE.ConeGeometry(0.3, R * 2 - 0.32, 4, 1, true);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    beam.rotation.y = Math.PI / 4;
    beam.position.y = 0.02;
    beam.add(line(beamGeo, 0xffb547, 0.45));
    carm.add(ring, tube, det, beam);
    scene.add(carm);
    Object.assign(s, { renderer, scene, cam, carm });

    const resize = () => {
      const w = Math.max(wrapRef.current.clientWidth, 2);
      const h = Math.max(wrapRef.current.clientHeight, 2);
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    resize();
    return () => {
      ro.disconnect();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  function draw() {
    const s = st.current;
    if (!s.renderer) return;
    const t = toWorld(tubeDir(s.rot ?? 0, s.ang ?? 0)).normalize();
    const axis = new THREE.Vector3(1, 0, 0);
    const n = axis.clone().addScaledVector(t, -axis.dot(t)).normalize();
    const x = new THREE.Vector3().crossVectors(t, n);
    const m = new THREE.Matrix4().makeBasis(x, t, n);
    s.carm.quaternion.setFromRotationMatrix(m);
    // el isocentro se desplaza sobre la mesa según la región (craneal → +X)
    s.carm.position.set(Math.min(Math.max((s.regionY - 8.5) / 6, -1.4), 1.2), 0.12, 0);
    s.renderer.render(s.scene, s.cam);
  }

  useEffect(() => {
    Object.assign(st.current, { rot, ang, regionY });
    draw();
  }, [rot, ang, regionY]);

  return (
    <div ref={wrapRef} className={`carm-mini ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}
