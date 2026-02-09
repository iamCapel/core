// Script para verificar las fechas de los reportes
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://mopc-panel-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

async function checkReportDates() {
  try {
    console.log('\n🔍 Verificando fechas de reportes DCR-2026-000007 a DCR-2026-000010...\n');
    
    const snapshot = await db.collection('reports')
      .where('numeroReporte', '>=', 'DCR-2026-000007')
      .where('numeroReporte', '<=', 'DCR-2026-000010')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No se encontraron reportes');
      process.exit(0);
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📄 Reporte: ${data.numeroReporte}`);
      console.log(`   - fechaCreacion: ${data.fechaCreacion}`);
      console.log(`   - fechaProyecto: ${data.fechaProyecto || 'NO EXISTE'}`);
      console.log(`   - fechaInicio: ${data.fechaInicio || 'NO EXISTE'}`);
      console.log(`   - fechaFinal: ${data.fechaFinal || 'NO EXISTE'}`);
      console.log(`   - esProyectoMultiDia: ${data.esProyectoMultiDia || false}`);
      console.log(`   - diasTrabajo: ${data.diasTrabajo ? JSON.stringify(data.diasTrabajo) : 'NO EXISTE'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkReportDates();
