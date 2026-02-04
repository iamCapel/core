import React, { useEffect, useState, useRef } from 'react';
import { reportStorage, ReportData } from '../services/reportStorage';
import { Wrapper } from '@googlemaps/react-wrapper';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMapsConfig';
import './ReportDetailView.css';

interface ReportDetailViewProps {
  numeroReporte: string;
  onBack: () => void;
}

const ReportDetailView: React.FC<ReportDetailViewProps> = ({ numeroReporte, onBack }) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const routeMapRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    // Cargar el reporte desde reportStorage
    const loadedReport = reportStorage.getReportByNumber(numeroReporte);
    if (loadedReport) {
      setReport(loadedReport);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [numeroReporte]);

  useEffect(() => {
    if (report && window.google && routeMapRef.current && streetViewRef.current) {
      initializeRouteMap();
      initializeStreetView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  const initializeRouteMap = () => {
    if (!report?.gpsData || !routeMapRef.current) return;

    const puntoInicial = report.gpsData.punto_inicial;
    const puntoAlcanzado = report.gpsData.punto_alcanzado;

    if (!puntoInicial || !puntoAlcanzado) return;

    // Crear mapa centrado entre los dos puntos
    const centerLat = (puntoInicial.lat + puntoAlcanzado.lat) / 2;
    const centerLng = (puntoInicial.lon + puntoAlcanzado.lon) / 2;

    const map = new google.maps.Map(routeMapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 14,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    });

    mapRef.current = map;

    // Marcador punto inicial (verde)
    new google.maps.Marker({
      position: { lat: puntoInicial.lat, lng: puntoInicial.lon },
      map: map,
      title: 'Punto Inicial',
      label: {
        text: 'A',
        color: 'white',
        fontWeight: 'bold'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 10
      }
    });

    // Marcador punto alcanzado (rojo)
    new google.maps.Marker({
      position: { lat: puntoAlcanzado.lat, lng: puntoAlcanzado.lon },
      map: map,
      title: 'Punto Alcanzado',
      label: {
        text: 'B',
        color: 'white',
        fontWeight: 'bold'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#e74c3c',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 10
      }
    });

    // Dibujar línea entre los puntos
    const routePath = new google.maps.Polyline({
      path: [
        { lat: puntoInicial.lat, lng: puntoInicial.lon },
        { lat: puntoAlcanzado.lat, lng: puntoAlcanzado.lon }
      ],
      geodesic: true,
      strokeColor: '#3498db',
      strokeOpacity: 1.0,
      strokeWeight: 4
    });

    routePath.setMap(map);

    // Calcular distancia
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(puntoInicial.lat, puntoInicial.lon),
      new google.maps.LatLng(puntoAlcanzado.lat, puntoAlcanzado.lon)
    );

    // Agregar InfoWindow con distancia
    const infoWindow = new google.maps.InfoWindow({
      content: `<div style="padding: 10px; font-family: Arial;">
        <strong>Distancia:</strong> ${(distance / 1000).toFixed(2)} km<br>
        <strong>Punto A:</strong> ${puntoInicial.lat.toFixed(6)}, ${puntoInicial.lon.toFixed(6)}<br>
        <strong>Punto B:</strong> ${puntoAlcanzado.lat.toFixed(6)}, ${puntoAlcanzado.lon.toFixed(6)}
      </div>`,
      position: { lat: centerLat, lng: centerLng }
    });

    infoWindow.open(map);
  };

  const initializeStreetView = () => {
    if (!report?.gpsData || !streetViewRef.current) return;

    const puntoInicial = report.gpsData.punto_inicial;
    if (!puntoInicial) return;

    // Crear Street View
    panoramaRef.current = new google.maps.StreetViewPanorama(streetViewRef.current, {
      position: { lat: puntoInicial.lat, lng: puntoInicial.lon },
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
      fullscreenControl: true
    });
  };

  if (loading) {
    return (
      <div className="report-detail-loading">
        <div className="spinner"></div>
        <p>Cargando reporte...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-detail-error">
        <h2>❌ Reporte no encontrado</h2>
        <button onClick={onBack} className="back-button">Volver al Mapa</button>
      </div>
    );
  }

  return (
    <div className="report-detail-view">
      {/* Topbar */}
      <div className="report-detail-topbar">
        <button onClick={onBack} className="topbar-back-btn">
          <span>←</span> Volver al Mapa
        </button>
        <h1 className="topbar-title">📋 Vista Detallada del Reporte</h1>
      </div>

      {/* Sección 1: Plantilla del Reporte */}
      <div className="report-template-section">
        <div className="section-header">
          <h2>📄 Información del Reporte</h2>
          <span className="report-badge">{report.numeroReporte}</span>
        </div>
        
        <div className="report-template-content">
          {/* Encabezado del reporte */}
          <div className="template-header">
            <div className="header-logo">
              <div className="mopc-logo">MOPC</div>
            </div>
            <div className="header-info">
              <h1>MINISTERIO DE OBRAS PÚBLICAS Y COMUNICACIONES</h1>
              <h2>FORMULARIO DE INTERVENCIÓN VIAL</h2>
              <p className="report-number">{report.numeroReporte}</p>
              <p className="report-date">Fecha: {new Date(report.fechaCreacion).toLocaleDateString('es-DO')}</p>
            </div>
          </div>

          {/* Información geográfica */}
          <div className="template-section">
            <h3 className="section-title">📍 UBICACIÓN GEOGRÁFICA</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Región:</label>
                <span>{report.region}</span>
              </div>
              <div className="info-item">
                <label>Provincia:</label>
                <span>{report.provincia}</span>
              </div>
              <div className="info-item">
                <label>Municipio:</label>
                <span>{report.municipio}</span>
              </div>
              <div className="info-item">
                <label>Distrito:</label>
                <span>{report.distrito}</span>
              </div>
              <div className="info-item">
                <label>Sector:</label>
                <span>{report.sector}</span>
              </div>
            </div>
          </div>

          {/* Tipo de intervención */}
          <div className="template-section">
            <h3 className="section-title">🛠️ DATOS DE LA INTERVENCIÓN</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Tipo de Intervención:</label>
                <span>{report.tipoIntervencion}</span>
              </div>
              {report.subTipoCanal && (
                <div className="info-item">
                  <label>Subtipo:</label>
                  <span>{report.subTipoCanal}</span>
                </div>
              )}
              <div className="info-item">
                <label>Estado:</label>
                <span className={`status-badge status-${report.estado}`}>
                  {report.estado.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Datos métricos */}
          {report.metricData && Object.keys(report.metricData).length > 0 && (
            <div className="template-section">
              <h3 className="section-title">📊 DATOS MÉTRICOS</h3>
              <div className="info-grid">
                {Object.entries(report.metricData).map(([key, value]) => (
                  <div className="info-item" key={key}>
                    <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {report.observaciones && (
            <div className="template-section">
              <h3 className="section-title">📝 OBSERVACIONES</h3>
              <p className="observations-text">{report.observaciones}</p>
            </div>
          )}

          {/* Evidencia Fotográfica */}
          {report.imagesPerDay && Object.keys(report.imagesPerDay).length > 0 && (
            <div className="template-section">
              <h3 className="section-title">📸 EVIDENCIA FOTOGRÁFICA</h3>
              {Object.entries(report.imagesPerDay).map(([dayKey, images]) => {
                if (!images || images.length === 0) return null;
                
                const dayLabel = dayKey.replace('dia-', 'Día ').replace('general', 'General');
                
                return (
                  <div key={dayKey} style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: '#FF7A00', marginBottom: '10px' }}>{dayLabel}</h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '15px'
                    }}>
                      {images.map((image: any, index: number) => (
                        <div key={index} style={{
                          border: '2px solid #FF7A00',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <img
                            src={image.url}
                            alt={`Foto ${index + 1} - ${dayLabel}`}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="200"%3E%3Crect fill="%23ddd" width="250" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div style={{
                            padding: '8px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                          }}>
                            {new Date(image.timestamp).toLocaleString('es-DO')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Información del usuario */}
          <div className="template-footer">
            <div className="footer-item">
              <label>Creado por:</label>
              <span>{report.creadoPor}</span>
            </div>
            <div className="footer-item">
              <label>Fecha de creación:</label>
              <span>{new Date(report.fechaCreacion).toLocaleString('es-DO')}</span>
            </div>
            {report.modificadoPor && (
              <div className="footer-item">
                <label>Última modificación:</label>
                <span>{report.modificadoPor} - {new Date(report.fechaModificacion!).toLocaleString('es-DO')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección 2: Mapa de ruta */}
      {report.gpsData && (report.gpsData.punto_inicial || report.gpsData.punto_alcanzado) && (
        <div className="route-map-section">
          <div className="section-header">
            <h2>🗺️ Ruta de Intervención</h2>
            <p className="section-description">Trazado desde el punto inicial hasta el punto alcanzado</p>
          </div>
          <div className="map-container">
            <div ref={routeMapRef} className="route-map"></div>
          </div>
        </div>
      )}

      {/* Sección 3: Street View */}
      {report.gpsData?.punto_inicial && (
        <div className="street-view-section">
          <div className="section-header">
            <h2>🚶 Vista de Calle (Street View)</h2>
            <p className="section-description">Vista panorámica del punto inicial de la intervención</p>
          </div>
          <div className="street-view-container">
            <div ref={streetViewRef} className="street-view"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component para Google Maps
const ReportDetailViewWrapper: React.FC<ReportDetailViewProps> = (props) => {
  const render = (status: string) => {
    if (status === 'LOADING') return <div>Cargando Google Maps...</div>;
    if (status === 'FAILURE') return <div>Error al cargar Google Maps</div>;
    return <ReportDetailView {...props} />;
  };

  return (
    <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render} libraries={['geometry', 'places']}>
      <ReportDetailView {...props} />
    </Wrapper>
  );
};

export default ReportDetailViewWrapper;
