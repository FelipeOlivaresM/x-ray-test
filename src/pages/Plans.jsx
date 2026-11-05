import Icon from '../components/Icon.jsx';

const PLANS = [
  {
    name: 'Gratis',
    price: 'Gratis',
    who: 'Para conocer la plataforma',
    items: ['Casos de nivel básico', 'Laboratorio 3D con anatomía normal', 'Repaso con tarjetas (limitado)'],
  },
  {
    name: 'Estudiante',
    price: 'Tarifa estudiantil',
    who: 'Suscripción mensual o anual',
    items: ['Todos los casos y niveles', 'Panel de seguimiento completo', 'Paquetes temáticos (fracturas, tórax…)', 'Contenido en varios idiomas'],
    featured: true,
  },
  {
    name: 'Institucional',
    price: 'Licencia por grupo',
    who: 'Universidades y docentes',
    items: ['Grupos y cursos por docente', 'Reportes de desempeño del grupo', 'Casos propios del programa', 'Soporte y capacitación'],
  },
];

export default function Plans() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Planes institucionales</span>
          <h1>Planes</h1>
          <p className="muted">Modelo escalonado de la propuesta. Los precios definitivos se fijarán después de calcular costos y validar el mercado.</p>
        </div>
      </div>
      <div className="plans">
        {PLANS.map((p) => (
          <div key={p.name} className={`card plan ${p.featured ? 'plan--featured' : ''}`}>
            {p.featured && <span className="pill plan-badge">Recomendado</span>}
            <h3>{p.name}</h3>
            <div className="price">{p.price}</div>
            <p className="small muted">{p.who}</p>
            <ul>
              {p.items.map((i) => (
                <li key={i}>
                  <Icon name="check" size={15} /> {i}
                </li>
              ))}
            </ul>
            <button className={`btn ${p.featured ? 'btn--primary' : 'btn--ghost'}`} disabled>
              Disponible próximamente
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Misión</h3>
          <p className="small">
            Facilitar el aprendizaje de la Radiología e Imágenes Diagnósticas con una plataforma digital accesible: imágenes educativas, casos clínicos simulados y retroalimentación oportuna, en un entorno de práctica seguro y responsable.
          </p>
          <h3>Visión 2030</h3>
          <p className="small">
            Ser una plataforma educativa reconocida en Colombia por apoyar la formación de estudiantes y docentes de Radiología e Imágenes Diagnósticas.
          </p>
        </div>
        <div className="card">
          <h3>Alcance y uso responsable</h3>
          <ul className="small">
            <li>Plataforma exclusivamente educativa y de simulación. No atiende pacientes ni emite informes clínicos.</li>
            <li>Las radiografías simuladas se reconstruyen sobre modelos óseos públicos. Las radiografías reales provienen de bancos con licencia abierta y se citan con autor y licencia (ver <a href="#/creditos">créditos</a>).</li>
            <li>El contenido debe ser revisado por profesionales del área antes del lanzamiento.</li>
            <li>Toda imagen real que se incorpore deberá tener autorización y uso legítimo.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
