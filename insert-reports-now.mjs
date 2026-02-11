import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPD0d6v-DIlXdpPxUbCqvKoZWvjXp0Fzc",
  authDomain: "mopc-sistemas.firebaseapp.com",
  projectId: "mopc-sistemas",
  storageBucket: "mopc-sistemas.firebasestorage.app",
  messagingSenderId: "1032157255922",
  appId: "1:1032157255922:web:d0e4e4c8f8f8f8f8f8f8f8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function generarId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `DCR-${timestamp}-${random}`;
}

function generarNumeroReporte() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DCR-${year}${month}${day}-${random}`;
}

async function verificarExistentes() {
  console.log('🔍 Verificando reportes existentes de capel para Feb 3-5, 2026...');
  
  const q = query(collection(db, "reports"), where("usuarioId", "==", "capel"));
  const snapshot = await getDocs(q);
  
  const reportesFebrero = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const fecha = data.fechaProyecto || data.timestamp || '';
    if (fecha.includes('2026-02-03') || fecha.includes('2026-02-04') || fecha.includes('2026-02-05')) {
      reportesFebrero.push({id: doc.id, fecha: fecha.split('T')[0], tipo: data.tipoIntervencion, estado: data.estado});
    }
  });
  
  return reportesFebrero;
}

async function insertarReportes() {
  console.log('\n🚀 INSERTANDO REPORTES PARA CAPEL - Febrero 3, 4, 5 de 2026\n');
  
  // Primero verificar si ya existen
  const existentes = await verificarExistentes();
  if (existentes.length > 0) {
    console.log('⚠️  Ya existen reportes para esas fechas:');
    existentes.forEach(r => console.log(`   → ${r.fecha}: ${r.tipo} (${r.estado})`));
    console.log('\n❓ Si quieres insertar de todos modos, elimina los existentes primero.');
    process.exit(0);
  }
  
  const dias = ['2026-02-03', '2026-02-04', '2026-02-05'];
  let insertados = 0;
  
  // Datos basados en la consola del usuario
  const datosBase = {
    region: 'Cibao Norte',
    provincia: 'Santiago',
    municipio: 'Santiago de los Caballeros',
    distrito: 'Centro',
    sector: 'Principal',
    tipoIntervencion: 'Limpieza de Cunetas',
    creadoPor: 'capel',
    usuarioId: 'capel'
  };
  
  for (const dia of dias) {
    try {
      const id = generarId();
      const numeroReporte = generarNumeroReporte();
      
      const reportData = {
        id: id,
        numeroReporte: numeroReporte,
        timestamp: new Date(dia + 'T12:00:00').toISOString(),
        fechaCreacion: new Date(dia + 'T12:00:00').toISOString(),
        fechaModificacion: new Date().toISOString(),
        ...datosBase,
        observaciones: `Reporte del proyecto multi-día - ${dia}`,
        metricData: {
          'longitud_metros': '500',
          'ancho_metros': '2'
        },
        gpsData: {},
        vehiculos: [
          { tipo: 'Camión', modelo: 'Volquete', ficha: 'V-001' },
          { tipo: 'Retroexcavadora', modelo: 'CAT 420', ficha: 'R-001' },
          { tipo: 'Pala Mecánica', modelo: 'Komatsu', ficha: 'P-001' },
          { tipo: 'Camión', modelo: 'Cisterna', ficha: 'C-001' },
          { tipo: 'Compactadora', modelo: 'Bomag', ficha: 'CO-001' }
        ],
        estado: 'completado',
        fechaProyecto: dia,
        esProyectoMultiDia: false,
        fechaInicio: '2026-02-03',
        fechaFinal: '2026-02-05',
        version: 1
      };
      
      console.log(`📝 Insertando reporte para ${dia}...`);
      
      const reportRef = doc(db, "reports", id);
      await setDoc(reportRef, reportData);
      
      console.log(`✅ ${numeroReporte} guardado para ${dia}`);
      insertados++;
      
    } catch (error) {
      console.error(`❌ Error en ${dia}:`, error.message);
    }
  }
  
  console.log(`\n🎉 COMPLETADO: ${insertados}/3 reportes insertados\n`);
  
  if (insertados === 3) {
    console.log('✅ Todos los reportes fueron guardados exitosamente.');
    console.log('📊 Ve a core-mopc.vercel.app → Reportes para verificarlos.');
  }
  
  process.exit(0);
}

insertarReportes().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
