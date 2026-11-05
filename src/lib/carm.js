// Geometría del arco en C / tubo de rayos X.
// rot: giro alrededor del eje craneocaudal. 0 = AP (tubo anterior), 90 = tubo a la
//      derecha del paciente, -90 = tubo a la izquierda, ±180 = PA.
// ang: inclinación craneocaudal. + = cefálica (el haz apunta hacia la cabeza).
import * as THREE from 'three';
import { t } from '../i18n/index.js';

export const SID = 10; // distancia fuente-detector: 100 cm
const D2R = Math.PI / 180;

/** Dirección del tubo vista desde el isocentro. */
export function tubeDir(rot, ang) {
  const r = rot * D2R;
  const a = ang * D2R;
  return new THREE.Vector3(-Math.sin(r) * Math.cos(a), -Math.sin(a), Math.cos(r) * Math.cos(a));
}

/** Configura una cámara de perspectiva como el haz cónico del tubo. */
export function carmCamera(cam, study, rot, ang, aspect = 1) {
  const reg = study.region;
  const s = study.scale;
  const [dw, dh] = reg.detector.map((v) => v * (s < 1 ? 0.5 + 0.5 * s : 1));
  const odd = reg.odd * (s < 1 ? s : 1);
  const t = tubeDir(rot, ang);
  const iso = study.iso;
  const src = iso.clone().addScaledVector(t, SID - odd);
  cam.position.copy(src);
  // "arriba" de la imagen: craneal proyectado en el plano del detector
  const b = t.clone().negate();
  let up = new THREE.Vector3(0, 1, 0).addScaledVector(b, -b.y);
  if (up.lengthSq() < 1e-6) up = new THREE.Vector3(0, 0, 1);
  cam.up.copy(up.normalize());
  cam.lookAt(iso);
  // el detector (dw × dh) se ajusta al aspecto del lienzo sin deformar
  let h = dh;
  if (dw / dh > aspect) h = dw / aspect;
  cam.fov = 2 * Math.atan(h / 2 / SID) / D2R;
  cam.aspect = aspect;
  cam.near = 0.5;
  cam.far = SID + 4;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return { src, det: iso.clone().addScaledVector(b, odd), dw, dh, collim: [Math.min(1, dw / (h * aspect)), Math.min(1, dh / h)] };
}

const pad = (n) => String(Math.round(Math.abs(n)));
export function rotLabel(rot) {
  const r = ((rot + 540) % 360) - 180;
  if (Math.abs(r) < 0.5) return 'AP 0°';
  if (Math.abs(Math.abs(r) - 180) < 0.5) return 'PA 180°';
  return `${r > 0 ? t('DER') : t('IZQ')} ${pad(r)}°`;
}
export function angLabel(ang) {
  if (Math.abs(ang) < 0.5) return '0°';
  return `${ang > 0 ? t('CEF') : t('CAU')} ${pad(ang)}°`;
}
