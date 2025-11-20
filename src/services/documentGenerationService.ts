import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableCell, TableRow, WidthType, ImageRun, PageOrientation } from 'docx';
import { ReportData } from './reportStorage';

// Mapeo de etiquetas de campos con sus unidades
const fieldLabels: Record<string, { label: string; unit: string }> = {
  'longitud_intervencion': { label: 'Longitud de intervención', unit: 'km' },
  'limpieza_superficie': { label: 'Limpieza de superficie', unit: 'm²' },
  'perfilado_superficie': { label: 'Perfilado de superficie', unit: 'm²' },
  'compactado_superficie': { label: 'Compactado de superficie', unit: 'm²' },
  'conformacion_cunetas': { label: 'Conformación de cunetas', unit: 'ml' },
  'extraccion_bote_material': { label: 'Extracción y bote de material inservible', unit: 'm³' },
  'escarificacion_superficies': { label: 'Escarificación de superficies', unit: 'm²' },
  'conformacion_plataforma': { label: 'Conformación de plataforma', unit: 'm²' },
  'zafra_material': { label: 'Zafra de material', unit: 'm³' },
  'motonivelacion_superficie': { label: 'Motonivelación de superficie', unit: 'm²' },
  'escarpe_talud': { label: 'Escarpe de talud', unit: 'm²' },
  'limpieza_alcantarillas': { label: 'Limpieza de alcantarillas', unit: 'und' },
  'desmalezado_arbustos': { label: 'Desmalezado de arbustos', unit: 'm²' },
  'corte_poda_arboles': { label: 'Corte y poda de árboles', unit: 'und' },
  'escarificado_plataforma': { label: 'Escarificado de plataforma', unit: 'm²' },
  'tapada_baches': { label: 'Tapada de baches', unit: 'm³' },
  'reposicion_tuberias': { label: 'Reposición de tuberías', unit: 'und' },
  'trabajos_especiales': { label: 'Trabajos especiales', unit: '' },
  'cantidad_material_colocado': { label: 'Cantidad de material colocado', unit: 'm³' },
  'camino_inicio': { label: 'Camino inicio', unit: '' },
  'camino_termino': { label: 'Camino término', unit: '' },
  'apertura_zanjas': { label: 'Apertura de zanjas', unit: 'ml' },
  'mano_obra': { label: 'Mano de obra', unit: '' }
};

/**
 * Genera un documento PDF profesional con el logo de MOPC
 * @param reportData Datos completos del reporte
 * @returns Blob del PDF generado
 */
export async function generatePDFBlob(reportData: ReportData): Promise<Blob> {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Encabezado blanco con logo
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Cargar y agregar logo
  try {
    const logoImg = new Image();
    logoImg.src = '/mopc-logo.png';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });
    if (logoImg.complete) {
      doc.addImage(logoImg, 'PNG', margin, 12, 30, 16.5);
    }
  } catch (error) {
    console.log('Logo no cargado, continuando sin logo');
  }
  
  // Información del reporte - Lado derecho del encabezado
  const infoBoxWidth = 47;
  const infoBoxHeight = 23.5;
  const infoBoxX = pageWidth - margin - infoBoxWidth;
  const infoBoxY = 8;
  
  const titleCenterX = infoBoxX * 0.7;
  
  // Nombre de la dirección
  doc.setTextColor(255, 122, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN DE COORDINACIÓN REGIONAL', titleCenterX, 20, { align: 'center' });
  
  // Tipo de intervención
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(reportData.tipoIntervencion || 'INTERVENCIÓN VIAL', titleCenterX, 30, { align: 'center' });
  
  doc.setFillColor(255, 255, 255);
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'F');
  doc.setDrawColor(255, 122, 0);
  doc.setLineWidth(0.7);
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'S');
  
  // Número de reporte
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5.9);
  doc.setFont('helvetica', 'bold');
  doc.text('N° REPORTE:', infoBoxX + 2.1, infoBoxY + 4.2);
  doc.setTextColor(255, 122, 0);
  doc.setFontSize(5.9);
  doc.setFont('helvetica', 'bold');
  const reportNumLines = doc.splitTextToSize(reportData.numeroReporte, infoBoxWidth - 4.2);
  doc.text(reportNumLines, infoBoxX + 2.1, infoBoxY + 7.6);
  
  // Usuario que lo creó
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('CREADO POR:', infoBoxX + 2.1, infoBoxY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const userName = reportData.creadoPor || 'Sistema';
  const userLines = doc.splitTextToSize(userName, infoBoxWidth - 4.2);
  doc.text(userLines, infoBoxX + 2.1, infoBoxY + 15.4);
  
  // Fecha de creación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 100, 100);
  doc.text('FECHA:', infoBoxX + 2.1, infoBoxY + 19.5);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(reportData.fechaCreacion).toLocaleDateString('es-PY'), infoBoxX + 13.4, infoBoxY + 19.5);

  yPos = 55;

  // Sección de Ubicación
  doc.setFillColor(255, 122, 0);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('UBICACIÓN', margin + 3, yPos + 5.5);
  yPos += 12;

  // Tabla de ubicación
  const ubicacionData = [
    ['Región:', reportData.region || ''],
    ['Provincia:', reportData.provincia || ''],
    ['Municipio:', reportData.municipio || ''],
    ['Distrito:', reportData.distrito || ''],
    ['Sector:', reportData.sector || '']
  ];

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  ubicacionData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 3, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Sección de Detalles de Intervención
  doc.setFillColor(255, 122, 0);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DE INTERVENCIÓN', margin + 3, yPos + 5.5);
  yPos += 12;

  // Tabla de detalles con etiquetas y unidades de medida
  const metricData = reportData.metricData || {};
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  Object.keys(metricData).forEach((key) => {
    const value = metricData[key];
    if (value !== undefined && value !== null && value !== '' && 
        key !== 'punto_inicial' && key !== 'punto_alcanzado') {
      
      const fieldInfo = fieldLabels[key];
      if (fieldInfo) {
        // Mostrar etiqueta descriptiva
        doc.setFont('helvetica', 'bold');
        doc.text(`${fieldInfo.label}:`, margin + 3, yPos);
        
        // Mostrar valor con unidad
        doc.setFont('helvetica', 'normal');
        const displayValue = fieldInfo.unit 
          ? `${value} ${fieldInfo.unit}`
          : value.toString();
        doc.text(displayValue, margin + 80, yPos);
      } else {
        // Para campos sin etiqueta definida, mostrar el key formateado
        doc.setFont('helvetica', 'bold');
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.text(`${formattedKey}:`, margin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value.toString(), margin + 80, yPos);
      }
      
      yPos += 6;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    }
  });

  // GPS Data
  if (reportData.gpsData) {
    yPos += 5;
    doc.setFillColor(255, 122, 0);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('COORDENADAS GPS', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    if (reportData.gpsData.punto_inicial) {
      doc.setFont('helvetica', 'bold');
      doc.text('Punto Inicial:', margin + 3, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lat: ${reportData.gpsData.punto_inicial.lat}, Lon: ${reportData.gpsData.punto_inicial.lon}`, 
               margin + 35, yPos);
      yPos += 6;
    }

    if (reportData.gpsData.punto_alcanzado) {
      doc.setFont('helvetica', 'bold');
      doc.text('Punto Alcanzado:', margin + 3, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lat: ${reportData.gpsData.punto_alcanzado.lat}, Lon: ${reportData.gpsData.punto_alcanzado.lon}`, 
               margin + 35, yPos);
      yPos += 6;
    }
  }

  // Observaciones
  if (reportData.observaciones) {
    yPos += 5;
    doc.setFillColor(255, 122, 0);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const obsLines = doc.splitTextToSize(reportData.observaciones, contentWidth - 6);
    doc.text(obsLines, margin + 3, yPos);
    yPos += obsLines.length * 6;
  }

  // Pie de página
  const totalPages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Pág. ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  // Convertir a Blob
  return doc.output('blob');
}

/**
 * Genera un archivo Excel profesional con el logo de MOPC
 * @param reportData Datos completos del reporte
 * @returns Blob del Excel generado
 */
export async function generateExcelBlob(reportData: ReportData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Intervención');

  // Cargar logo
  let logoId: number | undefined;
  try {
    const response = await fetch('/mopc-logo.png');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    logoId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });
  } catch (error) {
    console.log('No se pudo cargar el logo');
  }

  let currentRow = 1;

  // Agregar logo si se cargó
  if (logoId !== undefined) {
    worksheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 120, height: 66 }
    });
    currentRow = 5;
  }

  // Título
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = 'DIRECCIÓN DE COORDINACIÓN REGIONAL';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFF7A00' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow++;

  // Subtítulo
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = reportData.tipoIntervencion || 'INTERVENCIÓN VIAL';
  subtitleCell.font = { bold: true, size: 12 };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 2;

  // Información del reporte con borde
  worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
  let infoCell = worksheet.getCell(`E${currentRow}`);
  infoCell.value = `N° REPORTE: ${reportData.numeroReporte}`;
  infoCell.font = { bold: true, size: 10 };
  infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
  infoCell.border = { top: { style: 'medium', color: { argb: 'FFFF7A00' } }, left: { style: 'medium', color: { argb: 'FFFF7A00' } }, right: { style: 'medium', color: { argb: 'FFFF7A00' } } };
  currentRow++;

  worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
  infoCell = worksheet.getCell(`E${currentRow}`);
  infoCell.value = reportData.creadoPor || 'Sistema';
  infoCell.font = { size: 9 };
  infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
  infoCell.border = { left: { style: 'medium', color: { argb: 'FFFF7A00' } }, right: { style: 'medium', color: { argb: 'FFFF7A00' } } };
  currentRow++;

  worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
  infoCell = worksheet.getCell(`E${currentRow}`);
  infoCell.value = `FECHA: ${new Date(reportData.fechaCreacion).toLocaleDateString('es-PY')}`;
  infoCell.font = { size: 9, color: { argb: 'FF666666' } };
  infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
  infoCell.border = { bottom: { style: 'medium', color: { argb: 'FFFF7A00' } }, left: { style: 'medium', color: { argb: 'FFFF7A00' } }, right: { style: 'medium', color: { argb: 'FFFF7A00' } } };
  currentRow += 2;

  // Encabezado de ubicación
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const locationHeader = worksheet.getCell(`A${currentRow}`);
  locationHeader.value = 'UBICACIÓN';
  locationHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  locationHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7A00' } };
  locationHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  currentRow++;

  // Datos de ubicación
  const ubicacionData = [
    ['Región:', reportData.region || ''],
    ['Provincia:', reportData.provincia || ''],
    ['Municipio:', reportData.municipio || ''],
    ['Distrito:', reportData.distrito || ''],
    ['Sector:', reportData.sector || '']
  ];

  ubicacionData.forEach(([label, value]) => {
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const labelCell = worksheet.getCell(`A${currentRow}`);
    labelCell.value = label;
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
    const valueCell = worksheet.getCell(`C${currentRow}`);
    valueCell.value = value;
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;
  });

  currentRow++;

  // Encabezado de detalles
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const detailsHeader = worksheet.getCell(`A${currentRow}`);
  detailsHeader.value = 'DETALLES DE INTERVENCIÓN';
  detailsHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  detailsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7A00' } };
  detailsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  currentRow++;

  // Datos de métricas
  const metricData = reportData.metricData || {};
  Object.keys(metricData).forEach((key) => {
    const value = metricData[key];
    if (value !== undefined && value !== null && value !== '' && 
        key !== 'punto_inicial' && key !== 'punto_alcanzado') {
      
      const fieldInfo = fieldLabels[key];
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = fieldInfo ? fieldInfo.label : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      labelCell.font = { bold: true };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.mergeCells(`D${currentRow}:F${currentRow}`);
      const valueCell = worksheet.getCell(`D${currentRow}`);
      valueCell.value = fieldInfo && fieldInfo.unit ? `${value} ${fieldInfo.unit}` : value;
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      currentRow++;
    }
  });

  // GPS
  if (reportData.gpsData) {
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const gpsHeader = worksheet.getCell(`A${currentRow}`);
    gpsHeader.value = 'COORDENADAS GPS';
    gpsHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    gpsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7A00' } };
    gpsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    if (reportData.gpsData.punto_inicial) {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = 'Punto Inicial:';
      labelCell.font = { bold: true };

      worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
      const valueCell = worksheet.getCell(`C${currentRow}`);
      valueCell.value = `Lat: ${reportData.gpsData.punto_inicial.lat}, Lon: ${reportData.gpsData.punto_inicial.lon}`;
      currentRow++;
    }

    if (reportData.gpsData.punto_alcanzado) {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = 'Punto Alcanzado:';
      labelCell.font = { bold: true };

      worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
      const valueCell = worksheet.getCell(`C${currentRow}`);
      valueCell.value = `Lat: ${reportData.gpsData.punto_alcanzado.lat}, Lon: ${reportData.gpsData.punto_alcanzado.lon}`;
      currentRow++;
    }
  }

  // Observaciones
  if (reportData.observaciones) {
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const obsHeader = worksheet.getCell(`A${currentRow}`);
    obsHeader.value = 'OBSERVACIONES';
    obsHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    obsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7A00' } };
    obsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const obsCell = worksheet.getCell(`A${currentRow}`);
    obsCell.value = reportData.observaciones;
    obsCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    currentRow++;
  }

  // Ajustar anchos de columna
  worksheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Genera un documento Word profesional con el logo de MOPC
 * @param reportData Datos completos del reporte
 * @returns Blob del Word generado
 */
export async function generateWordBlob(reportData: ReportData): Promise<Blob> {
  // Cargar logo
  let logoBuffer: Uint8Array | undefined;
  try {
    const response = await fetch('/mopc-logo.png');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    logoBuffer = new Uint8Array(arrayBuffer);
  } catch (error) {
    console.log('No se pudo cargar el logo');
  }

  const children: any[] = [];

  // Agregar logo si se cargó
  if (logoBuffer) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: {
              width: 150,
              height: 83
            },
            type: 'png'
          })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 }
      })
    );
  }

  // Título
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'DIRECCIÓN DE COORDINACIÓN REGIONAL',
          bold: true,
          size: 28,
          color: 'FF7A00'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: reportData.tipoIntervencion || 'INTERVENCIÓN VIAL',
          bold: true,
          size: 24
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  // Información del reporte
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: 'single', size: 20, color: 'FF7A00' },
        bottom: { style: 'single', size: 20, color: 'FF7A00' },
        left: { style: 'single', size: 20, color: 'FF7A00' },
        right: { style: 'single', size: 20, color: 'FF7A00' },
        insideHorizontal: { style: 'single', size: 10, color: 'FF7A00' },
        insideVertical: { style: 'none' }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: `N° REPORTE: ${reportData.numeroReporte}`, bold: true })] 
              })],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: reportData.creadoPor || 'Sistema' })] 
              })],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `FECHA: ${new Date(reportData.fechaCreacion).toLocaleDateString('es-PY')}`,
                  color: '666666'
                })] 
              })],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ],
      margins: {
        top: 100,
        bottom: 100,
        left: 100,
        right: 100
      }
    }),
    new Paragraph({ text: '', spacing: { after: 200 } })
  );

  // Sección de Ubicación
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'UBICACIÓN',
          bold: true,
          size: 22,
          color: 'FFFFFF'
        })
      ],
      shading: { fill: 'FF7A00' },
      spacing: { after: 100 }
    })
  );

  const ubicacionData = [
    ['Región:', reportData.region || ''],
    ['Provincia:', reportData.provincia || ''],
    ['Municipio:', reportData.municipio || ''],
    ['Distrito:', reportData.distrito || ''],
    ['Sector:', reportData.sector || '']
  ];

  const ubicacionRows = ubicacionData.map(([label, value]) => 
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value })] })],
          width: { size: 70, type: WidthType.PERCENTAGE }
        })
      ]
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: ubicacionRows
    }),
    new Paragraph({ text: '', spacing: { after: 200 } })
  );

  // Sección de Detalles
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'DETALLES DE INTERVENCIÓN',
          bold: true,
          size: 22,
          color: 'FFFFFF'
        })
      ],
      shading: { fill: 'FF7A00' },
      spacing: { after: 100 }
    })
  );

  const metricData = reportData.metricData || {};
  const detallesRows: TableRow[] = [];

  Object.keys(metricData).forEach((key) => {
    const value = metricData[key];
    if (value !== undefined && value !== null && value !== '' && 
        key !== 'punto_inicial' && key !== 'punto_alcanzado') {
      
      const fieldInfo = fieldLabels[key];
      const label = fieldInfo ? fieldInfo.label : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayValue = fieldInfo && fieldInfo.unit ? `${value} ${fieldInfo.unit}` : value.toString();

      detallesRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
              width: { size: 50, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: displayValue })] })],
              width: { size: 50, type: WidthType.PERCENTAGE }
            })
          ]
        })
      );
    }
  });

  if (detallesRows.length > 0) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: detallesRows
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );
  }

  // GPS
  if (reportData.gpsData) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'COORDENADAS GPS',
            bold: true,
            size: 22,
            color: 'FFFFFF'
          })
        ],
        shading: { fill: 'FF7A00' },
        spacing: { after: 100 }
      })
    );

    const gpsRows: TableRow[] = [];

    if (reportData.gpsData.punto_inicial) {
      gpsRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Punto Inicial:', bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `Lat: ${reportData.gpsData.punto_inicial.lat}, Lon: ${reportData.gpsData.punto_inicial.lon}` 
                })] 
              })],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        })
      );
    }

    if (reportData.gpsData.punto_alcanzado) {
      gpsRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Punto Alcanzado:', bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `Lat: ${reportData.gpsData.punto_alcanzado.lat}, Lon: ${reportData.gpsData.punto_alcanzado.lon}` 
                })] 
              })],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        })
      );
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: gpsRows
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );
  }

  // Observaciones
  if (reportData.observaciones) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'OBSERVACIONES',
            bold: true,
            size: 22,
            color: 'FFFFFF'
          })
        ],
        shading: { fill: 'FF7A00' },
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: reportData.observaciones })],
        spacing: { after: 200 }
      })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.PORTRAIT
          }
        }
      },
      children: children
    }]
  });
  
  return await Packer.toBlob(doc);
}
