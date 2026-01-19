import React, { useState, useEffect } from 'react';
import ReportsPage from './ReportsPage';
import ReportForm from './ReportForm';
import ExportPage from './ExportPage';
import UsersPage from './UsersPage';
import GoogleMapView from './GoogleMapView';
import LeafletMapView from './LeafletMapView';
import PendingReportsModal from './PendingReportsModal';
import MyReportsCalendar from './MyReportsCalendar';
import { UserRole, applyUserTheme, getRoleBadge } from '../types/userRoles';
import { firebasePendingReportStorage } from '../services/firebasePendingReportStorage';
import { userStorage } from '../services/userStorage';
import * as firebaseUserStorage from '../services/firebaseUserStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import './Dashboard.css';

type Field = { key: string; label: string; type: 'text' | 'number'; unit: string };

interface User {
  username: string;
  name: string;
  profilePhoto?: string;
  fullName?: string;
  birthDate?: string;
  idCardPhoto?: string;
  profileCompleted?: boolean;
  role?: UserRole; // Agregar rol al usuario
}

const plantillaDefault: Field[] = [
  { key: 'punto_inicial', label: 'Punto inicial de la intervención', type: 'text', unit: 'Coordenadas decimales' },
  { key: 'punto_alcanzado', label: 'Punto alcanzado en la intervención', type: 'text', unit: 'Coordenadas decimales' },
  { key: 'longitud_intervencion', label: 'Longitud de intervención', type: 'number', unit: 'km' },
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
  'Ozama o Metropolitana',
  'Cibao Norte',
  'Cibao Sur',
  'Cibao Nordeste',
  'Cibao Noroeste',
  'Santiago',
  'Valdesia',
  'Enriquillo',
  'El Valle',
  'Yuma',
  'Higuamo'
];

const provinciasPorRegion: Record<string, string[]> = {
  'Ozama o Metropolitana': ['Distrito Nacional', 'Santo Domingo'],
  'Cibao Norte': ['Puerto Plata', 'Espaillat'],
  'Cibao Sur': ['La Vega', 'Monseñor Nouel', 'Sánchez Ramírez'],
  'Cibao Nordeste': ['Duarte', 'María Trinidad Sánchez', 'Samaná', 'Hermanas Mirabal'],
  'Cibao Noroeste': ['Valverde', 'Monte Cristi', 'Dajabón', 'Santiago Rodríguez'],
  'Santiago': ['Santiago'],
  'Valdesia': ['San Cristóbal', 'Peravia', 'San José de Ocoa'],
  'Enriquillo': ['Barahona', 'Pedernales', 'Independencia', 'Bahoruco'],
  'El Valle': ['San Juan', 'Elías Piña', 'Azua'],
  'Yuma': ['La Altagracia', 'La Romana', 'El Seibo'],
  'Higuamo': ['San Pedro de Macorís', 'Hato Mayor', 'Monte Plata']
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
  'Hermanas Mirabal': ['Salcedo', 'Tenares', 'Villa Tapia'],
  
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

// Distritos municipales organizados por municipio
const distritosPorMunicipio: Record<string, string[]> = {
  // REGIÓN OZAMA O METROPOLITANA
  // Distrito Nacional
  'Santo Domingo': [],
  'Distrito Nacional': [],
  
  // Santo Domingo
  'Santo Domingo Este': ['San Luis', 'Mendoza', 'San Isidro'],
  'Santo Domingo Norte': ['La Victoria', 'Villa Mella'],
  'Santo Domingo Oeste': ['Hato Nuevo', 'Altos de Arroyo Hondo'],
  'Boca Chica': ['La Caleta'],
  'Los Alcarrizos': ['Palmarejo-Villa Linda'],
  'Pedro Brand': [],
  'San Antonio de Guerra': [],
  
  // Monte Plata
  'Monte Plata': ['Chirino', 'Don Juan'],
  'Bayaguana': ['Monte Bonito'],
  'Peralvillo': [],
  'Sabana Grande de Boyá': ['Gonzalo'],
  'Yamasá': [],
  
  // REGIÓN CIBAO NORTE
  // Puerto Plata
  'Puerto Plata': ['Yásica Arriba'],
  'Altamira': ['Río Grande'],
  'Guananico': [],
  'Imbert': [],
  'Los Hidalgos': [],
  'Luperón': ['La Isabela', 'Belloso'],
  'Sosúa': ['Sabaneta de Yásica'],
  'Villa Isabela': [],
  'Villa Montellano': [],
  
  // Espaillat
  'Moca': ['José Contreras', 'San Víctor', 'Juan López'],
  'Cayetano Germosén': [],
  'Gaspar Hernández': ['Veragua'],
  'Jamao al Norte': [],
  
  // REGIÓN SANTIAGO
  // Santiago
  'Santiago de los Caballeros': ['Pedro García', 'El Limón'],
  'Santiago': ['Pedro García', 'El Limón'],
  'Baitoa': [],
  'Bisonó': [],
  'Bisonó (Navarrete)': [],
  'Jánico': ['El Caimito'],
  'Licey al Medio': ['Las Palomas'],
  'Puñal': ['Guayabal'],
  'Sabana Iglesia': [],
  'San José de las Matas': ['El Rubio', 'La Cuesta'],
  'Tamboril': ['Canca la Reyna'],
  'Villa González': ['Palmar Arriba'],
  
  // REGIÓN CIBAO SUR
  // La Vega
  'La Vega': ['Río Verde Arriba', 'El Ranchito'],
  'Constanza': ['Tireo', 'La Sabina'],
  'Jarabacoa': ['Manabao', 'Buena Vista'],
  'Jima Abajo': [],
  
  // Monseñor Nouel
  'Bonao': ['Sabana del Puerto', 'Jayaco'],
  'Maimón': [],
  'Piedra Blanca': [],
  
  // Sánchez Ramírez
  'Cotuí': [],
  'Cevicos': ['La Cueva'],
  'Fantino': [],
  'La Mata': [],
  
  // REGIÓN CIBAO NORDESTE
  // Duarte
  'San Francisco de Macorís': ['La Peña', 'Cenoví'],
  'Arenoso': ['Las Coles', 'El Aguacate'],
  'Castillo': [],
  'Eugenio María de Hostos': ['Sabana Grande'],
  'Las Guáranas': [],
  'Pimentel': [],
  'Villa Riva': ['Agua Santa del Yuna'],
  
  // María Trinidad Sánchez
  'Nagua': ['Las Gordas', 'San José de Matanzas'],
  'Cabrera': ['Arroyo Salado'],
  'El Factor': ['El Pozo'],
  'Río San Juan': [],
  
  // Samaná
  'Samaná': ['El Limón', 'Arroyo Barril', 'Las Galeras'],
  'Las Terrenas': [],
  'Sánchez': [],
  
  // Hermanas Mirabal
  'Salcedo': ['Jamao Afuera', 'Blanco'],
  'Tenares': [],
  'Villa Tapia': [],
  
  // REGIÓN CIBAO NOROESTE
  // Valverde
  'Mao': ['Guatapanal', 'Jaibón', 'Amina'],
  'Esperanza': ['Maizal', 'Jicomé'],
  'Laguna Salada': ['Jaibón'],
  
  // Monte Cristi
  'Monte Cristi': ['Villa Elisa'],
  'Castañuelas': ['Palo Verde'],
  'Guayubín': ['Hatillo Palma', 'Cana Chapetón'],
  'Las Matas de Santa Cruz': [],
  'Pepillo Salcedo': [],
  'Pepillo Salcedo (Manzanillo)': [],
  'Villa Vásquez': [],
  
  // Dajabón
  'Dajabón': [],
  'El Pino': [],
  'Loma de Cabrera': ['Capotillo'],
  'Partido': [],
  'Restauración': [],
  
  // Santiago Rodríguez
  'Sabaneta': [],
  'San Ignacio de Sabaneta': [],
  'Monción': [],
  'Villa Los Almácigos': [],
  'Los Almácigos': [],
  
  // REGIÓN VALDESIA
  // San Cristóbal
  'San Cristóbal': [],
  'Bajos de Haina': ['El Carril'],
  'Cambita Garabitos': ['Medina'],
  'Los Cacaos': [],
  'Sabana Grande de Palenque': [],
  'San Gregorio de Nigua': [],
  'Villa Altagracia': ['San José del Puerto', 'La Guinea'],
  'Yaguate': ['Doña Ana'],
  
  // Peravia
  'Baní': ['El Cañafístol', 'Villa Fundación', 'Paya', 'Villa Sombrero', 'El Limonal', 'Los Almácigos'],
  'Nizao': ['Pizarrete'],
  'Matanzas': ['Santana'],
  'Sabana Buey': [],
  
  // San José de Ocoa
  'San José de Ocoa': [],
  'Rancho Arriba': [],
  'Sabana Larga': [],
  
  // REGIÓN ENRIQUILLO
  // Barahona
  'Barahona': [],
  'Cabral': [],
  'El Peñón': [],
  'Enriquillo': ['Arroyo Dulce'],
  'Fundación': ['Pescadería'],
  'Jaquimeyes': ['Palo Alto'],
  'La Ciénaga': [],
  'Las Salinas': [],
  'Paraíso': ['Los Patos', 'Canoa'],
  'Polo': [],
  'Vicente Noble': [],
  
  // Pedernales
  'Pedernales': ['José Francisco Peña Gómez'],
  'Oviedo': ['Juancho'],
  
  // Independencia
  'Jimaní': ['El Limón'],
  'Cristóbal': ['Batey 8'],
  'Duvergé': [],
  'La Descubierta': ['Boca de Cachón'],
  'Mella': ['La Colonia'],
  'Postrer Río': ['Guayabal'],
  
  // Bahoruco
  'Neiba': [],
  'Galván': ['El Palmar'],
  'Los Ríos': ['Las Clavellinas'],
  'Tamayo': ['Cabral', 'Uvilla'],
  'Villa Jaragua': [],
  
  // REGIÓN EL VALLE
  // San Juan
  'San Juan': ['El Rosario', 'Hato del Padre', 'La Jagua', 'Las Maguanas-Hato Nuevo'],
  'San Juan de la Maguana': ['El Rosario', 'Hato del Padre', 'La Jagua', 'Las Maguanas-Hato Nuevo'],
  'Bohechío': ['Arroyo Cano', 'Yaque'],
  'El Cercado': ['Batista'],
  'Juan de Herrera': ['Jínova'],
  'Las Matas de Farfán': ['Matayaya', 'Carrera de Yegua'],
  'Vallejuelo': ['Jorjillo'],
  
  // Elías Piña
  'Comendador': ['Guayajayuco', 'Sabana Cruz', 'Sabana Larga', 'Guanito'],
  'Bánica': ['Sabana Higüero', 'Sabana Cruz'],
  'El Llano': ['Guayabo'],
  'Hondo Valle': ['Rancho de la Guardia'],
  'Juan Santiago': ['Las Caobas'],
  'Pedro Santana': ['Río Limpio'],
  
  // Azua
  'Azua': ['Barro Arriba', 'Las Barias-La Estancia', 'Los Jovillos'],
  'Azua de Compostela': ['Barro Arriba', 'Las Barias-La Estancia', 'Los Jovillos'],
  'Estebanía': [],
  'Guayabal': [],
  'Las Charcas': [],
  'Las Yayas de Viajama': ['Villarpando'],
  'Padre Las Casas': ['Las Lagunas', 'Palmar de Ocoa'],
  'Peralta': [],
  'Pueblo Viejo': [],
  'Sabana Yegua': ['Proyeto 4'],
  'Sabana de la Mar': ['Elupina Cordero'],
  'Tábara Arriba': ['Amiama Gómez', 'Tábara Abajo', 'Los Toros'],
  
  // REGIÓN HIGUAMO
  // San Pedro de Macorís
  'San Pedro de Macorís': [],
  'Consuelo': [],
  'Guayacanes': ['El Puerto'],
  'Los Llanos': [],
  'Quisqueya': [],
  'Ramón Santana': [],
  
  // Hato Mayor
  'Hato Mayor': ['Mata Palacio', 'Guayabo Dulce'],
  'Hato Mayor del Rey': ['Mata Palacio', 'Guayabo Dulce'],
  'El Valle': [],
  'Yerba Buena': [],
  
  // REGIÓN YUMA
  // La Altagracia
  'Higüey': ['La Otra Banda'],
  'San Rafael del Yuma': ['Boca de Yuma', 'Bayahibe'],
  
  // La Romana
  'La Romana': ['Caleta'],
  'Guaymate': [],
  'Villa Hermosa': ['Cumayasa'],
  
  // El Seibo
  'El Seibo': ['Pedro Sánchez'],
  'Miches': ['El Cedro', 'La Gina']
};

// Mantener compatibilidad: distritosPorProvincia ahora devuelve todos los municipios de la provincia
const distritosPorProvincia: Record<string, string[]> = municipiosPorProvincia;

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
  'Rehabilitación Camino Vecinal': [
    { key: 'nombre_camino', label: 'Nombre del camino vecinal', type: 'text', unit: '' },
    { key: 'punto_inicial', label: 'Punto inicial de la intervención', type: 'text', unit: 'Coordenadas decimales' },
    { key: 'punto_alcanzado', label: 'Punto alcanzado en la intervención', type: 'text', unit: 'Coordenadas decimales' },
    { key: 'longitud_intervencion', label: 'Longitud de intervención', type: 'number', unit: 'km' },
    { key: 'limpieza_superficie', label: 'Limpieza de superficie de rodadura (Incluye Cunetas)', type: 'number', unit: 'm²' },
    { key: 'perfilado_superficie', label: 'Perfilado de superficie', type: 'number', unit: 'm²' },
    { key: 'extraccion_material', label: 'Extracción de material inservible', type: 'number', unit: 'm³' },
    { key: 'bote_material', label: 'Bote de material inservible', type: 'number', unit: 'm³' },
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
  ],
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
  const [pendingReportsList, setPendingReportsList] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  // Estado para el menú desplegable del usuario
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMyReportsModal, setShowMyReportsModal] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  
  // Estados para el formulario de completar perfil
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [idCardPhoto, setIdCardPhoto] = useState<string>('');
  const [idCardNumber, setIdCardNumber] = useState<string>(''); // Nuevo estado para cédula
  const [showProfileIncompleteNotification, setShowProfileIncompleteNotification] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Función para actualizar el contador de pendientes del usuario actual
  const updatePendingCount = async () => {
    try {
      // Obtener reportes con estado 'pendiente' de la colección principal
      const allPending = await firebaseReportStorage.getReportsByEstado('pendiente');
      
      // Filtrar solo los del usuario actual
      const userPending = allPending.filter(report => 
        report.usuarioId === user?.username || report.creadoPor === user?.username
      );
      
      setPendingCount(userPending.length);
      console.log(`📊 Reportes pendientes del usuario ${user?.username}:`, userPending.length);
    } catch (error) {
      console.error('❌ Error actualizando contador de pendientes desde Firebase:', error);
      setPendingCount(0);
    }
  };

  // Función para obtener lista detallada de reportes pendientes del usuario
  const getPendingReports = async () => {
    try {
      // Obtener reportes con estado 'pendiente' de la colección principal
      const allPending = await firebaseReportStorage.getReportsByEstado('pendiente');
      
      // Filtrar solo los del usuario actual
      const userPending = allPending.filter(report => 
        report.usuarioId === user?.username || report.creadoPor === user?.username
      );

      const formatted = userPending.map(report => {
        try {
          return {
            id: report.id,
            reportNumber: report.numeroReporte || `DCR-${report.id.slice(-6)}`,
            timestamp: report.timestamp || report.fechaCreacion,
            estado: report.estado,
            region: report.region || 'N/A',
            provincia: report.provincia || 'N/A',
            municipio: report.municipio || 'N/A',
            tipoIntervencion: report.tipoIntervencion || 'No especificado'
          };
        } catch {
          return {
            id: report.id,
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
      setPendingReportsList(formatted);
      return formatted;
    } catch (error) {
      console.error('❌ Error obteniendo reportes pendientes desde Firebase:', error);
      setPendingReportsList([]);
      return [];
    }
  };

  // Función para continuar un reporte pendiente
  const handleContinuePendingReport = async (reportId: string) => {
    try {
      console.log('📋 Cargando reporte pendiente desde Firebase:', reportId);
      
      // Cargar desde la colección principal de reportes (no desde pendingReports)
      const pendingReport = await firebaseReportStorage.getReport(reportId);
      
      console.log('📦 Datos del reporte desde Firebase:', pendingReport);
      
      if (pendingReport && pendingReport.estado === 'pendiente') {
        // Convertir el reporte completo a formato de edición
        const dataToLoad = {
          id: pendingReport.id,
          region: pendingReport.region,
          provincia: pendingReport.provincia,
          distrito: pendingReport.distrito,
          municipio: pendingReport.municipio,
          sector: pendingReport.sector,
          tipoIntervencion: pendingReport.tipoIntervencion,
          subTipoCanal: pendingReport.subTipoCanal,
          observaciones: pendingReport.observaciones,
          metricData: pendingReport.metricData || {},
          gpsData: pendingReport.gpsData || {},
          vehiculos: pendingReport.vehiculos || [],
          fechaInicio: pendingReport.fechaCreacion ? pendingReport.fechaCreacion.split('T')[0] : '',
          fechaReporte: pendingReport.fechaCreacion ? pendingReport.fechaCreacion.split('T')[0] : '',
          estado: pendingReport.estado,
          _isEditingPending: true // Marca para identificar que se está editando un pendiente
        };
        
        console.log('✅ Datos a cargar en el formulario:', dataToLoad);
        console.log('🔑 Claves disponibles:', Object.keys(dataToLoad));
        console.log('📦 Objeto completo:', JSON.stringify(dataToLoad, null, 2));
        
        setInterventionToEdit(dataToLoad);
        setShowPendingModal(false);
        setShowMyReportsModal(false); // Cerrar el modal de "Mis Reportes"
        setShowReportForm(true);
      } else {
        console.error('❌ No se encontró el reporte pendiente en Firebase:', reportId);
        alert('No se pudo cargar el reporte pendiente');
      }
    } catch (error) {
      console.error('❌ Error al cargar el reporte pendiente desde Firebase:', error);
      alert('Error al cargar el reporte pendiente');
    }
  };

  // Función para cancelar/eliminar un reporte pendiente
  const handleCancelPendingReport = async (reportId: string) => {
    try {
      // Eliminar de la colección principal de Firebase
      await firebaseReportStorage.deleteReport(reportId);
      console.log('✅ Reporte pendiente eliminado de Firebase');
      await updatePendingCount();
      // Actualizar la vista del modal
      setShowPendingModal(false);
      setTimeout(() => setShowPendingModal(true), 100);
    } catch (error) {
      console.error('❌ Error eliminando reporte pendiente:', error);
      alert('Error al eliminar el reporte pendiente. Verifique su conexión a internet.');
    }
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

  // Cargar reportes pendientes cuando se abre el modal
  useEffect(() => {
    if (showPendingModal) {
      console.log('📥 Modal de pendientes abierto, cargando reportes desde Firebase...');
      getPendingReports();
    }
  }, [showPendingModal]);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Verificar si el perfil del usuario está completo
  useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        // Verificar si el usuario requiere verificación de perfil desde Firebase
        const firebaseUser = await firebaseUserStorage.getUserByUsername(user.username);
        
        console.log('🔍 Verificando usuario:', user.username);
        console.log('📦 Usuario Firebase:', firebaseUser);
        console.log('✅ isVerified:', firebaseUser?.isVerified);
        
        // Si el usuario no existe en Firebase, no pedir verificación (compatibilidad con localStorage)
        if (!firebaseUser) {
          console.log('ℹ️ Usuario solo en localStorage, sin verificación requerida');
          setShowProfileIncompleteNotification(false);
          setIsProfileComplete(true);
          return;
        }
        
        // Si el usuario existe en Firebase pero no está verificado
        const requiresVerification = !firebaseUser.isVerified;
        
        if (requiresVerification) {
          // Solo mostrar solicitud de verificación si isVerified es false
          const profileData = localStorage.getItem(`profile_${user.username}`);
          if (profileData) {
            const profile = JSON.parse(profileData);
            setProfilePhoto(profile.profilePhoto || '');
            setFullName(profile.fullName || '');
            setBirthDate(profile.birthDate || '');
            setIdCardPhoto(profile.idCardPhoto || '');
            
            // Verificar si todos los campos están completos
            const isComplete = profile.profilePhoto && profile.fullName && profile.birthDate && profile.idCardPhoto;
            setShowProfileIncompleteNotification(!isComplete);
            setIsProfileComplete(isComplete);
          } else {
            setShowProfileIncompleteNotification(true);
            setIsProfileComplete(false);
          }
        } else {
          // Usuario con isVerified = true no necesita verificación de perfil
          console.log('✅ Usuario verificado, ocultando notificación');
          setShowProfileIncompleteNotification(false);
          setIsProfileComplete(true);
        }
      }
    };
    
    checkVerification();
  }, [user]);

  // Aplicar tema según el rol del usuario
  useEffect(() => {
    if (user && user.role) {
      // Aplicar tema del rol
      applyUserTheme(user.role);
    } else {
      // Si no hay rol definido, usar rol por defecto (Admin para compatibilidad)
      applyUserTheme(UserRole.ADMIN);
    }
  }, [user]);


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
      console.log('🔐 Intentando login con Firebase...');
      
      // Intentar login con Firebase
      const result = await firebaseUserStorage.loginWithUsername(loginUser, loginPass);
      
      if (result.success && result.user) {
        const validatedUser = result.user;
        
        // Verificar si la cuenta está activa
        if (!validatedUser.isActive) {
          setLoginError('⚠️ Lo sentimos, su cuenta está temporalmente desactivada. Comuníquese con su superior.');
          setIsLoading(false);
          return;
        }
        
        // Credenciales válidas y cuenta activa - usuario autenticado
        const userRole: UserRole = validatedUser.role === 'Administrador' ? UserRole.ADMIN :
                                     validatedUser.role === 'Supervisor' ? UserRole.SUPERVISOR :
                                     UserRole.TECNICO;
        
        const newUser: User = {
          username: validatedUser.username,
          name: validatedUser.name,
          role: userRole
        };
        
        localStorage.setItem('mopc_user', JSON.stringify(newUser));
        setUser(newUser);
        setLoginUser('');
        setLoginPass('');
        
        console.log(`✅ Usuario autenticado desde Firebase como: ${getRoleBadge(userRole)}`);
        setIsLoading(false);
        return;
      }
      
      // Si Firebase falla, intentar con localStorage como fallback
      console.log('⚠️ Firebase login falló, intentando con localStorage...');
      const allUsers = userStorage.getAllUsers();
      console.log('📊 Usuarios en localStorage:', allUsers.length);
      
      const validatedUser = userStorage.validateCredentials(loginUser, loginPass);
      
      if (validatedUser) {
        if (!validatedUser.isActive) {
          setLoginError('⚠️ Lo sentimos, su cuenta está temporalmente desactivada. Comuníquese con su superior.');
          setIsLoading(false);
          return;
        }
        
        const userRole: UserRole = validatedUser.role === 'Administrador' ? UserRole.ADMIN :
                                     validatedUser.role === 'Supervisor' ? UserRole.SUPERVISOR :
                                     UserRole.TECNICO;
        
        const newUser: User = {
          username: validatedUser.username,
          name: validatedUser.name,
          role: userRole
        };
        
        localStorage.setItem('mopc_user', JSON.stringify(newUser));
        setUser(newUser);
        setLoginUser('');
        setLoginPass('');
        
        console.log(`✅ Usuario autenticado desde localStorage como: ${getRoleBadge(userRole)}`);
        setIsLoading(false);
        return;
      }
      
      // Usuario no encontrado en ningún lado
      setLoginError(result.error || `❌ Usuario "${loginUser}" no encontrado`);
      setIsLoading(false);
      
    } catch (err) {
      console.error('❌ Error en login:', err);
      setLoginError('⚠️ Error del sistema. Recargue la página e intente nuevamente.');
      setIsLoading(false);
    }
  };

  // Funciones para manejar el perfil del usuario
  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdCardPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    if (!user) return;

    // Validar que todos los campos estén completos
    if (!profilePhoto || !fullName || !idCardNumber || !idCardPhoto) {
      alert('⚠️ Por favor complete todos los campos requeridos');
      return;
    }

    // Verificar si el usuario está en userStorage
    const storedUser = userStorage.getUserByUsername(user.username);
    
    if (storedUser && storedUser.cedula) {
      // Validar que el número de cédula coincida con el registrado
      const storedCedula = storedUser.cedula;
      
      // Normalizar los números de cédula (quitar guiones, espacios, puntos)
      const normalizedInput = idCardNumber.replace(/[-.\s]/g, '');
      const normalizedStored = storedCedula.replace(/[-.\s]/g, '');
      
      if (normalizedInput !== normalizedStored) {
        alert('❌ Error de verificación');
        return;
      }
    }

    // Guardar en localStorage
    const profileData = {
      profilePhoto,
      fullName,
      birthDate,
      idCardNumber,
      idCardPhoto,
      profileCompleted: true
    };

    localStorage.setItem(`profile_${user.username}`, JSON.stringify(profileData));
    
    // Actualizar el usuario con los datos del perfil
    const updatedUser = {
      ...user,
      ...profileData
    };
    setUser(updatedUser);
    localStorage.setItem('mopc_user', JSON.stringify(updatedUser));

    // Actualizar estados de verificación de perfil
    setShowProfileIncompleteNotification(false);
    setIsProfileComplete(true);
    setShowCompleteProfileModal(false);
    alert('✅ Perfil completado exitosamente. Ahora puede acceder a todas las funcionalidades.');
  };

  const handleLogout = () => {
    setUser(null);
    try { 
      localStorage.removeItem('mopc_user'); 
    } catch {}
  };

  const handleShowReports = () => {
    if (!isProfileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }
    setShowReportsPage(true);
    setShowReportForm(false);
    setShowExportPage(false);
    setShowUsersPage(false);
  };

  const handleShowReportForm = () => {
    if (!isProfileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }
    setShowReportForm(true);
    setShowReportsPage(false);
    setShowExportPage(false);
    setShowUsersPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
    setInterventionToEdit(null);
  };

  const handleShowExportPage = () => {
    if (!isProfileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }
    setShowExportPage(true);
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowUsersPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
  };

  const handleShowUsersPage = () => {
    if (!isProfileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }
    setShowUsersPage(true);
    setShowReportsPage(false);
    setShowReportForm(false);
    setShowExportPage(false);
    setShowGoogleMapView(false);
    setShowLeafletMapView(false);
  };

  const handleShowLeafletMap = () => {
    if (!isProfileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }
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
    return (
      <ReportsPage 
        user={user} 
        onBack={handleBackToDashboard}
        onEditReport={(reportId) => {
          // Cargar el reporte desde Firebase
          firebaseReportStorage.getReport(reportId).then((report) => {
            if (report) {
              setInterventionToEdit(report);
              setShowReportsPage(false);
              setShowReportForm(true);
            }
          }).catch((error) => {
            console.error('Error al cargar reporte para editar:', error);
            alert('Error al cargar el reporte. Por favor intente nuevamente.');
          });
        }}
      />
    );
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
        key={interventionToEdit?._pendingReportId || interventionToEdit?.id || 'new-report'} // ✅ Forzar remontaje
        user={user}
        onBack={handleBackToDashboard}
        plantillaDefault={plantillaDefault}
        regionesRD={regionesRD}
        provinciasPorRegion={provinciasPorRegion}
        municipiosPorProvincia={municipiosPorProvincia}
        sectoresPorProvincia={sectoresPorProvincia}
        distritosPorProvincia={distritosPorProvincia}
        distritosPorMunicipio={distritosPorMunicipio}
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

          {user ? (
            <>
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
                    marginLeft: '8px',
                    animation: pendingCount > 0 ? 'bellShake 0.5s ease-in-out infinite alternate' : 'none'
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
                      animation: 'badgeGlow 2s infinite'
                    }}
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                ) : null}
              </div>

              {/* Menú desplegable del usuario */}
              <div className="user-menu-container" style={{ position: 'relative' }}>
                <div 
                  className="topbar-notification"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px'
                  }}
                >
                  <div style={{ width: '24px', height: '3px', backgroundColor: '#ff7a00', borderRadius: '2px' }}></div>
                  <div style={{ width: '24px', height: '3px', backgroundColor: '#ff7a00', borderRadius: '2px' }}></div>
                  <div style={{ width: '24px', height: '3px', backgroundColor: '#ff7a00', borderRadius: '2px' }}></div>
                </div>

                {showUserMenu && (
                  <div className="user-dropdown-menu">
                    {/* Información del usuario con badge de rol */}
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-avatar">
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '32px' }}>👤</span>
                        )}
                      </div>
                      <div className="user-dropdown-info">
                        <div className="user-dropdown-name">{user.name}</div>
                        {user.role && (
                          <span className={`role-badge ${user.role}`}>
                            {getRoleBadge(user.role)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="user-dropdown-divider"></div>
                    <div className="user-dropdown-item" onClick={() => {
                      setShowUserMenu(false);
                      setShowCompleteProfileModal(true);
                    }}>
                      <span>👤</span>
                      <span>Mi Perfil</span>
                    </div>
                    <div className="user-dropdown-item" onClick={() => {
                      setShowUserMenu(false);
                      setShowMyReportsModal(true);
                    }}>
                      <span>📋</span>
                      <span>Mis Reportes</span>
                    </div>
                    <div className="user-dropdown-divider"></div>
                    <div className="user-dropdown-item" onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}>
                      <span>🚪</span>
                      <span>Cerrar Sesión</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Notificación de perfil incompleto */}
        {showProfileIncompleteNotification && (
          <div className="profile-incomplete-notification">
            <div className="notification-content">
              <span className="notification-icon">⚠️</span>
              <div className="notification-text">
                <strong>Verificar cuenta</strong>
                <p>Complete su perfil para acceder a todas las funcionalidades</p>
              </div>
              <button 
                className="notification-button"
                onClick={() => setShowCompleteProfileModal(true)}
              >
                Completar ahora
              </button>
            </div>
          </div>
        )}

        <header className="dashboard-header centered-subtitle">
          <div className="header-center">
            <h2 className="dashboard-subtitle">DIRECCION DE COORDINACION REGIONAL</h2>
          </div>
        </header>

        <div className="dashboard-main">
          <div className="dashboard-icons-grid">
            {/* Icono Registrar */}
            <div className={`dashboard-icon-card ${!isProfileComplete ? 'profile-locked' : ''}`} onClick={handleShowReportForm}>
              <div className="dashboard-icon">
                <img src="/images/register-icon.svg" alt="Registrar" style={{width: '64px', height: '64px'}} />
              </div>
              <h3 className="dashboard-icon-title">Registrar</h3>
              <p className="dashboard-icon-description">
                Registrar nuevas obras y intervenciones realizadas
              </p>
              {!isProfileComplete && <div className="locked-overlay">🔒</div>}
            </div>

            {/* Icono Informes - Oculto para usuarios técnicos */}
            {user?.role !== UserRole.TECNICO && (
              <div className={`dashboard-icon-card ${!isProfileComplete ? 'profile-locked' : ''}`} onClick={handleShowReports}>
                <div className="dashboard-icon">
                  <img src="/images/reports-icon.svg" alt="Informes y Estadísticas" style={{width: '64px', height: '64px'}} />
                </div>
                <h3 className="dashboard-icon-title">Informes y Estadísticas</h3>
                <p className="dashboard-icon-description">
                  Ver estadísticas, reportes y análisis de todas las intervenciones
                </p>
                {!isProfileComplete && <div className="locked-overlay">🔒</div>}
              </div>
            )}

            {/* Icono Buscar */}
            <div className={`dashboard-icon-card ${!isProfileComplete ? 'profile-locked' : ''}`} onClick={handleShowLeafletMap}>
              <div className="dashboard-icon">
                <img src="/images/map-icon.svg" alt="Buscar en mapa" style={{width: '64px', height: '64px'}} />
              </div>
              <h3 className="dashboard-icon-title">Buscar</h3>
              <p className="dashboard-icon-description">
                Buscar y visualizar intervenciones en mapa interactivo con GPS
              </p>
              {!isProfileComplete && <div className="locked-overlay">🔒</div>}
            </div>

            {/* Icono Usuarios - Oculto para usuarios técnicos */}
            {user?.role !== UserRole.TECNICO && (
              <div className={`dashboard-icon-card ${!isProfileComplete ? 'profile-locked' : ''}`} onClick={handleShowUsersPage}>
                <div className="dashboard-icon">
                  👥
                </div>
                <h3 className="dashboard-icon-title">Usuarios</h3>
                <p className="dashboard-icon-description">
                  Gestión de usuarios activos e inactivos del sistema
                </p>
                {!isProfileComplete && <div className="locked-overlay">🔒</div>}
              </div>
            )}

            {/* Icono Exportar - Activo */}
            <div className={`dashboard-icon-card ${!isProfileComplete ? 'profile-locked' : ''}`} onClick={handleShowExportPage}>
              <div className="dashboard-icon">
                📤
              </div>
              <h3 className="dashboard-icon-title">Exportar</h3>
              <p className="dashboard-icon-description">
                Buscar y exportar reportes a Excel, PDF y Word
              </p>
              {!isProfileComplete && <div className="locked-overlay">🔒</div>}
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
        </div>
      </div>

      {/* Modal de Reportes Pendientes */}
      <PendingReportsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        reports={pendingReportsList}
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />

      {/* Modal de Perfil de Usuario */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Mi Perfil</h2>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="profile-section">
                <div className="profile-avatar-large">
                  {user?.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="profile-info-group">
                  <div className="profile-info-item">
                    <label>👤 Nombre completo</label>
                    <input type="text" value={user?.name || ''} readOnly className="form-input" />
                  </div>
                  <div className="profile-info-item">
                    <label>🔑 Usuario</label>
                    <input type="text" value={user?.username || ''} readOnly className="form-input" />
                  </div>
                  <div className="profile-info-item">
                    <label>🏢 Departamento</label>
                    <input type="text" value="Dirección de Coordinación Regional" readOnly className="form-input" />
                  </div>
                  <div className="profile-info-item">
                    <label>📍 Región asignada</label>
                    <input type="text" value="Todas las regiones" readOnly className="form-input" />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mis Reportes */}
      {showMyReportsModal && (
        <div className="modal-overlay" onClick={() => setShowMyReportsModal(false)}>
          <div className="modal-content my-reports-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2>📋 Mis Reportes</h2>
              <button className="modal-close" onClick={() => setShowMyReportsModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <MyReportsCalendar 
                username={user?.username || ''} 
                onClose={() => setShowMyReportsModal(false)}
                onContinuePendingReport={handleContinuePendingReport}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Completar Perfil */}
      {showCompleteProfileModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteProfileModal(false)}>
          <div className="modal-content complete-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✨ Completar Perfil</h2>
              <button className="modal-close" onClick={() => setShowCompleteProfileModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Complete toda su información para verificar su cuenta</p>
              
              {/* Foto de Perfil */}
              <div className="profile-field-section">
                <label className="profile-field-label">📸 Foto de Perfil *</label>
                <div className="profile-photo-upload">
                  {profilePhoto ? (
                    <div className="profile-photo-preview">
                      <img src={profilePhoto} alt="Perfil" />
                      <button className="change-photo-btn" onClick={() => setProfilePhoto('')}>
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="profile-photo-placeholder">
                      <label htmlFor="profile-photo-input" className="upload-label">
                        <span className="upload-icon">📷</span>
                        <span>Click para subir foto</span>
                        <input
                          id="profile-photo-input"
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Nombre Completo */}
              <div className="profile-field-section">
                <label className="profile-field-label">👤 Nombre Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Juan Pérez Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Número de Cédula */}
              <div className="profile-field-section">
                <label className="profile-field-label">🆔 Número de Cédula *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: 001-1234567-8"
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  maxLength={15}
                />
                <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                  Debe coincidir con el número registrado en el sistema
                </small>
              </div>

              {/* Foto del Carnet */}
              <div className="profile-field-section">
                <label className="profile-field-label">🪪 Foto del Carnet de Identidad *</label>
                <div className="id-card-upload">
                  {idCardPhoto ? (
                    <div className="id-card-preview">
                      <img src={idCardPhoto} alt="Carnet" />
                      <button className="change-photo-btn" onClick={() => setIdCardPhoto('')}>
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="id-card-placeholder">
                      <label htmlFor="id-card-input" className="upload-label">
                        <span className="upload-icon">🪪</span>
                        <span>Click para subir foto del carnet</span>
                        <input
                          id="id-card-input"
                          type="file"
                          accept="image/*"
                          onChange={handleIdCardPhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <p className="required-fields-note">* Todos los campos son obligatorios</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCompleteProfileModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveProfile}>
                Guardar y Verificar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;