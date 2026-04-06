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

// Mapeo de etiquetas de campos con sus unidades (igual que en el PDF)
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

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('No se pudo cargar imagen para PDF:', url, error);
    return null;
  }
}

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

async function renderReportToPdf(doc: jsPDF, fullReport: FullReportData) {
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }) => {
    if (options?.color) doc.setTextColor(...options.color);
    if (options?.fontSize) doc.setFontSize(options.fontSize);
    doc.setFont('helvetica', options?.fontStyle || 'normal');
    doc.text(text, x, y, { align: options?.align || 'left' });
    if (options?.color) doc.setTextColor(0, 0, 0);
  };

  const addLine = (x1: number, y1: number, x2: number, y2: number, options?: { color?: [number, number, number]; width?: number }) => {
    if (options?.color) doc.setDrawColor(...options.color);
    if (options?.width) doc.setLineWidth(options.width);
    doc.line(x1, y1, x2, y2);
    if (options?.color) doc.setDrawColor(0, 0, 0);
    if (options?.width) doc.setLineWidth(0.2);
  };

  const ensurePageSpace = (height: number) => {
    if (yPos + height > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Encabezado (compacto para no tapar el título de la actividad)
  const headerHeight = 55;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  try {
    const logoImg = new Image();
    logoImg.src = '/mopc-logo.png';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
    });
    if (logoImg.complete) {
      doc.addImage(logoImg, 'PNG', margin, 12, 30, 16.5);
    }
  } catch (error) {
    console.log('Logo no cargado, continuando sin logo');
  }

  const infoBoxWidth = 47;
  const infoBoxHeight = 23.5;
  const infoBoxX = pageWidth - margin - infoBoxWidth;
  const infoBoxY = 12;
  const titleCenterX = pageWidth / 2;

  addText('DIRECCIÓN DE COORDINACIÓN REGIONAL', titleCenterX, 34, { fontSize: 14, fontStyle: 'bold', color: [255, 122, 0], align: 'center' });
  addText(fullReport.tipoIntervencion || 'INTERVENCIÓN VIAL', titleCenterX, 46, { fontSize: 12, fontStyle: 'bold', align: 'center' });

  doc.setFillColor(255, 255, 255);
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'F');
  doc.setDrawColor(255, 122, 0);
  doc.setLineWidth(0.7);
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'S');

  addText('N° REPORTE:', infoBoxX + 2.1, infoBoxY + 4.2, { fontSize: 5.9, fontStyle: 'bold' });
  addText(fullReport.numeroReporte || '', infoBoxX + 2.1, infoBoxY + 7.6, { fontSize: 5.9, fontStyle: 'bold', color: [255, 122, 0] });

  addText('CREADO POR:', infoBoxX + 2.1, infoBoxY + 12, { fontSize: 5, fontStyle: 'bold' });
  addText(fullReport.creadoPor || 'Sistema', infoBoxX + 2.1, infoBoxY + 15.4, { fontSize: 5 });

  addText('FECHA:', infoBoxX + 2.1, infoBoxY + 19.5, { fontSize: 5, fontStyle: 'bold', color: [100, 100, 100] });
  addText(new Date(fullReport.fechaCreacion || '').toLocaleDateString('es-PY'), infoBoxX + 13.4, infoBoxY + 19.5, { fontSize: 5 });

  const estadoColor = fullReport.estado === 'completado' ? [34, 139, 34] : fullReport.estado === 'pendiente' ? [255, 140, 0] : [128, 128, 128];
  doc.setFillColor(estadoColor[0], estadoColor[1], estadoColor[2]);
  doc.roundedRect(infoBoxX + 23.5, infoBoxY + 21.6, 20.2, 4.8, 0.8, 0.8, 'F');
  addText((fullReport.estado || '').toUpperCase(), infoBoxX + 33.6, infoBoxY + 24.2, { fontSize: 4.2, fontStyle: 'bold', color: [255, 255, 255], align: 'center' });

  addLine(0, 50, pageWidth, 50, { color: [255, 122, 0], width: 2 });

  yPos = 60;
  yPos += 5;

  // Ubicación
  ensurePageSpace(60);
  doc.setFillColor(255, 122, 0);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  addText('UBICACIÓN GEOGRÁFICA', margin + 3, yPos + 5, { fontSize: 11, fontStyle: 'bold', color: [255, 122, 0] });
  yPos += 13;

  const ubicacionItems: Array<[string, string]> = [
    ['Región:', fullReport.region || 'N/A'],
    ['Provincia:', fullReport.provincia || 'N/A'],
    ['Municipio:', fullReport.municipio || 'N/A'],
    ['Distrito:', fullReport.distrito || 'N/A'],
    ['Sector:', fullReport.sector || 'N/A']
  ];

  ubicacionItems.forEach(([label, value]) => {
    addText(label, margin + 5, yPos, { fontSize: 9, fontStyle: 'bold' });
    addText(value, margin + 40, yPos, { fontSize: 9 });
    yPos += 5.5;
  });

  yPos += 6;

  // Detalles de intervención
  if (fullReport.metricData && Object.keys(fullReport.metricData).length > 0) {
    ensurePageSpace(60);
    doc.setFillColor(255, 122, 0);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    addText('DETALLES DE INTERVENCIÓN', margin + 3, yPos + 5, { fontSize: 11, fontStyle: 'bold', color: [255, 122, 0] });
    yPos += 13;

    Object.entries(fullReport.metricData)
      .filter(([key]) => key !== 'punto_inicial' && key !== 'punto_alcanzado')
      .forEach(([key, value]) => {
        const fieldInfo = fieldLabels[key];
        const label = fieldInfo ? fieldInfo.label : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const displayValue = fieldInfo?.unit ? `${value} ${fieldInfo.unit}` : `${value}`;

        addText(`${label}:`, margin + 5, yPos, { fontSize: 9, fontStyle: 'bold' });
        addText(displayValue, margin + 60, yPos, { fontSize: 9 });
        yPos += 5.5;

        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }
      });

    yPos += 6;
  }


  // Observaciones
  if (fullReport.observaciones) {
    ensurePageSpace(40);
    doc.setFillColor(255, 122, 0);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    addText('OBSERVACIONES', margin + 3, yPos + 5, { fontSize: 11, fontStyle: 'bold', color: [255, 122, 0] });
    yPos += 12;

    const obsLines = doc.splitTextToSize(fullReport.observaciones, contentWidth - 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(obsLines, margin + 3, yPos);
    yPos += obsLines.length * 5.5;
  }

  // Fotos (limitar a 4 para evitar PDF gigante)
  const allImages: string[] = [];
  if (fullReport.imagesPerDay) {
    Object.values(fullReport.imagesPerDay).forEach((imgs: any) => {
      if (Array.isArray(imgs)) {
        imgs.forEach((img: any) => {
          if (img?.url) allImages.push(img.url);
        });
      }
    });
  }
  if (fullReport.images) {
    fullReport.images.forEach((img: any) => {
      if (img) allImages.push(img);
    });
  }

  const imagesToAdd = allImages.slice(0, 4);
  if (imagesToAdd.length > 0) {
    ensurePageSpace(80);
    addText('📸 EVIDENCIA FOTOGRÁFICA', margin, yPos, { fontSize: 11, fontStyle: 'bold', color: [255, 122, 0] });
    yPos += 10;

    const imageSize = 60;
    const gap = 8;
    let x = margin;

    for (const imageUrl of imagesToAdd) {
      const dataUrl = await urlToDataUrl(imageUrl);
      if (!dataUrl) continue;

      if (x + imageSize > pageWidth - margin) {
        x = margin;
        yPos += imageSize + gap;
        if (yPos + imageSize > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      }

      try {
        doc.addImage(dataUrl, 'JPEG', x, yPos, imageSize, imageSize);
      } catch (error) {
        // Si no se puede agregar la imagen, la ignoramos
      }
      x += imageSize + gap;
    }

    yPos += imageSize + 10;
  }

  // Footer
  ensurePageSpace(20);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Generado por MOPC - Sistema de reportes', margin, pageHeight - 12);
}

async function generateProfessionalPDF(fullReport: FullReportData, displayData: ReportData) {
  const doc = new jsPDF();
  await renderReportToPdf(doc, fullReport);
  const fileName = `reporte_${fullReport.numeroReporte || displayData.reportNumber}.pdf`;
  doc.save(fileName);
}

export async function exportReportsAsPdf(reports: FullReportData[]) {
  if (!reports || reports.length === 0) return;

  const doc = new jsPDF();
  for (let i = 0; i < reports.length; i++) {
    if (i > 0) doc.addPage();
    await renderReportToPdf(doc, reports[i]);
  }
  const fileName = `reportes_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

async function generateExcelContent(fullReport: FullReportData, displayData: ReportData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Intervención');
  // replicates earlier logic; stub minimal
  await workbook.xlsx.writeBuffer().then(buffer => saveAs(new Blob([buffer]), `${displayData.reportNumber}.xlsx`));
}

async function generateWordContent(fullReport: FullReportData, displayData: ReportData) {
  // Build a Word document with the same style used in the old ExportPage,
  // but now also handle multi‑day reports according to the reference image.
  const fieldLabels: Record<string, { label: string; unit: string }> = {
    'longitud_intervencion': { label: 'Longitud de intervención', unit: 'km' },
    'limpieza_superficie': { label: 'Limpieza de superficie', unit: 'm³' },
    'perfilado_superficie': { label: 'Perfilado de superficie', unit: 'm³' },
    'compactado_superficie': { label: 'Compactado de superficie', unit: 'm³' },
    'conformacion_cunetas': { label: 'Conformación de cunetas', unit: 'ml' },
    'extraccion_bote_material': { label: 'Extracción y bote de material inservible', unit: 'm³' },
    'escarificacion_superficies': { label: 'Escarificación de superficies', unit: 'm³' },
    'conformacion_plataforma': { label: 'Conformación de plataforma', unit: 'm³' },
    'zafra_material': { label: 'Zafra de material', unit: 'm³' },
    'motonivelacion_superficie': { label: 'Motonivelación de superficie', unit: 'm³' },
    'suministro_extension_material': { label: 'Suministro y extensión de material', unit: 'm³' },
    'suministro_colocacion_grava': { label: 'Suministro y colocación de grava', unit: 'm³' },
    'nivelacion_compactacion_grava': { label: 'Nivelación y compactación de grava', unit: 'm³' },
    'reparacion_alcantarillas': { label: 'Reparación de alcantarillas existentes', unit: 'und' },
    'construccion_alcantarillas': { label: 'Construcción de alcantarillas', unit: 'und' },
    'limpieza_alcantarillas': { label: 'Limpieza de alcantarillas', unit: 'und' },
    'limpieza_cauces': { label: 'Limpieza de cauces y cañadas', unit: 'ml' },
    'obras_drenaje': { label: 'Obras de drenaje', unit: 'ml' },
    'construccion_terraplenes': { label: 'Construcción de terraplenes', unit: 'm³' },
    'relleno_compactacion': { label: 'Relleno y compactación de material', unit: 'm³' },
    'conformacion_taludes': { label: 'Conformación de taludes', unit: 'm³' }
  };

  // Load logo image bytes if possible
  let logoImage: Uint8Array | undefined;
  try {
    const response = await fetch('/mopc-logo.png');
    const arrayBuffer = await response.arrayBuffer();
    logoImage = new Uint8Array(arrayBuffer);
  } catch (error) {
    console.log('Logo no cargado en Word');
  }

  const children: any[] = [];

  if (logoImage) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoImage,
            transformation: { width: 150, height: 82.5 },
            type: 'png'
          })
        ],
        spacing: { after: 300 }
      })
    );
  }

  // Main header and document title
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
    })
  );

  // Add the formal form title just below the header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'FORMULARIO DE INFORME DE TRABAJOS REALIZADOS',
          bold: true,
          size: 20,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // Subtitle: type of intervention
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fullReport.tipoIntervencion || 'INTERVENCIÓN VIAL',
          bold: true,
          size: 24,
          color: 'FF7A00'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  // If multi‑day, show date range text under the subtitle
  if (fullReport.esProyectoMultiDia) {
    const start = fullReport.fechaInicio || '';
    const end = fullReport.fechaFinal || '';
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `INFORME DE LOS TRABAJOS EJECUTADOS CORRESPONDIENTE A LA FECHA ${start} AL ${end}`,
            bold: true,
            size: 22
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    );
  }

  // Provincia / distrito info immediately after the date line
  children.push(
    new Paragraph({
      text: `Provincia: ${fullReport.provincia || 'N/A'}`,
      spacing: { after: 100 }
    })
  );
  children.push(
    new Paragraph({
      text: `Distrito Municipal: ${fullReport.distrito || 'N/A'}   Tipo de intervenciones: ${fullReport.tipoIntervencion || 'N/A'}`,
      spacing: { after: 200 }
    })
  );

  // Report information table (number, created by, etc.)
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'N° REPORTE:', bold: true, size: 22 })] })],
              width: { size: 40, type: WidthType.PERCENTAGE },
              shading: { fill: 'FFE5CC' }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: fullReport.numeroReporte, bold: true, size: 22, color: 'FF7A00' })] })],
              width: { size: 60, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'CREADO POR:', bold: true, size: 22 })] })],
              shading: { fill: 'FFE5CC' }
            }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.creadoPor || 'Sistema', size: 22 })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'FECHA:', bold: true, size: 22 })] })],
              shading: { fill: 'FFE5CC' }
            }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: new Date(fullReport.fechaCreacion).toLocaleDateString('es-PY'), size: 22 })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'ESTADO:', bold: true, size: 22 })] })],
              shading: { fill: 'FFE5CC' }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: fullReport.estado.toUpperCase(), bold: true, size: 22, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER
              })],
              shading: {
                fill: fullReport.estado === 'completado' ? '228B22' :
                      fullReport.estado === 'pendiente' ? 'FF8C00' : '808080'
              }
            })
          ]
        })
      ]
    })
  );

  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

  // UBICACIÓN GEOGRÁFICA section
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '  UBICACIÓN GEOGRÁFICA',
          bold: true,
          size: 24,
          color: 'FFFFFF'
        })
      ],
      shading: { fill: 'FF7A00' },
      spacing: { before: 200, after: 100 }
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Región:', bold: true, size: 22 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.region || 'N/A', size: 22 })] })], width: { size: 70, type: WidthType.PERCENTAGE } })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Provincia:', bold: true, size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.provincia || 'N/A', size: 22 })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Municipio:', bold: true, size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.municipio || 'N/A', size: 22 })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Distrito:', bold: true, size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.distrito || 'N/A', size: 22 })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sector:', bold: true, size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.sector || 'N/A', size: 22 })] })] })
          ]
        })
      ]
    })
  );

  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

  // DATOS DE LA INTERVENCIÓN section
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '  DATOS DE LA INTERVENCIÓN',
          bold: true,
          size: 24,
          color: 'FFFFFF'
        })
      ],
      shading: { fill: 'FF7A00' },
      spacing: { before: 200, after: 100 }
    })
  );

  const interventionRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tipo de Intervención:', bold: true, size: 22 })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.tipoIntervencion || 'N/A', size: 22 })] })], width: { size: 60, type: WidthType.PERCENTAGE } })
      ]
    })
  ];

  if (fullReport.subTipoCanal) {
    interventionRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Subtipo:', bold: true, size: 22 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullReport.subTipoCanal, size: 22 })] })] })
        ]
      })
    );
  }

  children.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: interventionRows })
  );

  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

  // DATOS MÉTRICOS
  if (fullReport.metricData && Object.keys(fullReport.metricData).length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'DATOS MÉTRICOS DE LA INTERVENCIÓN',
            bold: true,
            size: 22,
            color: 'FFFFFF'
          })
        ],
        shading: { fill: 'FF7A00' },
        spacing: { before: 300, after: 100 }
      })
    );
    
    const metricRows = Object.entries(fullReport.metricData!).map(([key, value]) => {
      const fieldInfo = fieldLabels[key] || { 
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
        unit: '' 
      };
      const valueText = fieldInfo.unit ? `${value} ${fieldInfo.unit}` : String(value);
      
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fieldInfo.label + ':', bold: true, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: valueText, size: 18 })] })] })
        ]
      });
    });
    
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metricRows
    }));
  }
  
  
  // OBSERVACIONES
  if (fullReport.observaciones) {
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
        spacing: { before: 300, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: fullReport.observaciones, size: 18 })
        ],
        spacing: { after: 200 }
      })
    );
  }

  // If multi‑day, append detailed list of daily activities
  if (fullReport.esProyectoMultiDia && fullReport.reportesPorDia) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'DETALLE ANEXO DE LOS TRABAJOS EJECUTADOS:',
            bold: true,
            size: 22
          })
        ],
        spacing: { before: 300, after: 100 }
      })
    );

    const dayEntries = Object.entries(fullReport.reportesPorDia as Record<string, any>).sort(([a], [b]) => a.localeCompare(b));
    dayEntries.forEach(([date, dayData], idx) => {
      const obs = (dayData as any).observaciones || '';
      const tipo = (dayData as any).tipoIntervencion || '';
      const text = `Día ${idx + 1} (${date}): ${obs || tipo}`;
      children.push(
        new Paragraph({
          text,
          bullet: { level: 0 },
          spacing: { after: 50 }
        })
      );
    });
  }

  // final document assembly
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
      children
    }] 
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fullReport.numeroReporte}_reporte.docx`);
}

