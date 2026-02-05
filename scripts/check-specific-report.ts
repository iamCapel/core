import { db } from '../src/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkReport() {
  const reportNumber = 'DCR-2026-000007';
  
  console.log(`🔍 Buscando reporte: ${reportNumber}`);
  
  try {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, where('numeroReporte', '==', reportNumber));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ No se encontró el reporte');
      return;
    }
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('\n✅ Reporte encontrado:');
      console.log('📋 ID del documento:', doc.id);
      console.log('📝 Número de reporte:', data.numeroReporte);
      console.log('📅 Fecha:', data.timestamp);
      console.log('👤 Creado por:', data.creadoPor);
      console.log('\n📸 Estructura de imágenes:');
      
      if (data.imagesPerDay) {
        console.log('✅ Campo imagesPerDay existe');
        console.log('📊 Contenido de imagesPerDay:');
        console.log(JSON.stringify(data.imagesPerDay, null, 2));
        
        const totalFotos = Object.values(data.imagesPerDay)
          .flat()
          .filter((item: any) => item && item.url).length;
        console.log(`\n📸 Total de fotos: ${totalFotos}`);
        
        Object.entries(data.imagesPerDay).forEach(([dayKey, images]: [string, any]) => {
          console.log(`\n  📅 ${dayKey}: ${images?.length || 0} foto(s)`);
          if (images && Array.isArray(images)) {
            images.forEach((img: any, idx: number) => {
              console.log(`    ${idx + 1}. URL: ${img.url?.substring(0, 80)}...`);
              console.log(`       Timestamp: ${img.timestamp}`);
            });
          }
        });
      } else if (data.images && Array.isArray(data.images)) {
        console.log('⚠️ Usando campo "images" (legacy)');
        console.log(`📸 Total de fotos: ${data.images.length}`);
        data.images.forEach((img: any, idx: number) => {
          console.log(`  ${idx + 1}. ${img.substring(0, 80)}...`);
        });
      } else {
        console.log('❌ NO hay campo imagesPerDay ni images');
      }
      
      console.log('\n📦 Campos completos del reporte:');
      console.log(Object.keys(data).join(', '));
    });
    
  } catch (error) {
    console.error('❌ Error al buscar reporte:', error);
  }
}

checkReport().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
