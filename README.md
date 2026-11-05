# RadioSim · x-ray-feature

Prototipo de **RadioSim**, plataforma educativa para estudiantes de Radiología e Imágenes Diagnósticas. Se practica la lectura de radiografías y el reconocimiento de fracturas con casos clínicos simulados y modelos 3D.

> Herramienta educativa de simulación. No sustituye la supervisión docente ni la valoración de un profesional de la salud. Las radiografías simuladas se reconstruyen sobre modelos óseos públicos; las radiografías reales provienen de bancos con licencia abierta.

## Módulos (sección 6 del documento del proyecto)

| Servicio | Dónde está |
|---|---|
| Banco educativo de imágenes | `#/banco` → Galería de estudios |
| Casos clínicos simulados | `#/casos` y `#/caso/:id` |
| Reconocimiento de estructuras y fracturas | Flujo del caso + `#/lab` (modo reto) |
| Retroalimentación inmediata | Después de cada respuesta |
| Rutas de aprendizaje por niveles | Básico → Intermedio → Avanzado |
| Panel de seguimiento | `#/progreso` |
| Planes institucionales | `#/planes` |

## Metodologías de aprendizaje

- **Aprendizaje basado en casos**: cada ejercicio parte de una historia clínica.
- **Lectura sistemática ABCS** (Alineación, Hueso, Cartílago, partes blandas o *Soft tissue*): se completa antes de marcar la fractura.
- **Predice y confirma**: primero se marca en 2D (las proyecciones de cada caso) y después se confirma en 3D, con reducción interactiva de la fractura.
- **Seguridad de la respuesta**: el estudiante dice qué tan seguro está, y el panel compara esa seguridad con sus aciertos.
- **Repetición espaciada (Leitner)**: tarjetas de anatomía radiológica.
- **Andamiaje**: las pistas restan puntos y la dificultad es progresiva.

## Cómo funciona el 3D

- **Huesos reales**: mallas de BodyParts3D (DBCLS) y un radio y cúbito escaneados de donante, convertidas y reparadas con `tools/build_models.py` y `tools/remesh.mjs` (quedan en `public/models/`).
- **Radiografía reconstruida (DRR)**: `src/lib/shaders.js` acumula el espesor que atraviesa cada rayo en cortical, medular y partes blandas, y luego aplica la curva de exposición, nitidez, ruido, efecto talón y ventana/nivel.
- **Arco en C**: `src/lib/carm.js`. Rotación (AP 0°, PA 180°, derecha/izquierda) y angulación cefálica/caudal, distancia fuente-detector de 100 cm. Cada región tiene sus proyecciones estándar (`src/data/anatomy.js`).
- **Fracturas**: cada fragmento es el hueso completo recortado por planos con superficie irregular, más un desplazamiento que se puede reducir en vivo (`src/data/cases.js`, `src/lib/study.js`).
- **Laboratorio** (`#/lab`): vista 3D con haz y detector, radiografía simulada o real, controles del arco, mapa rotación × angulación y esquema del equipo.

## Licencias del contenido

- Modelos óseos: BodyParts3D, © DBCLS, CC BY-SA 2.1 JP. Radio y cúbito: Eric Bauer y laboratorio de anatomía de Elon University, CC BY 4.0.
- Radiografías reales: Wikimedia Commons (CC0, dominio público, CC BY, CC BY-SA). Autor y licencia de cada imagen en `src/data/radiographs.js` y en la página `#/creditos`.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` compila y publica en cada push a `main`.
Hay que activarlo una sola vez: en GitHub, **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Las rutas usan `#/` y la base es relativa (`base: './'`), así que no hace falta configurar nada más.

## Pendientes sugeridos

- Revisión del contenido por profesionales del área.
- Más casos y regiones (columna, tobillo, pie).
- Cuentas de usuario y panel docente (requiere backend).
- Contenido en inglés (ventaja de varios idiomas del Lean Canvas).
