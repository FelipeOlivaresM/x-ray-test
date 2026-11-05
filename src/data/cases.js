// Casos clínicos simulados sobre huesos reales (BodyParts3D y donantes con licencia abierta).
// Todo el contenido es educativo y ficticio. Las fracturas se definen en el
// marco anatómico de cada hueso (u = proximal, a = anterior, l = lateral).
import { FINGER5, HAND, flip, physisCut, plane, v3 } from './anatomy.js';

export const LEVELS = {
  basico: { label: 'Básico', color: 'var(--ok)' },
  intermedio: { label: 'Intermedio', color: 'var(--warn)' },
  avanzado: { label: 'Avanzado', color: 'var(--bad)' },
};

export const ABCS = [
  { key: 'A', title: 'Alineación', hint: 'Ejes de los huesos y relaciones articulares. ¿Hay angulación, traslación o luxación?' },
  { key: 'B', title: 'Hueso', hint: 'Recorre todo el contorno cortical y el patrón trabecular buscando interrupciones o escalones.' },
  { key: 'C', title: 'Cartílago / articulaciones', hint: 'Espacios articulares, superficies y, en niños, las fisis (placas de crecimiento).' },
  { key: 'S', title: 'Partes blandas', hint: 'Aumento de volumen, derrame o aire. A veces son la única pista.' },
];

// ruido del trazo: amplitud (dm), frecuencia, semilla
const rough = (amp, freq, seed) => ({ amp, freq, seed });

export const CASES = [
  {
    id: 'tibia-transversa',
    title: 'Caso 1 · Pierna',
    level: 'basico',
    region: 'Miembro inferior',
    patient: { age: 17, sex: 'M' },
    vignette:
      'Futbolista de 17 años que recibe una patada directa en la cara anterior de la pierna derecha. Dolor intenso, aumento de volumen y no puede apoyar. Pulsos distales presentes.',
    objective: 'Reconocer el trazo de una fractura diafisaria y describir su desplazamiento.',
    hint: 'Sigue la cortical de la tibia desde la meseta hasta el tobillo. Detente en el tercio medio.',
    diagnosis: 'Fractura transversa de la diáfisis tibial, tercio medio, con leve traslación lateral del fragmento distal.',
    study: {
      region: 'pierna',
      fracture: ({ frame }) => {
        const F = frame('tibia', 1.75);
        const pl = plane(F.c, F.vec(0.08, 1, 0.06), rough(0.028, 9, 1.7));
        return {
          bone: 'tibia',
          point: F.c,
          tolerance: 0.3,
          pieces: [{ planes: [pl] }, { planes: [flip(pl)], mover: 'd' }],
          movers: { d: { pivot: F.c, t: F.vec(0.05, -0.012, 0.025), rot: [{ from: F.vec(0, -1, 0), to: F.l, deg: 4 }] } },
        };
      },
    },
    views: ['ap', 'lat'],
    radiographs: ['tib1'],
    questions: [
      {
        id: 'trazo',
        skill: 'Clasificación',
        prompt: '¿Cómo describes el trazo de la fractura?',
        options: ['Transverso', 'Oblicuo', 'Espiroideo', 'Conminuto'],
        answer: 0,
        explanation:
          'El trazo es perpendicular al eje longitudinal del hueso. Es típico de un golpe directo o de fuerzas de flexión. El oblicuo forma un ángulo con el eje y el espiroideo rodea el hueso.',
      },
      {
        id: 'segmento',
        skill: 'Anatomía',
        prompt: '¿Qué hueso y qué segmento están comprometidos?',
        options: ['Peroné, tercio proximal', 'Tibia, tercio medio de la diáfisis', 'Tibia, metáfisis distal', 'Fémur distal'],
        answer: 1,
        explanation: 'La interrupción cortical está en el tercio medio de la diáfisis tibial. El peroné se ve íntegro en estas proyecciones.',
      },
      {
        id: 'proyecciones',
        skill: 'Técnica',
        prompt: '¿Qué estudio mínimo es adecuado para valorar una fractura diafisaria de tibia?',
        options: [
          'Una sola proyección AP de la zona dolorosa',
          'AP y lateral de pierna que incluyan rodilla y tobillo',
          'Solo proyección lateral de tobillo',
          'Oblicuas de pie',
        ],
        answer: 1,
        explanation:
          'Regla de los dos: dos proyecciones ortogonales y las dos articulaciones vecinas. Así se valora el desplazamiento real y se descartan lesiones asociadas.',
      },
    ],
    teaching: [
      'Describe siempre en orden: hueso, segmento, trazo, desplazamiento (traslación, angulación, acortamiento y rotación) y compromiso articular.',
      'Por convención, el desplazamiento se describe según el fragmento distal.',
    ],
    pitfalls: ['No te detengas en el primer hallazgo: revisa el peroné completo y ambas articulaciones.'],
  },
  {
    id: 'clavicula',
    title: 'Caso 2 · Hombro',
    level: 'basico',
    region: 'Miembro superior',
    patient: { age: 24, sex: 'M' },
    vignette: 'Ciclista de 24 años que cae sobre el hombro derecho. Dolor y deformidad palpable en la región clavicular. Mantiene el brazo pegado al cuerpo.',
    objective: 'Identificar la fractura de clavícula y su desplazamiento típico.',
    hint: 'Recorre la clavícula del extremo esternal al acromial. Busca un escalón en la curva en "S".',
    diagnosis: 'Fractura del tercio medio de la clavícula derecha, con descenso del fragmento lateral y acabalgamiento.',
    study: {
      region: 'hombro',
      fracture: () => {
        const S = [-0.1, 13.18, 1.28];
        const A = [-1.45, 13.52, 0.71];
        const dir = v3.norm(v3.sub(A, S));
        const C = [-0.79, 13.36, 1.01];
        const pl = plane(C, v3.add(dir, [0, 0.3, 0.15]), rough(0.025, 14, 2.4));
        return {
          bone: 'clavicle',
          point: C,
          tolerance: 0.24,
          pieces: [{ planes: [flip(pl)] }, { planes: [pl], mover: 'lat' }],
          movers: { lat: { pivot: C, t: [0.05, -0.11, 0.0], rot: [{ from: dir, to: [0, -1, 0], deg: 7 }], follow: ['scapula', 'humerus'] } },
        };
      },
    },
    views: ['ap', 'clav'],
    radiographs: ['cla3', 'cla1'],
    questions: [
      {
        id: 'segmento',
        skill: 'Anatomía',
        prompt: '¿En qué segmento de la clavícula está la fractura?',
        options: ['Tercio medial', 'Tercio medio', 'Tercio lateral', 'Articulación acromioclavicular'],
        answer: 1,
        explanation: 'El tercio medio es el sitio más frecuente (cerca del 80 % de las fracturas de clavícula). Es la zona más delgada y sin inserciones de ligamentos que la protejan.',
      },
      {
        id: 'desplazamiento',
        skill: 'Clasificación',
        prompt: '¿Qué desplazamiento es el típico?',
        options: [
          'Fragmento medial elevado y fragmento lateral descendido',
          'Ambos fragmentos descendidos por igual',
          'Fragmento lateral elevado',
          'Nunca se desplaza',
        ],
        answer: 0,
        explanation: 'El esternocleidomastoideo tracciona el fragmento medial hacia arriba y el peso del miembro superior hace descender el lateral, que además puede acabalgarse.',
      },
      {
        id: 'proyeccion',
        skill: 'Técnica',
        prompt: '¿Qué proyección complementaria ayuda a valorar el desplazamiento?',
        options: ['AP con angulación cefálica de 15–30°', 'Lateral de columna cervical', 'Axial de rodilla', 'PA de tórax en espiración'],
        answer: 0,
        explanation: 'Con la angulación cefálica la clavícula se proyecta por encima de costillas y escápula, y se ve mejor el desplazamiento vertical.',
      },
    ],
    teaching: ['La clavícula es el hueso que más se fractura en caídas sobre el hombro.'],
    pitfalls: ['Revisa también las costillas superiores y el vértice pulmonar en el mismo estudio.'],
  },
  {
    id: 'muneca-normal',
    title: 'Caso 3 · Muñeca',
    level: 'basico',
    region: 'Miembro superior',
    patient: { age: 34, sex: 'F' },
    vignette: 'Mujer de 34 años que cae sobre la mano extendida. Dolor difuso en la muñeca, sin deformidad. Moviliza los dedos con normalidad.',
    objective: 'Hacer una lectura sistemática y reconocer cuándo no hay fractura visible.',
    hint: 'Aplica el ABCS completo. Un estudio sin hallazgos también es una conclusión válida.',
    diagnosis: 'Sin fractura visible en estas proyecciones. Estructuras óseas y alineación conservadas.',
    study: { region: 'muneca' },
    views: ['pa', 'lat'],
    radiographs: ['wri1', 'wri2'],
    questions: [
      {
        id: 'conclusion',
        skill: 'Interpretación',
        prompt: '¿Cuál es tu conclusión del estudio?',
        options: [
          'Fractura del radio distal',
          'No se identifica fractura en estas proyecciones',
          'Luxación del carpo',
          'Fractura de la estiloides cubital',
        ],
        answer: 1,
        explanation: 'Las corticales son continuas, la alineación radiocarpiana se conserva y no hay escalones. Reportar "sin fractura visible" es tan importante como detectar una.',
      },
      {
        id: 'escafoides',
        skill: 'Anatomía',
        prompt: 'Si la paciente tuviera dolor en la tabaquera anatómica, ¿qué hueso sospecharías?',
        options: ['Semilunar', 'Escafoides', 'Pisiforme', 'Hueso grande'],
        answer: 1,
        explanation: 'El escafoides es el hueso del carpo que más se fractura. El dolor en la tabaquera anatómica es la pista clínica clásica.',
      },
      {
        id: 'oculta',
        skill: 'Técnica',
        prompt: 'Las fracturas de escafoides pueden no verse al inicio. ¿Qué haría el protocolo de imagen?',
        options: [
          'Nada: si la radiografía es normal, se descarta',
          'Proyecciones específicas de escafoides o estudios adicionales según el protocolo de la institución',
          'Solo ecografía de tendones',
          'Radiografía de codo',
        ],
        answer: 1,
        explanation: 'Si la sospecha clínica persiste, se usan proyecciones dedicadas, controles posteriores o estudios avanzados según el protocolo y el criterio médico.',
      },
    ],
    teaching: ['Un estudio normal también es un hallazgo: decláralo con seguridad cuando la lectura sistemática esté completa.'],
    pitfalls: ['"Satisfacción de búsqueda": el error contrario es inventar un hallazgo para no reportar un estudio normal.'],
  },
  {
    id: 'colles',
    title: 'Caso 4 · Muñeca',
    level: 'intermedio',
    region: 'Miembro superior',
    patient: { age: 68, sex: 'F' },
    vignette: 'Mujer de 68 años con osteoporosis que cae desde su propia altura sobre la mano en extensión. Deformidad de la muñeca "en dorso de tenedor".',
    objective: 'Reconocer una fractura del radio distal y valorar su angulación en la proyección lateral.',
    hint: 'Mira la metáfisis del radio distal, a unos 2–3 cm de la superficie articular. Cambia a la proyección lateral.',
    diagnosis: 'Fractura de Colles: radio distal extraarticular con angulación y desplazamiento dorsal del fragmento distal e impactación.',
    study: {
      region: 'muneca',
      fracture: ({ frame }) => {
        const F = frame('radius', 8.34, 0.25);
        const pl = plane(F.c, F.vec(0.12, 1, -0.2), rough(0.03, 14, 2.2));
        return {
          bone: 'radius',
          point: F.c,
          tolerance: 0.2,
          pieces: [{ planes: [pl] }, { planes: [flip(pl)], mover: 'd' }],
          movers: {
            d: {
              pivot: F.at(0, 0, F.r * 0.9),
              t: F.vec(0.02, 0.025, -0.035),
              rot: [{ from: F.vec(0, -1, 0), to: F.vec(0, 0, -1), deg: 24 }],
              follow: HAND,
            },
          },
        };
      },
    },
    views: ['pa', 'lat'],
    radiographs: ['col2', 'col1'],
    questions: [
      {
        id: 'eponimo',
        skill: 'Clasificación',
        prompt: '¿Qué epónimo corresponde a esta fractura?',
        options: ['Fractura de Smith', 'Fractura de Colles', 'Fractura de Barton', 'Fractura de Chauffeur'],
        answer: 1,
        explanation: 'Colles: radio distal extraarticular con desplazamiento dorsal. Smith es lo contrario (desplazamiento volar), Barton compromete el borde articular y Chauffeur la estiloides radial.',
      },
      {
        id: 'angulacion',
        skill: 'Interpretación',
        prompt: 'En la proyección lateral, ¿hacia dónde se angula el fragmento distal?',
        options: ['Hacia volar (palmar)', 'Hacia dorsal', 'No hay angulación', 'Hacia cubital'],
        answer: 1,
        explanation: 'La superficie articular del radio queda mirando hacia dorsal, lo que produce la deformidad "en dorso de tenedor". Solo la lateral permite valorarlo bien.',
      },
      {
        id: 'normal',
        skill: 'Anatomía',
        prompt: '¿Cuál es la inclinación normal de la superficie articular del radio en la lateral?',
        options: ['Volar de unos 11°', 'Dorsal de unos 20°', '0° (perpendicular)', 'Volar de unos 45°'],
        answer: 0,
        explanation: 'Lo normal es una inclinación volar de unos 10–12°. En la fractura de Colles se pierde o se invierte (se vuelve dorsal).',
      },
    ],
    teaching: ['Con un solo plano no basta: la angulación dorsal casi no se ve en la AP.', 'Es la fractura típica de la mujer posmenopáusica con osteoporosis.'],
    pitfalls: ['Busca una fractura asociada de la estiloides cubital.'],
  },
  {
    id: 'tallo-verde',
    title: 'Caso 5 · Antebrazo pediátrico',
    level: 'intermedio',
    region: 'Miembro superior · Pediatría',
    patient: { age: 7, sex: 'M' },
    vignette: 'Niño de 7 años que cae en el parque sobre el antebrazo derecho. Dolor y leve deformidad en arco del antebrazo.',
    objective: 'Reconocer una fractura incompleta del hueso inmaduro y no confundir las fisis con fracturas.',
    hint: 'Busca una cortical rota de un solo lado del radio, en la mitad de la diáfisis, con el hueso curvado.',
    diagnosis: 'Fractura en tallo verde de la diáfisis radial, con angulación. Fisis abiertas normales.',
    study: {
      region: 'antebrazo',
      scale: 0.64,
      hide: ['hand_03'],
      fracture: ({ frame }) => {
        const F = frame('radius', 8.85);
        const G = plane(F.c, F.u, rough(0.012, 18, 3.3));
        const pd = physisCut(frame('radius', 8.25, 0.25));
        const pp = physisCut(frame('radius', 10.2, 0.25));
        return {
          bone: 'radius',
          point: F.c,
          tolerance: 0.2,
          pieces: [
            { planes: [pd.below], mover: 'd' },
            { planes: [pd.above, flip(G)], mover: 'd' },
            { planes: [G, pp.below] },
            { planes: [pp.above] },
          ],
          movers: { d: { pivot: F.at(0, 0, -F.r * 1.05), rot: [{ from: F.vec(0, -1, 0), to: F.vec(0, 0, -1), deg: 12 }], follow: HAND } },
        };
      },
      physes: ({ frame }) => {
        const u = physisCut(frame('ulna', 8.3, 0.25));
        const h = physisCut(frame('humerus', 10.47, 0.3));
        return { ulna: [[u.below], [u.above]], humerus: [[h.below], [h.above]] };
      },
    },
    views: ['ap', 'lat'],
    radiographs: ['gre1', 'gre2'],
    questions: [
      {
        id: 'tipo',
        skill: 'Clasificación',
        prompt: '¿Qué tipo de fractura es?',
        options: ['En tallo verde', 'En rodete (torus)', 'Completa transversa', 'Conminuta'],
        answer: 0,
        explanation: 'En tallo verde se rompe la cortical del lado convexo (tensión) y la del lado cóncavo queda íntegra pero doblada, como una rama verde.',
      },
      {
        id: 'fisis',
        skill: 'Anatomía',
        prompt: '¿Qué son las bandas radiolúcidas transversales cerca de los extremos del radio y el cúbito?',
        options: ['Fracturas múltiples', 'Fisis (placas de crecimiento) abiertas, normales', 'Artefactos del equipo', 'Lesiones tumorales'],
        answer: 1,
        explanation: 'Las fisis son cartílago de crecimiento y se ven radiolúcidas. Son normales en niños. Confundirlas con fracturas es un error frecuente.',
      },
      {
        id: 'porque',
        skill: 'Fisiopatología',
        prompt: '¿Por qué este patrón es típico de los niños?',
        options: ['Por el hueso más elástico y el periostio grueso', 'Por la osteoporosis', 'Porque el hueso infantil es más frágil', 'Por el cartílago articular grueso'],
        answer: 0,
        explanation: 'El hueso inmaduro es más flexible y tiene un periostio grueso: se dobla antes de romperse por completo.',
      },
    ],
    teaching: ['Compara siempre con lo que es normal para la edad. Si dudas, el protocolo puede incluir una proyección comparativa.'],
    pitfalls: ['No confundas las fisis con trazos de fractura.'],
  },
  {
    id: 'tibia-espiroidea',
    title: 'Caso 6 · Pierna',
    level: 'intermedio',
    region: 'Miembro inferior',
    patient: { age: 30, sex: 'F' },
    vignette: 'Esquiadora de 30 años que sufre una torsión con el pie fijo en la bota. Dolor en el tercio distal de la pierna e impotencia funcional.',
    objective: 'Relacionar el patrón del trazo con el mecanismo de lesión.',
    hint: 'El trazo es largo y rodea el hueso. Rota entre AP y lateral para seguirlo en el tercio distal.',
    diagnosis: 'Fractura espiroidea del tercio distal de la tibia, con componente rotacional.',
    study: {
      region: 'pierna',
      fracture: ({ frame }) => {
        const F = frame('tibia', 1.0);
        const pl = plane(F.c, F.vec(0.85, 0.42, 0.33), rough(0.03, 8, 4.4));
        return {
          bone: 'tibia',
          point: F.c,
          tolerance: 0.36,
          pieces: [{ planes: [pl] }, { planes: [flip(pl)], mover: 'd' }],
          movers: { d: { pivot: F.c, t: F.vec(0.02, -0.03, 0), rot: [{ from: F.a, to: F.l, deg: 12 }] } },
        };
      },
    },
    views: ['ap', 'lat'],
    radiographs: ['spi1', 'tib1'],
    questions: [
      {
        id: 'trazo',
        skill: 'Clasificación',
        prompt: '¿Cómo describes el trazo?',
        options: ['Transverso', 'Espiroideo', 'En tallo verde', 'Avulsión'],
        answer: 1,
        explanation: 'El trazo rodea la diáfisis como una hélice. En una proyección puede parecer oblicuo; por eso se necesitan dos proyecciones.',
      },
      {
        id: 'mecanismo',
        skill: 'Fisiopatología',
        prompt: '¿Qué mecanismo produce este patrón?',
        options: ['Golpe directo perpendicular', 'Torsión (fuerza rotacional)', 'Compresión axial pura', 'Tracción de un tendón'],
        answer: 1,
        explanation: 'La rotación con el pie fijo genera fuerzas de torsión que se reparten en espiral a lo largo del hueso.',
      },
      {
        id: 'asociadas',
        skill: 'Técnica',
        prompt: '¿Qué conviene revisar además en este tipo de lesión?',
        options: ['El peroné completo, incluido el proximal, y el tobillo', 'Solo el pie', 'La columna lumbar', 'No hace falta revisar nada más'],
        answer: 0,
        explanation: 'Los mecanismos rotacionales pueden lesionar el peroné lejos del foco principal y comprometer el tobillo.',
      },
    ],
    teaching: ['Patrón del trazo → mecanismo: transverso (directo o flexión), oblicuo (flexión con compresión), espiroideo (torsión).'],
    pitfalls: ['En lactantes que aún no caminan, una fractura espiroidea debe alertar sobre posible maltrato.'],
  },
  {
    id: 'cuello-femoral',
    title: 'Caso 7 · Cadera',
    level: 'avanzado',
    region: 'Miembro inferior',
    patient: { age: 82, sex: 'F' },
    vignette: 'Mujer de 82 años que cae en casa. No puede levantarse. El miembro inferior derecho está acortado y en rotación externa.',
    objective: 'Localizar una fractura de cadera intracapsular y reconocer su importancia pronóstica.',
    hint: 'Sigue la línea de Shenton y el contorno del cuello femoral entre la cabeza y los trocánteres.',
    diagnosis: 'Fractura subcapital del cuello femoral derecho (intracapsular), desplazada.',
    study: {
      region: 'cadera',
      fracture: () => {
        const H = [-0.8, 8.13, 0.77];
        const nd = v3.norm([0.4, 0.28, 0.09]);
        const P = v3.sub(H, v3.mul(nd, 0.17));
        const pl = plane(P, nd, rough(0.022, 12, 4.0));
        return {
          bone: 'femur',
          point: P,
          tolerance: 0.2,
          pieces: [{ planes: [pl] }, { planes: [flip(pl)], mover: 's' }],
          movers: { s: { pivot: [-1.05, 7.9, 0.72], t: [-0.015, 0.07, 0], rot: [{ from: [0, 0, 1], to: [-1, 0, 0], deg: 20 }], follow: ['tibia', 'fibula', 'patella'] } },
        };
      },
    },
    views: ['ap', 'judi'],
    radiographs: ['hip1', 'hip2'],
    questions: [
      {
        id: 'localizacion',
        skill: 'Anatomía',
        prompt: '¿Dónde está la fractura?',
        options: ['Cuello femoral (intracapsular)', 'Región intertrocantérica', 'Subtrocantérica', 'Diáfisis femoral'],
        answer: 0,
        explanation: 'El trazo está entre la cabeza y la base del cuello, dentro de la cápsula articular.',
      },
      {
        id: 'riesgo',
        skill: 'Fisiopatología',
        prompt: '¿Qué complicación preocupa más en las fracturas intracapsulares desplazadas?',
        options: ['Necrosis avascular de la cabeza femoral', 'Síndrome compartimental del pie', 'Lesión del nervio radial', 'Fisis cerrada prematuramente'],
        answer: 0,
        explanation: 'La irrigación de la cabeza femoral depende de vasos que recorren el cuello. El desplazamiento puede interrumpirlos.',
      },
      {
        id: 'clasificacion',
        skill: 'Clasificación',
        prompt: '¿Qué clasificación se usa con frecuencia para estas fracturas?',
        options: ['Garden', 'Salter-Harris', 'Weber', 'Neer'],
        answer: 0,
        explanation: 'Garden (I a IV) gradúa las fracturas del cuello femoral según su desplazamiento. Salter-Harris es para fisis, Weber para tobillo y Neer para húmero proximal.',
      },
    ],
    teaching: ['El acortamiento y la rotación externa del miembro son la pista clínica clásica.'],
    pitfalls: ['Las fracturas no desplazadas pueden ser muy sutiles: busca la interrupción de las trabéculas y compara con el lado contralateral.'],
  },
  {
    id: 'boxeador',
    title: 'Caso 8 · Mano',
    level: 'avanzado',
    region: 'Miembro superior',
    patient: { age: 22, sex: 'M' },
    vignette: 'Hombre de 22 años que golpea una pared con el puño cerrado. Dolor y edema en el borde cubital del dorso de la mano. El nudillo del meñique está "hundido".',
    objective: 'Localizar una fractura pequeña en la mano y entender por qué la angulación se subestima en la PA.',
    hint: 'Revisa los metacarpianos uno por uno, del 1.º al 5.º. Fíjate en el cuello, justo antes de la cabeza.',
    diagnosis: 'Fractura del cuello del 5.º metacarpiano ("del boxeador") con angulación volar de la cabeza.',
    study: {
      region: 'mano',
      fracture: () => {
        const base = [-2.344, 7.797, 1.25];
        const head = [-2.314, 7.359, 1.39];
        const u = v3.norm(v3.sub(base, head));
        const N = v3.lerp(head, base, 0.21);
        const neck = plane(N, u, rough(0.01, 30, 5.1));
        const sep = plane([-2.4, 0, 0], [1, 0, 0], { clip: true });
        return {
          bone: 'hand_07',
          point: N,
          tolerance: 0.13,
          pieces: [{ planes: [flip(sep)] }, { planes: [sep, neck] }, { planes: [sep, flip(neck)], mover: 'h' }],
          movers: { h: { pivot: v3.add(N, [0, 0, -0.045]), rot: [{ from: v3.mul(u, -1), to: [0, 0, 1], deg: 38 }], follow: FINGER5 } },
        };
      },
    },
    views: ['pa', 'obl', 'lat'],
    radiographs: ['box1', 'box2'],
    questions: [
      {
        id: 'hueso',
        skill: 'Anatomía',
        prompt: '¿Qué hueso está fracturado?',
        options: ['2.º metacarpiano', '5.º metacarpiano', 'Falange proximal del 5.º dedo', 'Ganchoso'],
        answer: 1,
        explanation: 'Es el cuello del 5.º metacarpiano, el más expuesto al golpear con el puño cerrado.',
      },
      {
        id: 'angulacion',
        skill: 'Interpretación',
        prompt: '¿Hacia dónde se angula la cabeza del metacarpiano?',
        options: ['Hacia volar (palmar)', 'Hacia dorsal', 'Hacia radial', 'No se angula'],
        answer: 0,
        explanation: 'La cabeza se desplaza hacia la palma por la tracción de los músculos intrínsecos, y el nudillo se ve "hundido".',
      },
      {
        id: 'proyeccion',
        skill: 'Técnica',
        prompt: '¿Qué proyección ayuda a medir mejor esa angulación?',
        options: ['Lateral u oblicua de mano', 'Solo la PA', 'Proyección de Waters', 'Axial de calcáneo'],
        answer: 0,
        explanation: 'En la PA la angulación volar casi no se ve. La lateral o la oblicua muestran el ángulo real.',
      },
    ],
    teaching: ['En la mano, revisa hueso por hueso. Las fracturas pequeñas se pierden si se mira "en general".'],
    pitfalls: ['Si solo miras la PA, subestimas la angulación.'],
  },
  {
    id: 'femur-conminuta',
    title: 'Caso 9 · Muslo',
    level: 'avanzado',
    region: 'Miembro inferior',
    patient: { age: 35, sex: 'M' },
    vignette: 'Motociclista de 35 años con un accidente de tránsito de alta energía. Deformidad evidente del muslo derecho y dolor intenso.',
    objective: 'Reconocer una fractura conminuta y describir sus fragmentos.',
    hint: 'Cuenta los fragmentos en la mitad de la diáfisis femoral. ¿Ves un fragmento triangular suelto?',
    diagnosis: 'Fractura conminuta de la diáfisis femoral, tercio medio, con fragmento en ala de mariposa y desplazamiento.',
    study: {
      region: 'muslo',
      fracture: ({ frame }) => {
        const F = frame('femur', 6.0);
        const f1 = plane(F.at(0, 0.2, 0), F.vec(0.55, 1, 0), rough(0.028, 10, 6.1));
        const f2 = plane(F.at(0, -0.2, 0), F.vec(-0.55, 1, 0), rough(0.028, 10, 7.2));
        const xs = plane(F.c, F.vec(1, 0, 0.25), rough(0.018, 12, 8.3));
        return {
          bone: 'femur',
          point: F.c,
          tolerance: 0.42,
          pieces: [
            { planes: [f1] },
            { planes: [flip(f2)], mover: 'd' },
            { planes: [flip(f1), f2, xs], mover: 'b' },
            { planes: [flip(f1), f2, flip(xs)], mover: 'm' },
          ],
          movers: {
            d: { pivot: F.c, t: F.vec(0.12, -0.09, 0.05), rot: [{ from: F.vec(0, -1, 0), to: F.l, deg: 7 }], follow: ['tibia', 'fibula', 'patella'] },
            b: { pivot: F.c, t: F.vec(0.11, -0.02, 0.04), rot: [{ from: F.u, to: F.l, deg: 14 }] },
            m: { pivot: F.c, t: F.vec(0.03, -0.05, 0), rot: [{ from: F.u, to: F.a, deg: 4 }] },
          },
        };
      },
    },
    views: ['ap', 'lat'],
    radiographs: [],
    questions: [
      {
        id: 'tipo',
        skill: 'Clasificación',
        prompt: '¿Cómo clasificas el trazo?',
        options: ['Transverso simple', 'Conminuta con fragmento en ala de mariposa', 'En tallo verde', 'Avulsión'],
        answer: 1,
        explanation: 'Hay más de dos fragmentos, incluido uno triangular intermedio ("ala de mariposa"), típico de flexión con alta energía.',
      },
      {
        id: 'fragmentos',
        skill: 'Clasificación',
        prompt: '¿Desde cuántos fragmentos se considera conminuta una fractura?',
        options: ['2', '3 o más', '5 o más', 'Depende del hueso'],
        answer: 1,
        explanation: 'Conminuta significa tres o más fragmentos.',
      },
      {
        id: 'contexto',
        skill: 'Interpretación',
        prompt: '¿Qué implica el mecanismo de alta energía para la lectura del estudio?',
        options: [
          'Buscar lesiones asociadas: cadera, rodilla y otros segmentos',
          'Basta con describir el foco principal',
          'Indica hueso osteoporótico',
          'Descarta lesiones de partes blandas',
        ],
        answer: 0,
        explanation: 'En alta energía son frecuentes las lesiones asociadas, como fracturas de cadera o lesiones de rodilla. Incluye siempre las articulaciones vecinas.',
      },
    ],
    teaching: ['Cuantos más fragmentos, mayor energía del trauma y mayor compromiso de partes blandas.'],
    pitfalls: ['No te quedes solo con la diáfisis: revisa cuello femoral y rodilla.'],
  },
];

export const getCase = (id) => CASES.find((c) => c.id === id);

// Regiones de anatomía normal para el laboratorio y el banco
export const ATLAS = [
  { id: 'atlas-pierna', title: 'Pierna normal', region: 'pierna', views: ['ap', 'lat'] },
  { id: 'atlas-muslo', title: 'Fémur normal', region: 'muslo', views: ['ap', 'lat'] },
  { id: 'atlas-cadera', title: 'Pelvis y cadera', region: 'cadera', views: ['ap', 'inlet'] },
  { id: 'atlas-brazo', title: 'Húmero normal', region: 'brazo', views: ['ap', 'lat'] },
  { id: 'atlas-antebrazo', title: 'Antebrazo', region: 'antebrazo', views: ['ap', 'lat'] },
  { id: 'atlas-muneca', title: 'Muñeca', region: 'muneca', views: ['pa', 'lat'] },
  { id: 'atlas-mano', title: 'Mano', region: 'mano', views: ['pa', 'obl'], radiographs: ['hand1'] },
  { id: 'atlas-hombro', title: 'Hombro', region: 'hombro', views: ['ap', 'grashey'] },
];
export const getAtlas = (id) => ATLAS.find((a) => a.id === id);
