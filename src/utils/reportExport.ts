import firebaseReportStorage from '../services/firebaseReportStorage';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableCell, TableRow, WidthType, ImageRun, PageOrientation } from 'docx';

// utility types (replicate minimal needed)
export interface ReportData {
  reportNumber: string;
  title: string;
  date: string;
  province: string;
  status: string;
  description: string;
  createdBy: string;
}

export type FullReportData = any; // actual type defined elsewhere

async function loadFullReport(reportNumber: string) {
  const allReports = await firebaseReportStorage.getAllReports();
  const fullReport = allReports.find(r => r.numeroReporte === reportNumber);
  if (!fullReport) throw new Error('Full report not found');

  // images are not used for now; skip loading to speed up export

  return fullReport;
}

// all the generation functions copied from ExportPage (simplified for brevity)

export async function exportReport(displayReport: ReportData, format: 'excel' | 'pdf' | 'word') {
  try {
    const fullReport = await loadFullReport(displayReport.reportNumber);

    switch (format) {
      case 'excel':
        await generateExcelContent(fullReport, displayReport);
        break;
      case 'pdf':
        await generateProfessionalPDF(fullReport, displayReport);
        break;
      case 'word':
        await generateWordContent(fullReport, displayReport);
        break;
      default:
        throw new Error('Unsupported format');
    }
  } catch (err) {
    console.error('Error exporting report', err);
    throw err;
  }
}

// stub implementations: (for brevity, we will copy relevant code segments from ExportPage)

async function generateProfessionalPDF(fullReport: FullReportData, displayData: ReportData) {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Encabezado blanco con logo
  doc.setFillColor(255, 255, 255); // Blanco
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Cargar y agregar logo (lado izquierdo superior - reducido 45% vertical)
  try {
    const logoImg = new Image();
    logoImg.src = '/mopc-logo.png';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve; // Continuar si falla
    });
    if (logoImg.complete) {
      doc.addImage(logoImg, 'PNG', margin, 12, 30, 16.5); // Altura reducida a 45% (de 30 a 16.5)
    }
  } catch (error) {
    console.log('Logo no cargado, continuando sin logo');
  }

  // Información del reporte - Lado derecho del encabezado (aumentado 40% - 48% * 1.40 = 67.2% del original)
  const infoBoxWidth = 47; // 33.6 * 1.40 = 47.04
  const infoBoxHeight = 23.5; // 16.8 * 1.40 = 23.52
  const infoBoxX = pageWidth - margin - infoBoxWidth;
  const infoBoxY = 8;

  // Calcular posición del título - movido 7.5% hacia la izquierda
  const titleCenterX = infoBoxX * 0.7; // 77.5% - 7.5% = 70% del espacio a la izquierda

  // Nombre de la dirección (movido a la izquierda - reducido)
  doc.setTextColor(255, 122, 0); // Naranja para el texto
  doc.setFontSize(11); // Reducido de 14 a 11
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN DE COORDINACIÓN REGIONAL', titleCenterX, 20, { align: 'center' });

  // Tipo de intervención
  doc.setFontSize(10); // Reducido de 12 a 10
  doc.setFont('helvetica', 'bold');
  doc.text(fullReport.tipoIntervencion || 'INTERVENCIÓN VIAL', titleCenterX, 30, { align: 'center' });

  doc.setFillColor(255, 255, 255); // Fondo blanco
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'F');
  doc.setDrawColor(255, 122, 0);
  doc.setLineWidth(0.7);
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'S');

  // Número de reporte
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5.9); // 4.2 * 1.40 = 5.88
  doc.setFont('helvetica', 'bold');
  doc.text('N° REPORTE:', infoBoxX + 2.1, infoBoxY + 4.2);
  doc.setTextColor(255, 122, 0);
  doc.setFontSize(5.9);
  doc.setFont('helvetica', 'bold');
  const reportNumLines = doc.splitTextToSize(fullReport.numeroReporte, infoBoxWidth - 4.2);
  doc.text(reportNumLines, infoBoxX + 2.1, infoBoxY + 7.6);

  // Usuario que lo creó
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5); // 3.6 * 1.40 = 5.04
  doc.setFont('helvetica', 'bold');
  doc.text('CREADO POR:', infoBoxX + 2.1, infoBoxY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const userName = fullReport.creadoPor || 'Sistema';
  const userLines = doc.splitTextToSize(userName, infoBoxWidth - 4.2);
  doc.text(userLines, infoBoxX + 2.1, infoBoxY + 15.4);

  // Fecha de creación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 100, 100);
  doc.text('FECHA:', infoBoxX + 2.1, infoBoxY + 19.5);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(fullReport.fechaCreacion).toLocaleDateString('es-PY'), infoBoxX + 13.4, infoBoxY + 19.5);

  // Estado del reporte (badge pequeño)
  const estadoColor = fullReport.estado === 'completado' ? [34, 139, 34] : 
                      fullReport.estado === 'pendiente' ? [255, 140, 0] : [128, 128, 128];
  doc.setFillColor(estadoColor[0], estadoColor[1], estadoColor[2]);
  doc.roundedRect(infoBoxX + 23.5, infoBoxY + 21.6, 20.2, 4.8, 0.8, 0.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.2); // 3 * 1.40 = 4.2
  doc.setFont('helvetica', 'bold');
  doc.text(fullReport.estado.toUpperCase(), infoBoxX + 33.6, infoBoxY + 24.2, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Línea separadora naranja debajo del encabezado
  doc.setDrawColor(255, 122, 0);
  doc.setLineWidth(2);
  doc.line(0, 50, pageWidth, 50);

  yPos = 55;

  yPos += 5;

  // Sección de Ubicación
  doc.setFillColor(255, 122, 0); // Naranja
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('UBICACIÓN GEOGRÁFICA', margin + 3, yPos + 5);
  
  yPos += 13;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Región:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(fullReport.region || 'N/A', margin + 30, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Provincia:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(fullReport.provincia || 'N/A', margin + 30, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Municipio:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(fullReport.municipio || 'N/A', margin + 30, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Distrito:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(fullReport.distrito || 'N/A', margin + 30, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Sector:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(fullReport.sector || 'N/A', margin + 30, yPos);
  
  yPos += 15;

  // Sección de Intervención
  doc.setFillColor(255, 122, 0); // Naranja
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA INTERVENCIÓN', margin + 3, yPos + 5);
  
  yPos += 13;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Intervención:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(fullReport.tipoIntervencion || 'N/A', margin + 50, yPos);
  
  if (fullReport.subTipoCanal) {
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Subtipo:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.subTipoCanal, margin + 50, yPos);
  }
  
  yPos += 15;

  // Datos métricos
  if (fullReport.metricData && Object.keys(fullReport.metricData).length > 0) {
    doc.setFillColor(255, 122, 0); // Naranja
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS MÉTRICOS DE LA INTERVENCIÓN', margin + 3, yPos + 5);
    
    yPos += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    for (const [key, value] of Object.entries(fullReport.metricData)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const unit = '';
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value) + (unit ? ` ${unit}` : ''), margin + 100, yPos);
      yPos += 6;
    }
    
    yPos += 10;
  }

  // Datos GPS
  if (fullReport.gpsData && (fullReport.gpsData.punto_inicial || fullReport.gpsData.punto_alcanzado)) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(255, 122, 0); // Naranja
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COORDENADAS GPS', margin + 3, yPos + 5);
    
    yPos += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    if (fullReport.gpsData.punto_inicial) {
      doc.setFont('helvetica', 'bold');
      doc.text('Punto Inicial:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lat: ${fullReport.gpsData.punto_inicial.lat}, Lon: ${fullReport.gpsData.punto_inicial.lon}`, margin + 35, yPos);
      yPos += 6;
    }
    
    if (fullReport.gpsData.punto_alcanzado) {
      doc.setFont('helvetica', 'bold');
      doc.text('Punto Alcanzado:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lat: ${fullReport.gpsData.punto_alcanzado.lat}, Lon: ${fullReport.gpsData.punto_alcanzado.lon}`, margin + 35, yPos);
      yPos += 6;
    }
    
    yPos += 10;
  }

  // Observaciones
  if (fullReport.observaciones) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(255, 122, 0); // Naranja
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES', margin + 3, yPos + 5);
    
    yPos += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(fullReport.observaciones, contentWidth - 10);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin + 5, yPos);
      yPos += 5;
    });
    
    yPos += 10;
  }

  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Línea decorativa naranja
    doc.setDrawColor(255, 122, 0);
    doc.setLineWidth(1);
    doc.line(margin, 280, pageWidth - margin, 280);
    
    // Información del pie
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')} ${new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`, margin, 285);
    doc.text(`Técnico: ${fullReport.creadoPor}`, margin, 290);
    
    // Número de página en naranja
    doc.setTextColor(255, 122, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pág. ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  // Descargar el PDF
  doc.save(`${displayData.reportNumber}.pdf`);
}

async function generateExcelContent(fullReport: FullReportData, displayData: ReportData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Intervención');
  // replicates earlier logic; stub minimal
  await workbook.xlsx.writeBuffer().then(buffer => saveAs(new Blob([buffer]), `${displayData.reportNumber}.xlsx`));
}

async function generateWordContent(fullReport: FullReportData, displayData: ReportData) {
  const doc = new Document({ sections: [] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${displayData.reportNumber}.docx`);
}

