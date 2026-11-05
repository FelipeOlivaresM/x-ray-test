import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LAYER_SURF } from '../lib/shaders.js';
import { carmCamera } from '../lib/carm.js';

const LAYER_HELP = 2;
const AMBER = 0xffb547;
const CYAN = 0x38e1f5;

function textSprite(text, color = '#ffb547', size = 64) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.font = `600 ${size}px "Share Tech Mono", ui-monospace, monospace`;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cubo de orientación: A/P anterior-posterior, D/I derecha-izquierda, Cr/Ca. */
function makeOrientationCube() {
  const faces = [
    ['I', '#9fe7f2'], // +X izquierda del paciente
    ['D', '#9fe7f2'], // -X derecha
    ['Cr', '#ffb547'], // +Y craneal
    ['Ca', '#ffb547'], // -Y caudal
    ['A', '#ffffff'], // +Z anterior
    ['P', '#ffffff'], // -Z posterior
  ];
  const mats = faces.map(([t, col]) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,22,30,0.92)';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(56,225,245,0.8)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 122, 122);
    g.fillStyle = col;
    g.font = '600 58px "Share Tech Mono", ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t, 64, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex });
  });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats);
  const scene = new THREE.Scene();
  scene.add(cube);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  return { scene, cam, cube };
}

/**
 * Vista 3D del estudio: hueso(s) de la región, esqueleto translúcido de
 * contexto, haz del tubo de rayos X y detector.
 */
export default function Anatomy3D({
  study,
  rot = 0,
  ang = 0,
  showBeam = true,
  showPlanes = false,
  skeleton = true,
  seeThrough = false,
  skin = false,
  labels = false,
  highlight = false,
  reduction = 0,
  detectorView = false,
  autoRotate = false,
  framing = 'region', // 'region' | 'body'
  className = '',
  children,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);
  const st = useRef({});
  const props = useRef({});
  const [failed, setFailed] = useState(false);
  props.current = { study, rot, ang, showBeam, showPlanes, labels, detectorView, autoRotate };

  useEffect(() => {
    const s = st.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    } catch (e) {
      console.warn('WebGL no disponible', e);
      setFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.autoClear = false;
    const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
    cam.layers.enable(LAYER_SURF);
    cam.layers.enable(LAYER_HELP);
    const controls = new OrbitControls(cam, canvasRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.minDistance = 0.8;
    controls.maxDistance = 40;
    const orient = makeOrientationCube();

    // ayudas: haz, detector, tubo, planos
    const help = new THREE.Group();
    help.traverse((o) => o.layers.set(LAYER_HELP));
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3 * 2), 3));
    const beamLines = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.75 }));
    const coneGeo = new THREE.BufferGeometry();
    coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(5 * 3), 3));
    coneGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const cone = new THREE.Mesh(
      coneGeo,
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    const detector = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x0b2a33, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    );
    const detEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: CYAN }));
    detector.add(detEdge);
    const grid = new THREE.GridHelper(1, 8, 0x1d6b78, 0x14505a);
    grid.rotation.x = Math.PI / 2;
    grid.material.transparent = true;
    grid.material.opacity = 0.6;
    detector.add(grid);
    const tube = new THREE.Group();
    const tubeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 24), new THREE.MeshBasicMaterial({ color: 0x1b3640 }));
    tubeBody.rotation.z = Math.PI / 2;
    tube.add(tubeBody);
    tube.add(new THREE.LineSegments(new THREE.EdgesGeometry(tubeBody.geometry), new THREE.LineBasicMaterial({ color: AMBER })));
    tube.children[1].rotation.z = Math.PI / 2;
    const tubeLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: textSprite('TUBO', '#ffb547', 30), depthTest: false }));
    tubeLabel.scale.set(0.7, 0.7, 1);
    tubeLabel.position.y = 0.5;
    tube.add(tubeLabel);
    const detLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: textSprite('DET', '#38e1f5', 30), depthTest: false }));
    detLabel.scale.set(0.6, 0.6, 1);
    const planes = new THREE.Group();
    [
      [0x38e1f5, [0, Math.PI / 2, 0]],
      [0xffb547, [0, 0, 0]],
      [0x8ef0a8, [Math.PI / 2, 0, 0]],
    ].forEach(([col, r]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
      p.rotation.set(...r);
      p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 })));
      planes.add(p);
    });
    help.add(beamLines, cone, detector, tube, detLabel, planes);
    const setLayer = (o) => o.traverse((x) => x.layers.set(LAYER_HELP));
    setLayer(help);
    const beamCam = new THREE.PerspectiveCamera();

    Object.assign(s, { renderer, cam, controls, orient, help, beamLines, cone, detector, tube, detLabel, planes, beamCam, framedFor: null });

    const resize = () => {
      const w = Math.max(wrapRef.current.clientWidth, 2);
      const h = Math.max(wrapRef.current.clientHeight, 2);
      s.size = [w, h];
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    resize();

    const loop = () => {
      s.raf = requestAnimationFrame(loop);
      frame();
    };
    loop();
    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      controls.dispose();
      s.attached?.remove(help);
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  function updateHelpers() {
    const s = st.current;
    const p = props.current;
    const study = p.study;
    const geo = carmCamera(s.beamCam, study, p.rot, p.ang, study.region.detector[0] / study.region.detector[1]);
    // esquinas del detector
    const right = new THREE.Vector3().setFromMatrixColumn(s.beamCam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(s.beamCam.matrixWorld, 1);
    const fwd = new THREE.Vector3().setFromMatrixColumn(s.beamCam.matrixWorld, 2).negate();
    const dist = geo.src.distanceTo(geo.det);
    const c = geo.src.clone().addScaledVector(fwd, dist);
    const hw = geo.dw / 2;
    const hh = geo.dh / 2;
    const corners = [
      c.clone().addScaledVector(right, -hw).addScaledVector(up, -hh),
      c.clone().addScaledVector(right, hw).addScaledVector(up, -hh),
      c.clone().addScaledVector(right, hw).addScaledVector(up, hh),
      c.clone().addScaledVector(right, -hw).addScaledVector(up, hh),
    ];
    const pos = s.beamLines.geometry.attributes.position;
    let k = 0;
    const seg = (a, b) => {
      pos.setXYZ(k++, a.x, a.y, a.z);
      pos.setXYZ(k++, b.x, b.y, b.z);
    };
    corners.forEach((q) => seg(geo.src, q));
    seg(geo.src, c);
    while (k < pos.count) pos.setXYZ(k++, geo.src.x, geo.src.y, geo.src.z);
    pos.needsUpdate = true;
    const cp = s.cone.geometry.attributes.position;
    cp.setXYZ(0, geo.src.x, geo.src.y, geo.src.z);
    corners.forEach((q, i) => cp.setXYZ(i + 1, q.x, q.y, q.z));
    cp.needsUpdate = true;
    s.cone.geometry.computeBoundingSphere();
    s.beamLines.geometry.computeBoundingSphere();
    s.detector.position.copy(c);
    s.detector.quaternion.copy(s.beamCam.quaternion);
    s.detector.scale.set(geo.dw, geo.dh, 1);
    s.detLabel.position.copy(corners[2]).addScaledVector(up, 0.25);
    s.tube.position.copy(geo.src);
    s.tube.quaternion.copy(s.beamCam.quaternion);
    s.planes.position.copy(study.iso);
    s.planes.visible = p.showPlanes;
    [s.beamLines, s.cone, s.detector, s.tube, s.detLabel].forEach((o) => (o.visible = p.showBeam));
    return geo;
  }

  function frameStudy() {
    const s = st.current;
    const p = props.current;
    const study = p.study;
    const iso = study.iso;
    const span = Math.max(...study.region.detector) * (study.scale < 1 ? 0.8 : 1);
    // en paneles estrechos manda el campo horizontal
    const aspect = Math.min(1, s.size[0] / s.size[1]);
    const d = (span / 2 / (Math.tan((s.cam.fov * Math.PI) / 360) * Math.max(aspect, 0.55))) * 1.25;
    // vista 3/4 anterior-derecha
    const dir = new THREE.Vector3(-0.55, 0.28, 0.79).normalize();
    s.controls.target.copy(iso);
    s.cam.position.copy(iso).addScaledVector(dir, d);
    s.cam.near = 0.05;
    s.cam.far = 80;
    s.cam.updateProjectionMatrix();
    s.controls.update();
  }

  function frame() {
    const s = st.current;
    const p = props.current;
    const r = s.renderer;
    if (!r) return;
    const [w, h] = s.size;
    r.setClearColor(0x000000, 0);
    r.clear();
    if (!p.study) return;
    if (s.attached !== p.study.scene) {
      s.attached?.remove(s.help);
      p.study.scene.add(s.help);
      s.attached = p.study.scene;
    }
    if (s.framedFor !== p.study) {
      s.framedFor = p.study;
      frameStudy();
    }
    updateHelpers();
    if (p.detectorView) {
      // vista desde el tubo: misma geometría que el DRR
      s.cam.position.copy(s.beamCam.position);
      s.cam.quaternion.copy(s.beamCam.quaternion);
      s.cam.up.copy(s.beamCam.up);
      s.cam.fov = s.beamCam.fov * 1.15;
      s.cam.updateProjectionMatrix();
      s.controls.target.copy(p.study.iso);
      s.controls.enabled = false;
    } else {
      if (!s.controls.enabled) {
        s.controls.enabled = true;
        s.cam.up.set(0, 1, 0);
        s.cam.fov = 32;
        s.cam.updateProjectionMatrix();
        frameStudy();
      }
      s.controls.autoRotate = p.autoRotate;
      s.controls.autoRotateSpeed = 0.9;
      s.controls.update();
    }
    r.setViewport(0, 0, w, h);
    r.render(p.study.scene, s.cam);
    // cubo de orientación (esquina inferior izquierda)
    const o = s.orient;
    const q = s.cam.quaternion.clone();
    o.cam.position.set(0, 0, 3.2).applyQuaternion(q);
    o.cam.quaternion.copy(q);
    const size = Math.min(84, w * 0.18);
    r.clearDepth();
    r.setScissorTest(true);
    r.setScissor(10, 10, size, size);
    r.setViewport(10, 10, size, size);
    r.render(o.scene, o.cam);
    r.setScissorTest(false);
    r.setViewport(0, 0, w, h);
    drawLabels();
  }

  function drawLabels() {
    const s = st.current;
    const p = props.current;
    const el = labelRef.current;
    if (!el) return;
    if (!p.labels || !p.study) {
      if (el.childElementCount) el.innerHTML = '';
      return;
    }
    const [w, h] = s.size;
    const items = p.study.landmarks;
    if (el.childElementCount !== items.length) {
      el.innerHTML = items.map((l) => `<div class="lbl3d"><i></i><span>${l.name}</span></div>`).join('');
    }
    items.forEach((l, i) => {
      const v = l.pos.clone().project(s.cam);
      const node = el.children[i];
      const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      node.style.display = vis ? '' : 'none';
      if (vis) node.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    });
  }

  // estado de la escena del estudio
  useEffect(() => {
    if (!study) return;
    study.setSkeleton(skeleton);
    study.setSeeThrough(seeThrough);
    study.setSkin(skin);
    study.setHighlight(highlight);
    study.setReduction(reduction);
  }, [study, skeleton, seeThrough, skin, highlight, reduction]);

  return (
    <div ref={wrapRef} className={`anat3d ${className}`}>
      <canvas ref={canvasRef} />
      <div ref={labelRef} className="labels3d" />
      {failed && <div className="viewer-fail">Tu navegador no permite WebGL.</div>}
      {!study && !failed && <div className="xray-loading">Cargando esqueleto…</div>}
      {children}
    </div>
  );
}
