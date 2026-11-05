import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { loadManifest } from '../lib/assets.js';
import { RADIOGRAPH_LIST, radiographUrl } from '../data/radiographs.js';

function useSources() {
  const [src, setSrc] = useState([]);
  useEffect(() => {
    loadManifest()
      .then((m) => setSrc(Object.entries(m.sources || {}).map(([id, v]) => ({ id, ...v }))))
      .catch(() => setSrc([]));
  }, []);
  return src;
}

export default function Credits() {
  const sources = useSources();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Transparencia</span>
          <h1>Créditos y licencias</h1>
          <p className="muted">
            RadioSim solo usa material que permite reutilización con fines educativos. Los modelos se adaptaron (reparación de malla, simplificación y
            alineación); las radiografías se redujeron de tamaño. Ninguna adaptación implica respaldo de los autores.
          </p>
        </div>
      </div>

      <h2 className="section-title">
        <Icon name="bone" size={20} /> Modelos óseos 3D
      </h2>
      <p className="small muted">
        Esqueleto de BodyParts3D (Database Center for Life Science, Japón) y radio y cúbito escaneados de un donante anatómico (Elon University). Archivos
        obtenidos de Wikimedia Commons.
      </p>
      <div className="card table-wrap">
        <table className="credits-table">
          <thead>
            <tr>
              <th scope="col">Archivo</th>
              <th scope="col">Autor</th>
              <th scope="col">Licencia</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((m) => (
              <tr key={m.id}>
                <td>
                  <a href={m.source} target="_blank" rel="noreferrer">
                    {m.title.replace(/^File:/, '')}
                  </a>
                </td>
                <td>{m.artist.replace(/\[\d+\]\.?$/, '')}</td>
                <td>
                  <a href={m.licenseUrl} target="_blank" rel="noreferrer">
                    {m.license.replace(/ jp$/, ' JP')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">
        <Icon name="image" size={20} /> Radiografías reales
      </h2>
      <div className="card table-wrap">
        <table className="credits-table">
          <thead>
            <tr>
              <th scope="col">Imagen</th>
              <th scope="col">Título</th>
              <th scope="col">Autor</th>
              <th scope="col">Licencia</th>
              <th scope="col">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {RADIOGRAPH_LIST.map((r) => (
              <tr key={r.id}>
                <td>
                  <img src={radiographUrl(r.id)} alt="" loading="lazy" />
                </td>
                <td>{r.title}</td>
                <td>{r.author}</td>
                <td>
                  {r.licenseUrl ? (
                    <a href={r.licenseUrl} target="_blank" rel="noreferrer">
                      {r.license}
                    </a>
                  ) : (
                    r.license
                  )}
                </td>
                <td>
                  <a href={r.source} target="_blank" rel="noreferrer" aria-label={`Fuente de ${r.title}`}>
                    <Icon name="external" size={15} /> Commons
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">
        <Icon name="layers" size={20} /> Software
      </h2>
      <p className="small muted">React (MIT), three.js (MIT), Vite (MIT). Tipografías Orbitron, Exo 2 y Share Tech Mono (SIL Open Font License).</p>
    </div>
  );
}
