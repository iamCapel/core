import React, { useState, useEffect } from 'react';
import ReportsPage from './ReportsPage';
import ReportForm from './ReportForm';
import ExportPage from './ExportPage';
import UsersPage from './UsersPage';
import GoogleMapView from './GoogleMapView';
import LeafletMapView from './LeafletMapView';
import PendingReportsModal from './PendingReportsModal';
import './Dashboard.css';

type Field = { key: string; label: string; type: 'text' | 'number'; unit: string };

interface User {
  username: string;
  name: string;
}

const plantillaDefault: Field[] = [
  { key: 'punto_inicial', label: 'Punto inicial de la intervención', type: 'text', unit: 'Coordenadas decimales' },
  { key: 'punto_alcanzado', label: 'Punto alcanzado en la intervención', type: 'text', unit: 'Coordenadas decimales' },
  { key: 'longitud_intervencion', label: 'Longitud de intervención', type: 'number', unit: 'ml' },
  { key: 'limpieza_superficie', label: 'Limpieza de superficie', type: 'number', unit: 'm²' },
  { key: 'perfilado_superficie', label: 'Perfilado de superficie', type: 'number', unit: 'm²' },
  { key: 'compactado_superficie', label: 'Compactado de superficie', type: 'number', unit: 'm²' },
  { key: 'conformacion_cunetas', label: 'Conformación de cunetas', type: 'number', unit: 'ml' },
  { key: 'extraccion_bote_material', label: 'Extracción y bote de material inservible', type: 'number', unit: 'm³' },
  { key: 'escarificacion_superficies', label: 'Escarificación de superficies', type: 'number', unit: 'm²' },
  { key: 'conformacion_plataforma', label: 'Conformación de plataforma', type: 'number', unit: 'm²' },
  { key: 'zafra_material', label: 'Zafra de material', type: 'number', unit: 'm³' },
  { key: 'motonivelacion_superficie', label: 'Motonivelación de superficie', type: 'number', unit: 'm²' },
  { key: 'suministro_extension_material', label: 'Suministro y extensión de material', type: 'number', unit: 'm³' },
  { key: 'suministro_colocacion_grava', label: 'Suministro y colocación de grava', type: 'number', unit: 'm³' },
  { key: 'nivelacion_compactacion_grava', label: 'Nivelación y compactación de grava', type: 'number', unit: 'm²' },
  { key: 'reparacion_alcantarillas', label: 'Reparación de alcantarillas existentes', type: 'number', unit: 'und' },
  { key: 'construccion_alcantarillas', label: 'Construcción de alcantarillas', type: 'number', unit: 'und' },
  { key: 'limpieza_alcantarillas', label: 'Limpieza de alcantarillas', type: 'number', unit: 'und' },
  { key: 'limpieza_cauces', label: 'Limpieza de cauces y cañadas', type: 'number', unit: 'ml' },
  { key: 'obras_drenaje', label: 'Obras de drenaje', type: 'number', unit: 'ml' },
  { key: 'construccion_terraplenes', label: 'Construcción de terraplenes', type: 'number', unit: 'm³' },
  { key: 'relleno_compactacion', label: 'Relleno y compactación de material', type: 'number', unit: 'm³' },
  { key: 'conformacion_taludes', label: 'Conformación de taludes', type: 'number', unit: 'm²' }
];

const regionesRD = [
  'Cibao Norte','Cibao Sur','Cibao Nordeste','Cibao Noroeste','Cibao Centro',
  'Valdesia','Enriquillo','El Valle','Higuamo','Ozama','Yuma','Valle','Metropolitana'
];

const provinciasPorRegion: Record<string, string[]> = {
  'Cibao Norte': ['Puerto Plata', 'Espaillat', 'Santiago'],
  'Cibao Sur': ['La Vega', 'Monseñor Nouel', 'Sánchez Ramírez'],
  'Cibao Nordeste': ['Duarte', 'María Trinidad Sánchez', 'Samaná'],
  'Cibao Noroeste': ['Valverde', 'Monte Cristi', 'Dajabón', 'Santiago Rodríguez'],
  'Cibao Centro': ['Hermanas Mirabal', 'Salcedo'],
  'Valdesia': ['San Cristóbal', 'Peravia', 'San José de Ocoa'],
  'Enriquillo': ['Barahona', 'Pedernales', 'Independencia', 'Bahoruco'],
  'El Valle': ['Azua', 'San Juan', 'Elías Piña'],
  'Higuamo': ['San Pedro de Macorís', 'Hato Mayor', 'El Seibo'],
  'Ozama': ['Distrito Nacional', 'Santo Domingo'],
  'Yuma': ['La Altagracia', 'La Romana'],
  'Valle': ['Monte Plata'],
  'Metropolitana': ['Distrito Nacional', 'Santo Domingo Este', 'Santo Domingo Oeste', 'Santo Domingo Norte']
};

// Municipios por Provincia de República Dominicana
const municipiosPorProvincia: Record<string, string[]> = {
  // Cibao Norte
  'Puerto Plata': ['Puerto Plata', 'Altamira', 'Guananico', 'Imbert', 'Los Hidalgos', 'Luperón', 'Río San Juan', 'Villa Isabela', 'Villa Montellano'],
  'Espaillat': ['Moca', 'Cayetano Germosén', 'Gaspar Hernández', 'Jamao al Norte'],
  'Santiago': ['Santiago', 'Bisonó (Navarrete)', 'Jánico', 'Licey al Medio', 'Puñal', 'Sabana Iglesia', 'San José de las Matas', 'Tamboril', 'Villa González'],
  
  // Cibao Sur  
  'La Vega': ['La Vega', 'Constanza', 'Jarabacoa', 'Jima Abajo'],
  'Monseñor Nouel': ['Bonao', 'Maimón', 'Piedra Blanca'],
  'Sánchez Ramírez': ['Cotuí', 'Cevicos', 'Fantino', 'La Mata'],
  
  // Cibao Nordeste
  'Duarte': ['San Francisco de Macorís', 'Arenoso', 'Castillo', 'Eugenio María de Hostos', 'Las Guáranas', 'Pimentel', 'Villa Riva'],
  'María Trinidad Sánchez': ['Nagua', 'Cabrera', 'El Factor', 'Río San Juan'],
  'Samaná': ['Samaná', 'Las Terrenas', 'Sánchez'],
  
  // Cibao Noroeste
  'Monte Cristi': ['Monte Cristi', 'Castañuelas', 'Guayubín', 'Las Matas de Santa Cruz', 'Pepillo Salcedo (Manzanillo)', 'Villa Vásquez'],
  'Dajabón': ['Dajabón', 'El Pino', 'Loma de Cabrera', 'Partido', 'Restauración'],
  'Santiago Rodríguez': ['San Ignacio de Sabaneta', 'Los Almácigos', 'Monción'],
  'Valverde': ['Mao', 'Esperanza', 'Laguna Salada'],
  
  // Cibao Centro
  'Hermanas Mirabal': ['Salcedo (Tenares)', 'Tenares', 'Villa Tapia'],
  
  // Valdesia
  'San Cristóbal': ['San Cristóbal', 'Bajos de Haina', 'Cambita Garabitos', 'Los Cacaos', 'Sabana Grande de Palenque', 'San Gregorio de Nigua', 'Villa Altagracia', 'Yaguate'],
  'Peravia': ['Baní', 'Nizao', 'Sabana Buey'],
  'San José de Ocoa': ['San José de Ocoa', 'Rancho Arriba', 'Sabana Larga'],
  
  // Enriquillo
  'Barahona': ['Barahona', 'Cabral', 'El Peñón', 'Enriquillo', 'Fundación', 'Jaquimeyes', 'La Ciénaga', 'Las Salinas', 'Paraíso', 'Polo', 'Vicente Noble'],
  'Pedernales': ['Pedernales', 'Oviedo'],
  'Independencia': ['Jimaní', 'Cristóbal', 'Duvergé', 'La Descubierta', 'Mella', 'Postrer Río'],
  'Bahoruco': ['Neiba', 'Galván', 'Los Ríos', 'Tamayo', 'Villa Jaragua'],
  
  // El Valle
  'Azua': ['Azua de Compostela', 'Estebanía', 'Guayabal', 'Las Charcas', 'Las Yayas de Viajama', 'Padre Las Casas', 'Peralta', 'Pueblo Viejo', 'Sabana de la Mar', 'Tábara Arriba'],
  'San Juan': ['San Juan de la Maguana', 'Bohechío', 'El Cercado', 'Juan de Herrera', 'Las Matas de Farfán', 'Vallejuelo'],
  'Elías Piña': ['Comendador', 'Bánica', 'El Llano', 'Hondo Valle', 'Juan Santiago', 'Pedro Santana'],
  
  // Higuamo
  'San Pedro de Macorís': ['San Pedro de Macorís', 'Consuelo', 'Guayacanes', 'Quisqueya', 'Ramón Santana'],
  'Hato Mayor': ['Hato Mayor del Rey', 'El Valle', 'Sabana de la Mar'],
  'El Seibo': ['El Seibo', 'Miches'],
  
  // Ozama
  'Distrito Nacional': ['Distrito Nacional'],
  'Santo Domingo': ['Santo Domingo Este', 'Santo Domingo Norte', 'Santo Domingo Oeste', 'Boca Chica', 'Los Alcarrizos', 'Pedro Brand', 'San Antonio de Guerra'],
  
  // Yuma
  'La Altagracia': ['Higüey', 'San Rafael del Yuma'],
  'La Romana': ['La Romana', 'Guaymate', 'Villa Hermosa'],
  
  // Valle
  'Monte Plata': ['Monte Plata', 'Bayaguana', 'Peralvillo', 'Sabana Grande de Boyá', 'Yamasá']
};

const sectoresPorProvincia: Record<string, string[]> = {
  // Cibao Norte
  'Puerto Plata': ['Centro Urbano', 'Costa Dorada', 'Malecon', 'Playa Dorada', 'Cofresí', 'La Unión', 'Las Flores', 'Villa Montellano', 'Los Reyes', 'San Marcos'],
  'Espaillat': ['Centro', 'El Carmen', 'Las Flores', 'La Javilla', 'San Antonio', 'Villa Olga', 'Los Cocos', 'Jamao', 'Río Verde'],
  'Santiago': ['Centro Histórico', 'Los Jardines', 'Bella Vista', 'Cienfuegos', 'La Otra Banda', 'Pueblo Nuevo', 'Villa Olga', 'Los Salados', 'Tamboril Centro', 'Sabana Iglesia'],

  // Cibao Sur
  'La Vega': ['Centro', 'Rincón', 'Buenos Aires', 'Las Flores', 'Constanza Centro', 'Jarabacoa Centro', 'El Limón', 'La Sabina'],
  'Monseñor Nouel': ['Centro de Bonao', 'Villa Sonadora', 'Pueblo Nuevo', 'Los Maestros', 'Maimón Centro', 'Piedra Blanca Centro'],
  'Sánchez Ramírez': ['Cotuí Centro', 'Villa La Mata', 'Fantino Centro', 'Cevicos Centro', 'Los Botados', 'Villa Sonadora'],

  // Cibao Nordeste  
  'Duarte': ['Centro de San Francisco', 'Villa Riva', 'Castillo', 'Pimentel', 'Las Guáranas', 'Arenoso Centro', 'Hostos'],
  'María Trinidad Sánchez': ['Nagua Centro', 'Cabrera Centro', 'Río San Juan Centro', 'El Factor', 'Los Cacaos', 'Villa Clara'],
  'Samaná': ['Santa Bárbara Centro', 'Las Terrenas Centro', 'Sánchez Centro', 'Las Galeras', 'El Limón'],
  'Hermanas Mirabal': ['Salcedo Centro', 'Tenares Centro', 'Villa Tapia Centro', 'La Joya', 'Villa Hermosa'],

  // Cibao Noroeste
  'Valverde': ['Mao Centro', 'Esperanza Centro', 'Laguna Salada Centro', 'Guayacanes', 'Villa Elisa'],  
  'Monte Cristi': ['Monte Cristi Centro', 'Guayubín Centro', 'Castañuelas Centro', 'Las Matas Centro', 'Villa Vásquez Centro'],
  'Dajabón': ['Dajabón Centro', 'Loma de Cabrera Centro', 'Restauración Centro', 'El Pino Centro', 'Partido Centro'],
  'Santiago Rodríguez': ['Sabaneta Centro', 'Monción Centro', 'Villa Los Almácigos Centro', 'Los Quemados', 'El Rubio'],

  // Valdesia
  'San Cristóbal': ['Centro Histórico', 'Villa Altagracia Centro', 'Haina Centro', 'Los Cacaos Centro', 'Nigua Centro', 'Cambita Centro'],
  'Peravia': ['Baní Centro', 'Matanzas Centro', 'Nizao Centro', 'Villa Sombrero', 'Catalina'],  
  'San José de Ocoa': ['Centro', 'Rancho Arriba Centro', 'Sabana Larga Centro', 'El Pinar', 'Los Fríos'],

  // Enriquillo
  'Barahona': ['Barahona Centro', 'Cabral Centro', 'Enriquillo Centro', 'Paraíso Centro', 'Las Salinas Centro', 'Vicente Noble Centro'],
  'Pedernales': ['Pedernales Centro', 'Oviedo Centro', 'Cabo Rojo', 'Manuel Goya'],
  'Independencia': ['Jimaní Centro', 'Duvergé Centro', 'La Descubierta Centro', 'Cristóbal Centro', 'Mella Centro'],
  'Bahoruco': ['Neiba Centro', 'Galván Centro', 'Tamayo Centro', 'Los Ríos Centro', 'Villa Jaragua Centro'],

  // El Valle  
  'Azua': ['Azua Centro', 'Las Charcas Centro', 'Padre Las Casas Centro', 'Peralta Centro', 'Pueblo Viejo Centro'],
  'San Juan': ['San Juan Centro', 'Las Matas de Farfán Centro', 'Bohechío Centro', 'El Cercado Centro', 'Juan de Herrera Centro'],
  'Elías Piña': ['Comendador Centro', 'Bánica Centro', 'Hondo Valle Centro', 'Pedro Santana Centro', 'El Llano Centro'],

  // Higuamo
  'San Pedro de Macorís': ['Centro Histórico', 'Consuelo Centro', 'Los Llanos Centro', 'Quisqueya Centro', 'Ramón Santana Centro'],
  'Hato Mayor': ['Hato Mayor Centro', 'Sabana de la Mar Centro', 'El Valle Centro', 'Yerba Buena', 'Los Hatos'],
  'Monte Plata': ['Monte Plata Centro', 'Bayaguana Centro', 'Sabana Grande Centro', 'Yamasá Centro', 'Peralvillo Centro'],

  // Yuma
  'La Altagracia': ['Higüey Centro', 'Punta Cana', 'Bávaro', 'San Rafael del Yuma Centro', 'Miches', 'El Seibo Centro'],
  'La Romana': ['La Romana Centro', 'Casa de Campo', 'Guaymate Centro', 'Villa Hermosa Centro', 'Caleta'],
  'El Seibo': ['El Seibo Centro', 'Miches Centro', 'Pedro Sánchez', 'Santa Lucía'],

  // Ozama  
  'Distrito Nacional': ['Zona Colonial', 'Gazcue', 'Ciudad Nueva', 'San Carlos', 'Villa Juana', 'Cristo Rey', 'La Esperilla'],
  'Santo Domingo': ['Los Alcarrizos Centro', 'Pedro Brand Centro', 'San Antonio Centro', 'Boca Chica Centro', 'Pantoja', 'Villa Mella']
};

const distritosPorProvincia: Record<string, string[]> = {
  // Cibao Norte
  'Puerto Plata': ['Puerto Plata', 'Altamira', 'Guananico', 'Imbert', 'Los Hidalgos', 'Luperón', 'Villa Isabela', 'Villa Montellano'],
  'Espaillat': ['Moca', 'Cayetano Germosén', 'Gaspar Hernández', 'Jamao al Norte', 'San Víctor'],
  'Santiago': ['Santiago de los Caballeros', 'Baitoa', 'Jánico', 'Licey al Medio', 'Puñal', 'Sabana Iglesia', 'San José de las Matas', 'Tamboril', 'Villa Bisonó', 'Villa González'],

  // Cibao Sur  
  'La Vega': ['La Vega', 'Constanza', 'Jarabacoa', 'Jima Abajo'],
  'Monseñor Nouel': ['Bonao', 'Maimón', 'Piedra Blanca'],
  'Sánchez Ramírez': ['Cotuí', 'Cevicos', 'Fantino', 'La Mata'],

  // Cibao Nordeste
  'Duarte': ['San Francisco de Macorís', 'Arenoso', 'Castillo', 'Hostos', 'Las Guáranas', 'Pimentel', 'Villa Riva'],
  'María Trinidad Sánchez': ['Nagua', 'Cabrera', 'El Factor', 'Río San Juan'],
  'Samaná': ['Samaná', 'Las Terrenas', 'Sánchez'],
  'Hermanas Mirabal': ['Salcedo', 'Tenares', 'Villa Tapia'],

  // Cibao Noroeste
  'Valverde': ['Mao', 'Esperanza', 'Laguna Salada'],
  'Monte Cristi': ['Monte Cristi', 'Castañuelas', 'Guayubín', 'Las Matas de Santa Cruz', 'Pepillo Salcedo', 'Villa Vásquez'],
  'Dajabón': ['Dajabón', 'El Pino', 'Loma de Cabrera', 'Partido', 'Restauración'],
  'Santiago Rodríguez': ['Sabaneta', 'Monción', 'Villa Los Almácigos'],

  // Valdesia
  'San Cristóbal': ['San Cristóbal', 'Cambita Garabitos', 'Haina', 'Los Cacaos', 'Nigua', 'Sabana Grande de Palenque', 'Villa Altagracia', 'Yaguate'],
  'Peravia': ['Baní', 'Matanzas', 'Nizao'],
  'San José de Ocoa': ['San José de Ocoa', 'Rancho Arriba', 'Sabana Larga'],

  // Enriquillo
  'Barahona': ['Barahona', 'Cabral', 'El Peñón', 'Enriquillo', 'Fundación', 'Jaquimeyes', 'La Ciénaga', 'Las Salinas', 'Paraíso', 'Polo', 'Vicente Noble'],
  'Pedernales': ['Pedernales', 'Oviedo'],
  'Independencia': ['Jimaní', 'Cristóbal', 'Duvergé', 'La Descubierta', 'Mella', 'Postrer Río'],
  'Bahoruco': ['Neiba', 'Galván', 'Los Ríos', 'Tamayo', 'Villa Jaragua'],

  // El Valle
  'Azua': ['Azua', 'Estebanía', 'Guayabal', 'Las Charcas', 'Las Yayas de Viajama', 'Padre Las Casas', 'Peralta', 'Pueblo Viejo', 'Sabana Yegua', 'Tábara Arriba'],
  'San Juan': ['San Juan', 'Bohechío', 'El Cercado', 'Juan de Herrera', 'Las Matas de Farfán', 'Vallejuelo'],
  'Elías Piña': ['Comendador', 'Bánica', 'El Llano', 'Hondo Valle', 'Juan Santiago', 'Pedro Santana'],

  // Higuamo
  'San Pedro de Macorís': ['San Pedro de Macorís', 'Consuelo', 'Guayacanes', 'Los Llanos', 'Quisqueya', 'Ramón Santana'],
  'Hato Mayor': ['Hato Mayor', 'El Valle', 'Sabana de la Mar'],
  'Monte Plata': ['Monte Plata', 'Bayaguana', 'Peralvillo', 'Sabana Grande de Boyá', 'Yamasá'],

  // Yuma
  'La Altagracia': ['Higüey', 'San Rafael del Yuma'],
  'La Romana': ['La Romana', 'Guaymate', 'Villa Hermosa'],
  'El Seibo': ['El Seibo', 'Miches'],

  // Ozama
  'Distrito Nacional': ['Santo Domingo'],
  'Santo Domingo': ['Santo Domingo Este', 'Santo Domingo Norte', 'Santo Domingo Oeste', 'Boca Chica', 'Los Alcarrizos', 'Pedro Brand', 'San Antonio de Guerra']
};

const opcionesIntervencion = [
  'Rehabilitación Camino Vecinal',
  'Rehabilitación acceso a mina',
  'Restauración Calles comunidad',
  'Confección de cabezal de puente',
  'Restauración de vías de Comunicación',
  'Operativo de Emergencia',
  'Limpieza de alcantarillas',
  'Confección de puente',
  'Limpieza de Cañada',
  'Colocación de alcantarillas',
  'Canalización',
  'Desalojo',
  'Habilitación Zona protegida o Espacio público'
];

const canalOptions = ['Río', 'Arroyo', 'Cañada'];

const plantillasPorIntervencion: Record<string, Field[]> = {
  'Rehabilitación Camino Vecinal': [...plantillaDefault],
  'Rehabilitación acceso a mina': [{ key: 'nombre_mina', label: 'Nombre mina', type: 'text', unit: '' }, ...plantillaDefault],
  'Restauración Calles comunidad': [...plantillaDefault],
  'Confección de cabezal de puente': [...plantillaDefault],
  'Restauración de vías de Comunicación': [...plantillaDefault],
  'Operativo de Emergencia': [...plantillaDefault],
  'Limpieza de alcantarillas': [...plantillaDefault],
  'Confección de puente': [{ key: 'tipo_puente', label: 'Seleccionar tipo de puente (Alcantarilla / Viga)', type: 'text', unit: '' }, ...plantillaDefault],
  'Limpieza de Cañada': [{ key: 'nombre_canada', label: 'Nombre cañada', type: 'text', unit: '' }, ...plantillaDefault],
  'Colocación de alcantarillas': [...plantillaDefault],
  'Desalojo': [...plantillaDefault],
  'Habilitación Zona protegida o Espacio público': [...plantillaDefault],
  'Canalización:Río': [...plantillaDefault],
  'Canalización:Arroyo': [...plantillaDefault],
  'Canalización:Cañada': [...plantillaDefault]
};

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('mopc_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // login state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Navigation states
  const [showReportsPage, setShowReportsPage] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showExportPage, setShowExportPage] = useState(false);
  const [showUsersPage, setShowUsersPage] = useState(false);
  const [showGoogleMapView, setShowGoogleMapView] = useState(false);
  const [showLeafletMapView, setShowLeafletMapView] = useState(false);
  const [interventionToEdit, setInterventionToEdit] = useState<any>(null);

  // GPS states
  const [isGpsEnabled, setIsGpsEnabled] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lon: number } | null>(null);

  // Estado para el contador de notificaciones
  const [pendingCount, setPendingCount] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Función para actualizar el contador de pendientes
  const updatePendingCount = () => {
    const pendientes = Object.keys(localStorage).filter(key => 
      key.startsWith('intervencion_pendiente_') || key.startsWith('borrador_intervencion')
    ).length;
    setPendingCount(pendientes);
  };

  // Función para obtener lista detallada de reportes pendientes
  const getPendingReports = () => {
    const pendingKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('intervencion_pendiente_') || key.startsWith('borrador_intervencion')
    );

    return pendingKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return {
          id: key,
          reportNumber: key.includes('pendiente_') ? 
            `RPT-${key.split('_').pop()?.slice(-6) || '000000'}` : 
            `BRR-${Date.now().toString().slice(-6)}`,
          timestamp: data.timestamp || new Date().toISOString(),
          estado: data.estado || (key.includes('borrador') ? 'borrador' : 'pendiente'),
          region: data.region || 'N/A',
          provincia: data.provincia || 'N/A',
          municipio: data.municipio || 'N/A',
          tipoIntervencion: data.tipoIntervencion || 'No especificado'
        };
      } catch {
        return {
          id: key,
          reportNumber: `ERR-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toISOString(),
          estado: 'error',
          region: 'Error',
          provincia: 'Error',
          municipio: 'Error',
          tipoIntervencion: 'Error al cargar'
        };
      }
    });
  };

  // Función para editar un reporte pendiente
  const handleEditPendingReport = (reportId: string) => {
    try {
      const reportData = localStorage.getItem(reportId);
      if (reportData) {
        const data = JSON.parse(reportData);
        setInterventionToEdit(data);
        setShowPendingModal(false);
        setShowReportForm(true);
      }
    } catch (error) {
      alert('Error al cargar el reporte pendiente');
    }
  };

  // Función para eliminar un reporte pendiente
  const handleDeletePendingReport = (reportId: string) => {
    localStorage.removeItem(reportId);
    updatePendingCount();
    // Actualizar la vista del modal
    setShowPendingModal(false);
    setTimeout(() => setShowPendingModal(true), 100);
  };

  // Actualizar contador al cargar y cada vez que cambie localStorage
  useEffect(() => {
    updatePendingCount();
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      updatePendingCount();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También verificar periódicamente por si hay cambios internos
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Solicitar permisos GPS al cargar la aplicación
  useEffect(() => {
    const requestGpsPermission = async () => {
      if ('geolocation' in navigator) {
        try {
          // Solicitar permiso y obtener posición inicial
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setGpsPosition({
                lat: position.coords.latitude,
                lon: position.coords.longitude
              });
              setIsGpsEnabled(true);
              console.log('GPS habilitado al cargar la aplicación');
            },
            (error) => {
              console.warn('Error al obtener GPS inicial:', error.message);
              // Intentar de nuevo con opciones menos estrictas
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setGpsPosition({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                  });
                  setIsGpsEnabled(true);
                  console.log('GPS habilitado en segundo intento');
                },
                (secondError) => {
                  console.warn('GPS no disponible:', secondError.message);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
              );
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
        } catch (error) {
          console.warn('Error al solicitar permisos GPS:', error);
        }
      }
    };

    requestGpsPermission();
  }, []);

  // Navigation functions
  const cargarIntervencion = (intervention: any) => {
    setInterventionToEdit(intervention);
    setShowReportForm(true);
    setShowReportsPage(false);
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Por favor ingrese usuario y contraseña');
      return;
    }

    setIsLoading(true);
    setLoginError('');

    await new Promise(r => setTimeout(r, 1000));

    try {
      const newUser: User = {
        username: loginUser,
        name: loginUser === 'admin' ? 'Miguel Administrador' : `Usuario ${loginUser}`
      };
      localStorage.setItem('mopc_user', JSON.stringify(newUser));
      setUser(newUser);
      setLoginUser('');
      setLoginPass('');
    } catch (err) {
      setLoginError('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try { 
      localStorage.removeItem('mopc_user'); 
    } catch {}
  };

  const handleShowReports = () => {
    setShowReportsPage(true);
    setShowReportForm(false);
    setShowExportPage(false);
    setShowUsersPage(false);
  };

  const handleShowReportForm = () => {
    setShowReportForm(true);
    setShowReportsPage(false);
    setShowExportPage(false);
    setShowUsersPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
    setInterventionToEdit(null);
  };

  const handleShowExportPage = () => {
    setShowExportPage(true);
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowUsersPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
  };

  const handleShowUsersPage = () => {
    setShowUsersPage(true);
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowExportPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
  };

  const handleShowGoogleMap = () => {
    setShowGoogleMapView(true);
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowLeafletMapView(false);
  };

  const handleShowLeafletMap = () => {
    setShowLeafletMapView(true);
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowGoogleMapView(false);
  };

  const handleBackToDashboard = () => {
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowExportPage(false);
    setShowUsersPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
    setInterventionToEdit(null);
  };

  // Si se debe mostrar la página de informes
  if (showReportsPage && user) {
    return <ReportsPage user={user} onBack={handleBackToDashboard} />;
  }

  // Si se debe mostrar la página de exportar
  if (showExportPage && user) {
    return <ExportPage user={user} onBack={handleBackToDashboard} />;
  }

  // Si se debe mostrar la página de usuarios
  if (showUsersPage && user) {
    return <UsersPage user={user} onBack={handleBackToDashboard} />;
  }

  // Si se debe mostrar el formulario de reportes
  if (showReportForm && user) {
    return (
      <ReportForm
        user={user}
        onBack={handleBackToDashboard}
        plantillaDefault={plantillaDefault}
        regionesRD={regionesRD}
        provinciasPorRegion={provinciasPorRegion}
        municipiosPorProvincia={municipiosPorProvincia}
        sectoresPorProvincia={sectoresPorProvincia}
        distritosPorProvincia={distritosPorProvincia}
        opcionesIntervencion={opcionesIntervencion}
        canalOptions={canalOptions}
        plantillasPorIntervencion={plantillasPorIntervencion}
        interventionToEdit={interventionToEdit}
        isGpsEnabled={isGpsEnabled}
        gpsPosition={gpsPosition}
      />
    );
  }

  // Si se debe mostrar Google Maps
  if (showGoogleMapView && user) {
    return <GoogleMapView user={user} onBack={handleBackToDashboard} />;
  }

  // Si se debe mostrar Leaflet Maps
  if (showLeafletMapView && user) {
    return <LeafletMapView user={user} onBack={handleBackToDashboard} />;
  }

  // pantalla de login si no hay usuario
  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <div className="login-box">
            <div className="login-header">
              <div className="login-logos">
                <img src="/mopc-logo.png" alt="MOPC Logo" className="login-logo-left" />
                <img src="/logo-left.png?refresh=202510180002" alt="Logo Derecho" className="login-logo-right" />
              </div>
              <h1 className="login-title">Dirección de Coordinación Regional</h1>
              <p className="login-subtitle">Sistema de Gestión de Obras Públicas</p>
          </div>

          <form className="login-form" onSubmit={submitLogin}>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Ingrese su usuario"
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Ingrese contraseña"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {loginError && (
              <div className="error-message">
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="login-footer">
            <p>© 2025 Ministerio de Obras Públicas y Comunicaciones</p>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="topbar">
        <div className="topbar-left">
          <div className="dashboard-logos">
            <img src="/mopc-logo.png" alt="MOPC Logo" className="dashboard-logo-left" />
            <img src="/logo-left.png?refresh=202510180002" alt="Logo Derecho" className="dashboard-logo-right" />
          </div>
        </div>

        <div className="topbar-logo" aria-hidden></div>

        <div className="topbar-right">
          <div className="topbar-icon" aria-hidden />
          <div className="topbar-icon" aria-hidden />

          {/* GPS status badge */}
          <div className={`gps-status-badge ${isGpsEnabled ? 'enabled' : 'disabled'}`} title={isGpsEnabled && gpsPosition ? `GPS: ${gpsPosition.lat.toFixed(6)}, ${gpsPosition.lon.toFixed(6)}` : 'GPS inactivo'}>
            {isGpsEnabled ? 'GPS: ON' : 'GPS: OFF'}
          </div>



          {user ? (
            <>
              <div className="user-badge topbar-user" title={user.name}>
                {user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()} &nbsp; {user.name}
              </div>
              <button onClick={handleLogout} title="Cerrar sesión" className="btn topbar-btn">🔓</button>
              
              {/* Icono de notificaciones en el topbar */}
              <div className="notification-container topbar-notification">
                <img 
                  src="/images/notification-bell-icon.svg" 
                  alt="Notificaciones" 
                  className="notification-icon topbar-notification-icon"
                  style={{
                    width: '24px', 
                    height: '24px',
                    filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginLeft: '8px'
                  }}
                  onClick={() => {
                    // Abrir modal con lista de reportes pendientes
                    setShowPendingModal(true);
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.filter = 'drop-shadow(0 3px 6px rgba(255, 152, 0, 0.6))';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))';
                  }}
                />
                {/* Contador de notificaciones */}
                {pendingCount > 0 ? (
                  <span 
                    className="notification-badge topbar-notification-badge"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      animation: pendingCount > 0 ? 'pulse 2s infinite' : 'none'
                    }}
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="dashboard-content">
        <header className="dashboard-header centered-subtitle">
          <div className="header-center">
            <h2 className="dashboard-subtitle">DIRECCION DE COORDINACION REGIONAL</h2>
          </div>
        </header>

        <div className="dashboard-main">
          <div className="dashboard-icons-grid">
            {/* Icono Registrar */}
            <div className="dashboard-icon-card" onClick={handleShowReportForm}>
              <div className="dashboard-icon">
                <img src="/images/register-icon.svg" alt="Registrar" style={{width: '64px', height: '64px'}} />
              </div>
              <h3 className="dashboard-icon-title">Registrar</h3>
              <p className="dashboard-icon-description">
                Registrar nuevas obras y intervenciones realizadas
              </p>
            </div>

            {/* Icono Informes */}
            <div className="dashboard-icon-card" onClick={handleShowReports}>
              <div className="dashboard-icon">
                <img src="/images/reports-icon.svg" alt="Informes y Estadísticas" style={{width: '64px', height: '64px'}} />
              </div>
              <h3 className="dashboard-icon-title">Informes y Estadísticas</h3>
              <p className="dashboard-icon-description">
                Ver estadísticas, reportes y análisis de todas las intervenciones
              </p>
            </div>

            {/* Icono Buscar */}
            <div className="dashboard-icon-card" onClick={handleShowLeafletMap}>
              <div className="dashboard-icon">
                <img src="/images/map-icon.svg" alt="Buscar en mapa" style={{width: '64px', height: '64px'}} />
              </div>
              <h3 className="dashboard-icon-title">Buscar</h3>
              <p className="dashboard-icon-description">
                Buscar y visualizar intervenciones en mapa interactivo con GPS
              </p>
            </div>

            {/* Icono Usuarios - Activo */}
            <div className="dashboard-icon-card" onClick={handleShowUsersPage}>
              <div className="dashboard-icon">
                👥
              </div>
              <h3 className="dashboard-icon-title">Usuarios</h3>
              <p className="dashboard-icon-description">
                Gestión de usuarios activos e inactivos del sistema
              </p>
            </div>

            {/* Icono Exportar - Activo */}
            <div className="dashboard-icon-card" onClick={handleShowExportPage}>
              <div className="dashboard-icon">
                📤
              </div>
              <h3 className="dashboard-icon-title">Exportar</h3>
              <p className="dashboard-icon-description">
                Buscar y exportar reportes a Excel, PDF y Word
              </p>
            </div>

            {/* Icono Ayuda - Futuro */}
            <div className="dashboard-icon-card disabled">
              <div className="dashboard-icon">
                
              </div>
              <h3 className="dashboard-icon-title">Ayuda</h3>
              <p className="dashboard-icon-description">
                Manual de usuario y soporte técnico (Próximamente)
              </p>
            </div>
          </div>

          {/* Resumen de estadísticas rápidas */}
          <div className="dashboard-stats">
            <div className="stats-card">
              <div className="stats-icon"></div>
              <div className="stats-content">
                <h4>Total Intervenciones</h4>
                <p className="stats-number">
                  {JSON.parse(localStorage.getItem('mopc_intervenciones') || '[]').length}
                </p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon"></div>
              <div className="stats-content">
                <h4>Regiones Activas</h4>
                <p className="stats-number">
                  {new Set(JSON.parse(localStorage.getItem('mopc_intervenciones') || '[]').map((i: any) => i.region).filter(Boolean)).size}
                </p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon">👤</div>
              <div className="stats-content">
                <h4>Usuario Actual</h4>
                <p className="stats-text">{user?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Reportes Pendientes */}
      <PendingReportsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        reports={getPendingReports()}
        onEditReport={handleEditPendingReport}
        onDeleteReport={handleDeletePendingReport}
      />
    </div>
  );
};

export default Dashboard;