// Radiografías reales con licencia abierta (Wikimedia Commons).
// Solo se usan licencias que permiten reutilización: CC0, dominio público,
// CC BY y CC BY-SA. Se citan autor, licencia y fuente en cada uso.
const CC0 = { license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const PD = { license: 'Dominio público', licenseUrl: '' };
const BY3 = { license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' };
const BY4 = { license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' };
const SA3 = { license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' };
const SA4 = { license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const C = 'https://commons.wikimedia.org/wiki/File:';

export const RADIOGRAPHS = {
  wri1: {
    file: 'wri1.jpg',
    title: 'Muñeca normal, proyección PA',
    note: 'Muñeca izquierda de un adulto sin lesiones.',
    author: 'Mikael Häggström, M.D.',
    source: `${C}X-ray_of_normal_wrist_by_dorsoplantar_projection_(crop).jpg`,
    ...CC0,
  },
  wri2: {
    file: 'wri2.jpg',
    title: 'Muñeca normal, proyección lateral',
    note: 'Muñeca izquierda de un adulto sin lesiones.',
    author: 'Mikael Häggström, M.D.',
    source: `${C}X-ray_of_normal_wrist_by_lateral_projection_(crop).jpg`,
    ...CC0,
  },
  hand1: {
    file: 'hand1.jpg',
    title: 'Mano normal, proyección PA',
    note: 'Mano izquierda de un adulto sin lesiones.',
    author: 'Mikael Häggström, M.D.',
    source: `${C}X-ray_of_normal_hand_by_dorsoplantar_projection.jpg`,
    ...CC0,
  },
  col2: {
    file: 'col2.jpg',
    title: 'Fractura de Colles, AP y lateral',
    note: 'Radio distal con desplazamiento dorsal del fragmento distal.',
    author: 'Lucien Monfils',
    source: `${C}Colles%27_Fracture_of_Radius.jpg`,
    ...SA4,
  },
  col1: {
    file: 'col1.jpg',
    title: 'Fractura de Colles',
    note: 'Fractura del radio distal con desplazamiento.',
    author: 'Ashish j29',
    source: `${C}Colles_fracture.JPG`,
    ...BY3,
  },
  gre1: {
    file: 'gre1.jpg',
    title: 'Fractura en tallo verde, AP',
    note: 'Radio distal de un niño, con fisis abiertas.',
    author: 'Sara Nabih',
    source: `${C}Greenstick_fracture,_A-P_view.jpg`,
    ...SA4,
  },
  gre2: {
    file: 'gre2.jpg',
    title: 'Fractura en tallo verde, lateral',
    note: 'La angulación se aprecia mejor en la lateral.',
    author: 'Sara Nabih',
    source: `${C}Greenstick_fracture,_lateral_view.jpg`,
    ...SA4,
  },
  box1: {
    file: 'box1.jpg',
    title: 'Fractura del boxeador, PA',
    note: 'Cuello del 5.º metacarpiano de la mano izquierda.',
    author: 'Roberto J. Galindo',
    source: `${C}Boxers_fracture.JPG`,
    ...SA4,
  },
  box2: {
    file: 'box2.jpg',
    title: 'Fractura del boxeador, lateral',
    note: 'La lateral muestra la angulación volar de la cabeza.',
    author: 'Roberto J. Galindo',
    source: `${C}Boxers_fracture-lateral_xray.JPG`,
    ...SA4,
  },
  spi1: {
    file: 'spi1.png',
    title: 'Fractura espiroidea de tibia',
    note: 'Trazo largo que rodea la diáfisis.',
    author: 'James Heilman, MD',
    source: `${C}Spiral_fracture_of_the_tibia.PNG`,
    ...SA3,
  },
  tib1: {
    file: 'tib1.jpg',
    title: 'Fractura de tibia y peroné distales',
    note: 'Proyección frontal antes de la reparación, con férula.',
    author: 'Donada por el paciente (Wikimedia Commons)',
    source: `${C}Fractured_TIBIA_FIBULA_01-15_1.jpg`,
    ...SA3,
  },
  cla3: {
    file: 'cla3.jpg',
    title: 'Fractura de clavícula, hombro AP',
    note: 'Hombro derecho: compara con la proyección AP simulada.',
    author: 'Olegitch',
    source: `${C}%D0%9F%D0%B5%D1%80%D0%B5%D0%BB%D0%BE%D0%BC_%D0%BA%D0%BB%D1%8E%D1%87%D0%B8%D1%86%D1%8B.jpg`,
    ...CC0,
  },
  cla1: {
    file: 'cla1.jpg',
    title: 'Fractura de clavícula izquierda',
    note: 'Tercio medio, con desplazamiento.',
    author: 'Majorkev',
    source: `${C}Clavicle_Fracture_Left.jpg`,
    ...BY3,
  },
  hip1: {
    file: 'hip1.jpg',
    title: 'Fractura de cadera',
    note: 'Fractura del fémur proximal (flecha en la imagen original).',
    author: 'Booyabazooka',
    source: `${C}Cdm_hip_fracture_343.jpg`,
    ...SA3,
  },
  hip2: {
    file: 'hip2.jpg',
    title: 'Fractura de cadera con leve compresión',
    note: 'Mujer de 77 años después de una caída en casa.',
    author: 'Mikael Häggström, M.D.',
    source: `${C}X-ray_of_mildly_compressed_hip_fracture.jpg`,
    ...CC0,
  },
  hip3: {
    file: 'hip3.jpg',
    title: 'Fractura trocantérica conminuta',
    note: 'Fractura de cadera con varios fragmentos.',
    author: 'Rohan R. Memon, Drashtant Patel y Nishant Juva',
    source: `${C}X-ray_of_a_comminuted_hip_fracture.jpg`,
    ...BY4,
  },
};

export const radiographUrl = (id) => `${import.meta.env.BASE_URL}radiographs/${RADIOGRAPHS[id].file}`;
export const RADIOGRAPH_LIST = Object.entries(RADIOGRAPHS).map(([id, r]) => ({ id, ...r }));
export const PD_INFO = PD;
