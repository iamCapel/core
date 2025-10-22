import React, { useState, useEffect } from 'react';

type Field = { key: string; label: string; type: 'text' | 'number'; unit: string };

interface User {
  username: string;
  name: string;
}

interface ReportFormProps {
  user: User;
  onBack: () => void;
  plantillaDefault: Field[];
  regionesRD: string[];
  provinciasPorRegion: Record<string, string[]>;
  municipiosPorProvincia: Record<string, string[]>;
  sectoresPorProvincia: Record<string, string[]>;
  distritosPorProvincia: Record<string, string[]>;
  opcionesIntervencion: string[];
  canalOptions: string[];
  plantillasPorIntervencion: Record<string, Field[]>;
  interventionToEdit?: any;
  isGpsEnabled?: boolean;
  gpsPosition?: { lat: number; lon: number } | null;
}

const ReportForm: React.FC<ReportFormProps> = ({
  user,
  onBack,
  plantillaDefault,
  regionesRD,
  provinciasPorRegion,
  municipiosPorProvincia,
  sectoresPorProvincia,
  distritosPorProvincia,
  opcionesIntervencion,
  canalOptions,
  plantillasPorIntervencion,
  interventionToEdit,
  isGpsEnabled: parentGpsEnabled = false,
  gpsPosition: parentGpsPosition = null
}) => {
  // Estados del formulario
  const [region, setRegion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [sector, setSector] = useState('');
  const [sectorPersonalizado, setSectorPersonalizado] = useState('');
  const [mostrarSectorPersonalizado, setMostrarSectorPersonalizado] = useState(false);
  const [tipoIntervencion, setTipoIntervencion] = useState('');
  const [subTipoCanal, setSubTipoCanal] = useState('');

  const [plantillaFields, setPlantillaFields] = useState<Field[]>(plantillaDefault);
  const [plantillaValues, setPlantillaValues] = useState<Record<string, string>>({});

  // GPS state
  const [gpsEnabled, setGpsEnabled] = useState(parentGpsEnabled);
  const [gpsStatus, setGpsStatus] = useState('');
  const [pendingCoords, setPendingCoords] = useState<{lat: number, lon: number} | null>(null);
  const [targetField, setTargetField] = useState<{key: string, label: string} | null>(null);
  const [approvedGpsFields, setApprovedGpsFields] = useState<Set<string>>(new Set());
  const [rejectedGpsFields, setRejectedGpsFields] = useState<Set<string>>(new Set());
  const [autoGpsFields, setAutoGpsFields] = useState<Record<string, {lat: number, lon: number}>>({});

  // Si el dashboard ya habilitó GPS y proporcionó una posición, usarla como autoGpsFields
  useEffect(() => {
    if (parentGpsEnabled && parentGpsPosition) {
      setAutoGpsFields(prev => ({
        ...prev,
        punto_inicial: { lat: parentGpsPosition.lat, lon: parentGpsPosition.lon },
        punto_alcanzado: { lat: parentGpsPosition.lat, lon: parentGpsPosition.lon }
      }));
      setGpsStatus('GPS habilitado desde el sistema');
      setGpsEnabled(true);
    }
  }, [parentGpsEnabled, parentGpsPosition]);
  // Sincronizar GPS del parent
  useEffect(() => {
    setGpsEnabled(parentGpsEnabled);
    if (parentGpsEnabled && parentGpsPosition) {
      setGpsStatus('GPS habilitado desde el sistema');
    }
  }, [parentGpsEnabled, parentGpsPosition]);

  // Lógica de habilitación de campos
  const provinciasDisponibles = region ? provinciasPorRegion[region] || [] : [];
  const distritosDisponibles = provincia ? distritosPorProvincia[provincia] || [] : [];
  const municipiosDisponibles = provincia ? municipiosPorProvincia[provincia] || [] : [];
  const sectoresDisponibles = provincia ? sectoresPorProvincia[provincia] || [] : [];
  
  // Verificar si todos los campos geográficos están completos
  const camposGeograficosCompletos = region && provincia && distrito && municipio && (sector || (sector === 'otros' && sectorPersonalizado));

  // Cargar intervención para editar si se proporciona
  useEffect(() => {
    if (interventionToEdit) {
      setRegion(interventionToEdit.region || '');
      setProvincia(interventionToEdit.provincia || '');
      setDistrito(interventionToEdit.distrito || '');
      setMunicipio(interventionToEdit.municipio || '');
      
      // Manejar sector
      const sectoresDisponiblesParaProvincia = sectoresPorProvincia[interventionToEdit.provincia] || [];
      if (sectoresDisponiblesParaProvincia.includes(interventionToEdit.sector)) {
        setSector(interventionToEdit.sector);
        setMostrarSectorPersonalizado(false);
        setSectorPersonalizado('');
      } else {
        setSector('otros');
        setMostrarSectorPersonalizado(true);
        setSectorPersonalizado(interventionToEdit.sector || '');
      }
      
      // Manejar tipo de intervención
      let tipoBase = interventionToEdit.tipoIntervencion;
      let subTipo = '';
      
      if (interventionToEdit.tipoIntervencion?.includes(':')) {
        const partes = interventionToEdit.tipoIntervencion.split(':');
        tipoBase = partes[0];
        subTipo = partes[1];
      }
      
      setTipoIntervencion(tipoBase);
      setSubTipoCanal(subTipo);
      
      // Cargar valores de plantilla
      const valoresPlantilla: Record<string, string> = {};
      plantillaDefault.forEach(field => {
        if (interventionToEdit[field.key]) {
          valoresPlantilla[field.key] = interventionToEdit[field.key];
        }
      });
      
      if (interventionToEdit.nombre_mina) {
        valoresPlantilla.nombre_mina = interventionToEdit.nombre_mina;
      }
      
      setPlantillaValues(valoresPlantilla);
    }
  }, [interventionToEdit, plantillaDefault, sectoresPorProvincia]);

  // Efecto para obtener coordenadas automáticamente cuando se activa GPS
  useEffect(() => {
    if (gpsEnabled && plantillaFields.length > 0) {
      // Buscar campos de coordenadas en la plantilla actual
      const coordFields = plantillaFields.filter(field => 
        field.key.includes('punto_inicial') || field.key.includes('punto_alcanzado')
      );
      
      if (coordFields.length > 0 && !('geolocation' in navigator)) {
        setGpsStatus('Geolocalización no soportada.');
        return;
      }

      if (coordFields.length > 0) {
        setGpsStatus('Obteniendo ubicación automáticamente...');
        
        navigator.geolocation.getCurrentPosition(
          pos => {
            const coords = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            };
            
            // Agregar coordenadas automáticas para todos los campos de coordenadas
            const newAutoGpsFields: Record<string, {lat: number, lon: number}> = {};
            coordFields.forEach(field => {
              newAutoGpsFields[field.key] = coords;
            });
            
            setAutoGpsFields(newAutoGpsFields);
            setGpsStatus(`Coordenadas obtenidas: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
          },
          error => {
            let errorMsg = 'Error GPS: ';
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMsg += 'Permiso denegado. Active la ubicación en su navegador.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg += 'Ubicación no disponible.';
                break;
              case error.TIMEOUT:
                errorMsg += 'Tiempo agotado.';
                break;
              default:
                errorMsg += 'Error desconocido.';
            }
            setGpsStatus(errorMsg);
            setAutoGpsFields({});
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    } else {
      setAutoGpsFields({});
    }
  }, [gpsEnabled, plantillaFields]);
  useEffect(() => {
    if (tipoIntervencion === 'Canalización' && subTipoCanal) {
      const key = `${tipoIntervencion}:${subTipoCanal}`;
      setPlantillaFields(plantillasPorIntervencion[key] || plantillaDefault);
    } else if (tipoIntervencion && tipoIntervencion !== 'Canalización') {
      setPlantillaFields(plantillasPorIntervencion[tipoIntervencion] || plantillaDefault);
    } else {
      setPlantillaFields(plantillaDefault);
    }
  }, [tipoIntervencion, subTipoCanal, plantillasPorIntervencion, plantillaDefault]);

  // Funciones de manejo del formulario
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegion(e.target.value);
    setProvincia('');
    setMunicipio('');
    setDistrito('');
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvincia(e.target.value);
    setMunicipio('');
    setDistrito('');
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleMunicipioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMunicipio(e.target.value);
    setDistrito('');
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleDistritoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistrito(e.target.value);
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSector(value);
    setTipoIntervencion('');
    setSubTipoCanal('');
    
    if (value === 'otros') {
      setMostrarSectorPersonalizado(true);
      setSectorPersonalizado('');
    } else {
      setMostrarSectorPersonalizado(false);
      setSectorPersonalizado('');
    }
  };

  const handleTipoIntervencionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoIntervencion(e.target.value);
    setSubTipoCanal('');
    setPlantillaValues({});
  };

  const handlePlantillaChange = (key: string, value: string) => {
    setPlantillaValues(prev => ({...prev, [key]: value}));
  };

  const limpiarFormulario = () => {
    setRegion('');
    setProvincia('');
    setDistrito('');
    setMunicipio('');
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
    setPlantillaValues({});
  };

  const guardarIntervencion = () => {
    const sectorFinal = sector === 'otros' ? sectorPersonalizado : sector;
    
    if (!region || !provincia || !distrito || !sectorFinal || !tipoIntervencion) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (sector === 'otros' && !sectorPersonalizado.trim()) {
      alert('Por favor ingrese el nombre del sector personalizado');
      return;
    }

    if (tipoIntervencion === 'Canalización' && !subTipoCanal) {
      alert('Por favor seleccione el tipo de canal');
      return;
    }

    const intervencion = {
      id: interventionToEdit?.id || Date.now(),
      timestamp: new Date().toISOString(),
      region,
      provincia,
      distrito,
      municipio,
      sector: sectorFinal,
      tipoIntervencion: tipoIntervencion === 'Canalización' ? `${tipoIntervencion}:${subTipoCanal}` : tipoIntervencion,
      usuario: user?.name || 'Desconocido',
      ...plantillaValues
    };

    // Guardar en localStorage
    let intervenciones = JSON.parse(localStorage.getItem('mopc_intervenciones') || '[]');
    
    if (interventionToEdit) {
      // Actualizar intervención existente
      intervenciones = intervenciones.map((inv: any) => 
        inv.id === interventionToEdit.id ? intervencion : inv
      );
    } else {
      // Agregar nueva intervención
      intervenciones.push(intervencion);
    }
    
    localStorage.setItem('mopc_intervenciones', JSON.stringify(intervenciones));

    limpiarFormulario();
    alert(`Intervención ${interventionToEdit ? 'actualizada' : 'guardada'} exitosamente`);
  };

  // Función para guardar plantilla como predeterminada
  const guardarPlantillaPorDefecto = () => {
    const templateConfig = {
      templateName: 'MOPC Formulario de Intervención Estándar',
      headerConfig: {
        title: '📋 FORMULARIO DE INTERVENCIÓN',
        subtitle: 'Registro detallado de trabajos realizados',
        logoEnabled: true,
        referenceEnabled: true,
        dateEnabled: true
      },
      projectInfoEnabled: true,
      separatorEnabled: true,
      separatorText: 'DATOS TÉCNICOS DE LA INTERVENCIÓN',
      footerConfig: {
        signatureEnabled: true,
        stampEnabled: true,
        stampText: 'MOPC VALIDADO'
      },
      savedAt: new Date().toISOString(),
      isDefault: true
    };

    localStorage.setItem('mopc_template_default', JSON.stringify(templateConfig));
    
    // También guardamos las configuraciones de diseño
    const designConfig = {
      primaryColor: '#ff7a00',
      backgroundColor: 'white',
      borderColor: '#ccc',
      borderRadius: '8px',
      maxWidth: '800px',
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('mopc_design_default', JSON.stringify(designConfig));
    alert('✅ Plantilla guardada como predeterminada');
  };

  // Cargar plantilla predeterminada al inicio
  useEffect(() => {
    const defaultTemplate = localStorage.getItem('mopc_template_default');
    if (!defaultTemplate) {
      // Si no hay plantilla predeterminada, guardar la actual como predeterminada
      guardarPlantillaPorDefecto();
      console.log('Plantilla predeterminada configurada automáticamente');
    } else {
      const config = JSON.parse(defaultTemplate);
      console.log('Plantilla predeterminada cargada:', config.templateName);
    }
  }, []);

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    guardarIntervencion();
  };

  // GPS Functions
  const handleCoordinateFieldClick = (fieldKey: string, fieldLabel: string) => {
    // Try to enable GPS via parent state or request permission if not enabled
    if (!gpsEnabled) {
      if ('geolocation' in navigator) {
        setGpsStatus('Solicitando permiso de geolocalización...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsEnabled(true);
            const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setPendingCoords(coords);
            setTargetField({ key: fieldKey, label: fieldLabel });
            setGpsStatus(`Ubicación encontrada: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
          },
          (err) => {
            setGpsStatus('Permiso de geolocalización denegado o no disponible.');
            alert('Por favor habilite el GPS en su dispositivo y recargue la página.');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
        return;
      } else {
        setGpsStatus('Geolocalización no soportada.');
        return;
      }
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('Geolocalización no soportada.');
      return;
    }

    setGpsStatus('Buscando ubicación...');
    setTargetField({ key: fieldKey, label: fieldLabel });

    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };
        
        setPendingCoords(coords);
        setShowGpsApproval(true);
        setGpsStatus(`Ubicación encontrada: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
      },
      error => {
        let errorMsg = 'Error GPS: ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Permiso denegado. Active la ubicación en su navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Ubicación no disponible.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Tiempo agotado.';
            break;
          default:
            errorMsg += 'Error desconocido.';
        }
        setGpsStatus(errorMsg);
        setTargetField(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const toggleGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('Geolocalización no soportada.');
      return;
    }
    setGpsEnabled(v => !v);
    if (gpsEnabled) {
      setGpsStatus('');
      setShowGpsApproval(false);
      setPendingCoords(null);
      setTargetField(null);
      setApprovedGpsFields(new Set());
      setAutoGpsFields({});
    } else {
      setGpsStatus('');
    }
  };

  const handleGpsApprove = () => {
    if (pendingCoords && targetField) {
      const coordsString = `${pendingCoords.lat.toFixed(6)}, ${pendingCoords.lon.toFixed(6)}`;
      setPlantillaValues(prev => ({ ...prev, [targetField.key]: coordsString }));
      setGpsStatus(`Coordenadas aplicadas a "${targetField.label}": ${coordsString}`);
      setApprovedGpsFields(prev => new Set(prev).add(targetField.key));
    }
    setShowGpsApproval(false);
    setPendingCoords(null);
    setTargetField(null);
  };

  const handleGpsCancel = () => {
    setShowGpsApproval(false);
    setPendingCoords(null);
    setTargetField(null);
    setGpsStatus('Coordenadas descartadas');
  };

  // Funciones para manejar coordenadas automáticas
  const acceptAutoGps = (fieldKey: string) => {
    const coords = autoGpsFields[fieldKey];
    if (coords) {
      const coordsString = `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
      setPlantillaValues(prev => ({ ...prev, [fieldKey]: coordsString }));
      setApprovedGpsFields(prev => new Set(prev).add(fieldKey));
      // Mark as approved (hide buttons)
      setRejectedGpsFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldKey);
        return newSet;
      });
      
      // Remover de campos automáticos
      setAutoGpsFields(prev => {
        const newFields = { ...prev };
        delete newFields[fieldKey];
        return newFields;
      });
      
      setGpsStatus(`Coordenadas aceptadas para ${fieldKey}`);
    }
  };

  const rejectAutoGps = (fieldKey: string) => {
    // Remover de campos automáticos para permitir entrada manual
    setAutoGpsFields(prev => {
      const newFields = { ...prev };
      delete newFields[fieldKey];
      return newFields;
    });
    // Mark as rejected to hide buttons and allow manual entry
    setRejectedGpsFields(prev => new Set(prev).add(fieldKey));
    setGpsStatus(`Campo ${fieldKey} disponible para entrada manual`);
  };

  // Función para verificar si todos los campos de "Registros de obras realizadas" están completos
  const areAllRegistrosCompleted = () => {
    const basicFieldsCompleted = region && provincia && distrito && sector && tipoIntervencion;
    
    if (tipoIntervencion === 'Canalización') {
      return basicFieldsCompleted && subTipoCanal;
    }
    
    return basicFieldsCompleted;
  };

  return (
    <div className="dashboard">
      {/* Topbar similar al dashboard principal */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="dashboard-logos">
            <img src="/logo-left.png?refresh=202510180002" alt="Logo Derecho" className="dashboard-logo-right" />
          </div>
        </div>

        <div className="topbar-logo" aria-hidden></div>

        <div className="topbar-right">
          <button 
            onClick={onBack}
            title="Volver al Dashboard" 
            className="btn topbar-btn"
          >
            ← Volver
          </button>
          <div className={`gps-status-badge ${gpsEnabled ? 'enabled' : 'disabled'}`} title={gpsEnabled ? gpsStatus || 'GPS habilitado' : 'GPS inactivo'}>
            {gpsEnabled ? 'GPS: ON' : 'GPS: OFF'}
          </div>

          {/* GPS toggle */}
          <div className="gps-wrapper">
            <button onClick={toggleGps} title="Activar/desactivar GPS" className={`btn topbar-btn gps-btn ${gpsEnabled ? 'active' : ''}`}>🛰️</button>
            {gpsStatus && <div className="gps-status" title={gpsStatus}>{gpsStatus.startsWith('OK') ? 'GPS ✔' : 'GPS ✱'}</div>}
          </div>

          <div className="user-badge topbar-user" title={user.name}>
            {user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()} &nbsp; {user.name}
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Header profesional con logo y número de reporte */}
        <div className="report-header-professional">
          <div className="report-header-left">
            <div className="report-number-section">
              <h2 className="report-main-title">MINISTERIO DE OBRAS PÚBLICAS Y COMUNICACIONES</h2>
              <h3 className="report-subtitle">DIRECCIÓN DE COORDINACIÓN REGIONAL</h3>
              <div className="report-number-container">
                <span className="report-number-label">Nº de Reporte:</span>
                <span className="report-number-value">
                  {interventionToEdit ? 
                    `RPT-${new Date(interventionToEdit.timestamp || Date.now()).getTime().toString().slice(-8)}` :
                    `RPT-${Date.now().toString().slice(-8)}`
                  }
                </span>
              </div>
              <div className="report-date">
                <span>Fecha: {new Date().toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
          
          <div className="report-header-right">
          </div>
        </div>

        <div className="report-form-separator"></div>

        <h3 className="records-header">
          {interventionToEdit ? '📝 Editar Intervención' : '📋 Registro de Obras Realizadas'}
        </h3>

        <form className="dashboard-form" onSubmit={handleGuardar}>
          {/* Sección de ubicación */}
          <div className="dashboard-row">
            <div className="form-group">
              <label htmlFor="region">Región</label>
              <select 
                id="region"
                value={region}
                onChange={handleRegionChange}
                className="form-input"
                required
              >
                <option value="">Seleccionar región</option>
                {regionesRD.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="provincia">Provincia</label>
              <select 
                id="provincia"
                value={provincia}
                onChange={handleProvinciaChange}
                className="form-input"
                disabled={!region}
                required
              >
                <option value="">Seleccionar provincia</option>
                {provinciasDisponibles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="municipio">Municipio</label>
              <select 
                id="municipio"
                value={municipio}
                onChange={handleMunicipioChange}
                className="form-input"
                disabled={!provincia}
                required
              >
                <option value="">Seleccionar municipio</option>
                {municipiosDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="distrito">Distrito Municipal</label>
              <select 
                id="distrito"
                value={distrito}
                onChange={handleDistritoChange}
                className="form-input"
                disabled={!municipio}
                required
              >
                <option value="">Seleccionar distrito municipal</option>
                {distritosDisponibles.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sector">Sector o Localidad</label>
              <select 
                id="sector"
                value={sector}
                onChange={handleSectorChange}
                className="form-input"
                disabled={!distrito}
                required
              >
                <option value="">Seleccionar sector o localidad</option>
                {sectoresDisponibles.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="otros">➕ Otros (Agregar nuevo sector o localidad)</option>
              </select>
            </div>
          </div>

          {/* Campo de sector personalizado */}
          {mostrarSectorPersonalizado && (
            <div className="dashboard-row">
              <div className="form-group" style={{ width: '100%' }}>
                <div className="sector-personalizado">
                  <label htmlFor="sectorPersonalizado" className="sector-personalizado-label">
                    Ingrese el nombre del nuevo sector:
                  </label>
                  <input
                    id="sectorPersonalizado"
                    type="text"
                    value={sectorPersonalizado}
                    onChange={(e) => setSectorPersonalizado(e.target.value)}
                    placeholder="Escriba el nombre del sector o localidad..."
                    className="form-input sector-personalizado-input"
                    required
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sección de tipo de intervención */}
          <div className="dashboard-row">
            <div className="form-group">
              <label htmlFor="tipoIntervencion">Tipo de Intervención</label>
              <select 
                id="tipoIntervencion"
                value={tipoIntervencion}
                onChange={handleTipoIntervencionChange}
                className="form-input"
                disabled={!camposGeograficosCompletos}
                required
              >
                <option value="">Seleccionar tipo</option>
                {opcionesIntervencion.map(opcion => (
                  <option key={opcion} value={opcion}>{opcion}</option>
                ))}
              </select>
            </div>

            {tipoIntervencion === 'Canalización' && (
              <div className="form-group">
                <label htmlFor="subTipoCanal">Tipo de Canal</label>
                <select 
                  id="subTipoCanal"
                  value={subTipoCanal}
                  onChange={(e) => setSubTipoCanal(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">Seleccionar tipo de canal</option>
                  {canalOptions.map(opcion => (
                    <option key={opcion} value={opcion}>{opcion}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sección de plantilla de datos */}
          {plantillaFields.length > 0 && areAllRegistrosCompleted() && (
            <div className="report-template-container">
              {/* Header del reporte de intervención */}
              <div className="template-header">
                <div className="template-header-left">
                  <h3 className="template-title">📋 FORMULARIO DE INTERVENCIÓN</h3>
                  <div className="template-subtitle">Registro detallado de trabajos realizados</div>
                </div>
                <div className="template-header-right">
                  <div className="header-info-section">
                    <div className="template-reference">
                      <span className="reference-label">Ref:</span>
                      <span className="reference-code">MOPC-{Date.now().toString().slice(-6)}</span>
                    </div>
                    <div className="template-date">
                      {new Date().toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="header-logo-section">
                  </div>
                </div>
              </div>

              {/* Información del proyecto */}
              <div className="project-info-section">
                <div className="project-info-grid">
                  <div className="info-item">
                    <span className="info-label">Región:</span>
                    <span className="info-value">{region}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Provincia:</span>
                    <span className="info-value">{provincia}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Municipio:</span>
                    <span className="info-value">{municipio}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Tipo:</span>
                    <span className="info-value">{tipoIntervencion}</span>
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className="template-separator">
                <div className="separator-line"></div>
                <span className="separator-text">DATOS TÉCNICOS DE LA INTERVENCIÓN</span>
                <div className="separator-line"></div>
              </div>

              {/* Grid de campos de la plantilla */}
              <div className="template-fields-grid">
                {plantillaFields.map((field, index) => (
                  <div key={field.key} className="template-field-card">
                    <div className="field-header">
                      <span className="field-number">{(index + 1).toString().padStart(2, '0')}</span>
                      <label className="field-label" htmlFor={field.key}>
                        {field.label}
                      </label>
                      {field.unit && <span className="field-unit">({field.unit})</span>}
                    </div>
                    
                    <div className="field-input-container">
                      {field.type === 'text' ? (
                        (field.key.includes('coordenadas') || field.key.includes('punto_inicial') || field.key.includes('punto_alcanzado')) ? (
                          <div className="coordinate-input-wrapper">
                            {/* Campo de entrada de coordenadas */}
                            <input
                              id={field.key}
                              type="text"
                              value={
                                autoGpsFields[field.key] 
                                  ? `${autoGpsFields[field.key].lat.toFixed(6)}, ${autoGpsFields[field.key].lon.toFixed(6)}`
                                  : plantillaValues[field.key] || ''
                              }
                              onChange={(e) => handlePlantillaChange(field.key, e.target.value)}
                              className={`form-input coordinate-field ${autoGpsFields[field.key] ? 'has-auto-gps' : ''}`}
                              placeholder={autoGpsFields[field.key] ? "Coordenadas automáticas disponibles" : "Obtener coordenadas GPS"}
                              readOnly={!!autoGpsFields[field.key] && !approvedGpsFields.has(field.key) && !rejectedGpsFields.has(field.key)}
                              onClick={() => !autoGpsFields[field.key] && handleCoordinateFieldClick(field.key, field.label)}
                              style={{
                                backgroundColor: autoGpsFields[field.key] ? 'rgba(0, 123, 255, 0.1)' : undefined,
                                color: autoGpsFields[field.key] ? '#495057' : undefined,
                                fontStyle: autoGpsFields[field.key] ? 'italic' : undefined,
                                cursor: autoGpsFields[field.key] ? 'default' : 'pointer'
                              }}
                            />
                            
                            {/* Iconos de aceptar/rechazar coordenadas automáticas */}
                            {(autoGpsFields[field.key] && !approvedGpsFields.has(field.key) && !rejectedGpsFields.has(field.key)) && (
                            <div className="gps-action-buttons">
                              <button
                                type="button"
                                className={`gps-accept-btn ${autoGpsFields[field.key] ? 'active' : 'inactive'}`}
                                onClick={() => autoGpsFields[field.key] ? acceptAutoGps(field.key) : handleCoordinateFieldClick(field.key, field.label)}
                                title={autoGpsFields[field.key] ? "Aceptar coordenadas automáticas" : "Obtener coordenadas GPS"}
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className={`gps-reject-btn ${autoGpsFields[field.key] ? 'active' : 'inactive'}`}
                                onClick={() => autoGpsFields[field.key] ? rejectAutoGps(field.key) : undefined}
                                title={autoGpsFields[field.key] ? "Rechazar y permitir entrada manual" : "Rechazar coordenadas"}
                                disabled={!autoGpsFields[field.key]}
                              >
                                ✗
                              </button>
                            </div>
                            )}
                          </div>
                        ) : (
                          <input
                            id={field.key}
                            type="text"
                            value={plantillaValues[field.key] || ''}
                            onChange={(e) => handlePlantillaChange(field.key, e.target.value)}
                            className="field-input"
                          />
                        )
                      ) : (
                        <input
                          id={field.key}
                          type="number"
                          step="0.01"
                          value={plantillaValues[field.key] || ''}
                          onChange={(e) => handlePlantillaChange(field.key, e.target.value)}
                          className="field-input"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer del template */}
              <div className="template-footer">
                <div className="footer-left">
                  <div className="signature-section">
                    <div className="signature-line"></div>
                    <span className="signature-label">Firma del Responsable Técnico</span>
                  </div>
                </div>
                <div className="footer-right">
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions" style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
            
            {/* Botón Verde - Guardar */}
            <button 
              type="button" 
              onClick={guardarIntervencion} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: '#27AE60',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 4px 8px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(39, 174, 96, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(39, 174, 96, 0.3)';
              }}
            >
              <img 
                src="/images/save-green-icon.svg" 
                alt="Guardar" 
                style={{ width: '32px', height: '32px', marginBottom: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Guardar</span>
            </button>

            {/* Botón Naranja - Pendiente */}
            <button 
              type="button" 
              onClick={() => {
                // Guardar como pendiente
                const pendienteData = { 
                  region, provincia, distrito, municipio, sector, 
                  tipoIntervencion, subTipoCanal, plantillaValues,
                  estado: 'pendiente',
                  timestamp: new Date().toISOString()
                };
                localStorage.setItem('intervencion_pendiente_' + Date.now(), JSON.stringify(pendienteData));
                alert('Guardado como pendiente');
                limpiarFormulario();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: '#F39C12',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 4px 8px rgba(243, 156, 18, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(243, 156, 18, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(243, 156, 18, 0.3)';
              }}
            >
              <img 
                src="/images/pending-orange-icon.svg" 
                alt="Pendiente" 
                style={{ width: '32px', height: '32px', marginBottom: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Pendiente</span>
            </button>

            {/* Botón Rojo - Cancelar */}
            <button 
              type="button" 
              onClick={() => {
                if (window.confirm('¿Está seguro de que desea cancelar? Se perderán los datos no guardados.')) {
                  limpiarFormulario();
                  // Opcional: cerrar el formulario o redirigir
                  alert('Operación cancelada');
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: '#E74C3C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 4px 8px rgba(231, 76, 60, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(231, 76, 60, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(231, 76, 60, 0.3)';
              }}
            >
              <img 
                src="/images/cancel-red-icon.svg" 
                alt="Cancelar" 
                style={{ width: '32px', height: '32px', marginBottom: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Cancelar</span>
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;