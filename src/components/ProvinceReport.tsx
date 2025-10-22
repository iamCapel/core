import React from 'react';

interface ProvinceReportProps {
  provincia: string;
  onClose: () => void;
}

interface Intervencion {
  region: string;
  provincia: string;
  distrito: string;
  localidad: string;
  tipoIntervencion: string;
  datos: Record<string, string>;
  timestamp: string;
  usuario: string;
}

const ProvinceReport: React.FC<ProvinceReportProps> = ({ provincia, onClose }) => {
  const [intervenciones, setIntervenciones] = React.useState<Intervencion[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Cargar intervenciones de la provincia seleccionada
    const datosGuardados = localStorage.getItem('intervenciones_mopc');
    if (datosGuardados) {
      try {
        const todasIntervenciones = JSON.parse(datosGuardados);
        const intervencionesProvincia = todasIntervenciones.filter(
          (inter: Intervencion) => inter.provincia === provincia
        );
        setIntervenciones(intervencionesProvincia);
      } catch (error) {
        console.error('Error al cargar intervenciones:', error);
      }
    }
    setLoading(false);
  }, [provincia]);

  // Calcular estadísticas por tipo de intervención
  const estadisticasPorTipo = React.useMemo(() => {
    const stats: Record<string, number> = {};
    intervenciones.forEach(inter => {
      stats[inter.tipoIntervencion] = (stats[inter.tipoIntervencion] || 0) + 1;
    });
    return stats;
  }, [intervenciones]);

  // Calcular totales por campo de datos
  const totalesPorCampo = React.useMemo(() => {
    const totales: Record<string, number> = {};
    intervenciones.forEach(inter => {
      Object.entries(inter.datos).forEach(([campo, valor]) => {
        if (valor && !isNaN(Number(valor))) {
          totales[campo] = (totales[campo] || 0) + Number(valor);
        }
      });
    });
    return totales;
  }, [intervenciones]);

  const formatearCampo = (campo: string): string => {
    return campo.replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUnidad = (campo: string): string => {
    const unidades: Record<string, string> = {
      'longitud_intervencion': 'ml',
      'limpieza_superficie': 'm²',
      'perfilado_superficie': 'm²',
      'compactado_superficie': 'm²',
      'conformacion_cunetas': 'ml',
      'extraccion_bote_material': 'm³',
      'escarificacion_superficies': 'm²',
      'suministro_colocacion_material': 'm³',
      'compactado_material': 'm³',
      'perfilado_taludes': 'ml',
      'terminacion_superficies': 'm²',
      'distancia_acarreo': 'kms'
    };
    return unidades[campo] || '';
  };

  if (loading) {
    return (
      <div className="province-report-overlay">
        <div className="province-report-modal">
          <div className="loading">Cargando datos de {provincia}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="province-report-overlay">
      <div className="province-report-modal">
        <div className="report-header">
          <h2>📊 Informe de {provincia}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="report-content">
          {intervenciones.length === 0 ? (
            <div className="no-data">
              <p>📋 No hay intervenciones registradas para {provincia}</p>
            </div>
          ) : (
            <>
              {/* Resumen General */}
              <div className="report-summary">
                <h3>Resumen General</h3>
                <div className="summary-stats">
                  <div className="stat-card">
                    <span className="stat-number">{intervenciones.length}</span>
                    <span className="stat-label">Total Intervenciones</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">{Object.keys(estadisticasPorTipo).length}</span>
                    <span className="stat-label">Tipos de Intervención</span>
                  </div>
                </div>
              </div>

              {/* Intervenciones por Tipo */}
              <div className="report-section">
                <h3>Intervenciones por Tipo</h3>
                <div className="intervention-types">
                  {Object.entries(estadisticasPorTipo).map(([tipo, cantidad]) => (
                    <div key={tipo} className="type-item">
                      <span className="type-name">{tipo}</span>
                      <span className="type-count">{cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales por Campo */}
              <div className="report-section">
                <h3>Totales Acumulados</h3>
                <div className="totals-grid">
                  {Object.entries(totalesPorCampo)
                    .filter(([_, valor]) => valor > 0)
                    .map(([campo, total]) => (
                    <div key={campo} className="total-item">
                      <span className="total-label">{formatearCampo(campo)}</span>
                      <span className="total-value">
                        {total.toLocaleString()} {getUnidad(campo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de Intervenciones */}
              <div className="report-section">
                <h3>Detalle de Intervenciones</h3>
                <div className="interventions-list">
                  {intervenciones.slice(0, 5).map((inter, index) => (
                    <div key={index} className="intervention-item">
                      <div className="intervention-header">
                        <strong>{inter.tipoIntervencion}</strong>
                        <span className="intervention-date">
                          {new Date(inter.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="intervention-details">
                        <span>📍 {inter.localidad}, {inter.distrito}</span>
                        <span>👤 {inter.usuario}</span>
                      </div>
                    </div>
                  ))}
                  {intervenciones.length > 5 && (
                    <div className="more-interventions">
                      +{intervenciones.length - 5} intervenciones más
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvinceReport;