import React, { useState, useEffect } from 'react';
import PendingReportsModal from './PendingReportsModal';
import { reportStorage, ReportData as FullReportData } from '../services/reportStorage';
import { firebaseReportStorage } from '../services/firebaseReportStorage';
import { pendingReportStorage } from '../services/pendingReportStorage';
import './ExportPage.css';
import { UserRole } from '../types/userRoles';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableCell, TableRow, WidthType, ImageRun, PageOrientation } from 'docx';
import { saveAs } from 'file-saver';

interface User {
  username: string;
  name: string;
  role?: UserRole;
}

interface ExportPageProps {
  user: User;
  onBack: () => void;
}

interface ReportData {
  reportNumber: string;
  title: string;
  date: string;
  province: string;
  status: string;
  description: string;
  createdBy: string; // Usuario que creó el reporte
}

const ExportPage: React.FC<ExportPageProps> = ({ user, onBack }) => {
  const [searchNumber, setSearchNumber] = useState('');
  const [searchResult, setSearchResult] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  // Estados para notificaciones
  const [pendingCount, setPendingCount] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Función para actualizar el contador de pendientes
  const updatePendingCount = () => {
    const pendientes = pendingReportStorage.getPendingCount();
    setPendingCount(pendientes);
  };

  // Función para obtener lista detallada de reportes pendientes
  const getPendingReports = () => {
    const pendingReports = pendingReportStorage.getAllPendingReports();
    return pendingReports.map(report => ({
      id: report.id,
      reportNumber: `DCR-${report.id.split('_').pop()?.slice(-6) || '000000'}`,
      timestamp: report.timestamp,
      estado: 'pendiente',
      region: report.formData.region || 'N/A',
      provincia: report.formData.provincia || 'N/A',
      municipio: report.formData.municipio || 'N/A',
      tipoIntervencion: report.formData.tipoIntervencion || 'No especificado'
    }));
  };

  const handleContinuePendingReport = (reportId: string) => {
    alert('Función de continuar reporte desde ExportPage - redirigir a formulario');
    setShowPendingModal(false);
  };

  const handleCancelPendingReport = (reportId: string) => {
    pendingReportStorage.deletePendingReport(reportId);
    updatePendingCount();
    setShowPendingModal(false);
    setTimeout(() => setShowPendingModal(true), 100);
  };

  // Actualizar contador al cargar y cada vez que cambie localStorage
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!searchNumber.trim()) return;

    setLoading(true);
    setNotFound(false);
    setSearchResult(null);

    try {
      // Buscar en Firebase
      const allReports = user.role === UserRole.TECNICO 
        ? await firebaseReportStorage.getUserReports(user.username)
        : await firebaseReportStorage.getAllReports();
      
      // Buscar por número de reporte
      const found = allReports.find(report => 
        report.numeroReporte.toLowerCase().includes(searchNumber.trim().toLowerCase())
      );
      
      if (found) {
        setSearchResult({
          reportNumber: found.numeroReporte,
          title: found.tipoIntervencion || 'Sin título',
          date: new Date(found.fechaCreacion).toLocaleDateString(),
          province: found.provincia || 'N/A',
          status: found.estado || 'Completado',
          description: `${found.tipoIntervencion || 'Intervención'} - ${found.municipio || ''}, ${found.provincia || ''}`,
          createdBy: found.creadoPor || 'Sistema'
        });
        setNotFound(false);
        console.log('✅ Reporte encontrado en Firebase:', found.numeroReporte);
      } else {
        setSearchResult(null);
        setNotFound(true);
        console.log('❌ Reporte no encontrado en Firebase:', searchNumber);
      }
    } catch (error) {
      console.error('Error en búsqueda de Firebase:', error);
      setSearchResult(null);
      setNotFound(true);
    }
    
    setLoading(false);
  };

  const handleDownloadPDF = async (report: ReportData) => {
    try {
      // Buscar el reporte completo en Firebase por número de reporte
      const allReports = await firebaseReportStorage.getAllReports();
      const fullReport = allReports.find(r => r.numeroReporte === report.reportNumber);
      
      if (!fullReport) {
        alert('No se pudo cargar el reporte completo desde Firebase');
        return;
      }

      await generateProfessionalPDF(fullReport, report);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const generateProfessionalPDF = async (fullReport: FullReportData, displayData: ReportData) => {
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

    // Datos Métricos
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
      
      // Mapeo de etiquetas y unidades para cada campo
      const fieldLabels: Record<string, { label: string; unit: string }> = {
        'punto_inicial': { label: 'Punto inicial de la intervención', unit: '' },
        'punto_alcanzado': { label: 'Punto alcanzado en la intervención', unit: '' },
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
        'suministro_extension_material': { label: 'Suministro y extensión de material', unit: 'm³' },
        'suministro_colocacion_grava': { label: 'Suministro y colocación de grava', unit: 'm³' },
        'nivelacion_compactacion_grava': { label: 'Nivelación y compactación de grava', unit: 'm²' },
        'reparacion_alcantarillas': { label: 'Reparación de alcantarillas existentes', unit: 'und' },
        'construccion_alcantarillas': { label: 'Construcción de alcantarillas', unit: 'und' },
        'limpieza_alcantarillas': { label: 'Limpieza de alcantarillas', unit: 'und' },
        'limpieza_cauces': { label: 'Limpieza de cauces y cañadas', unit: 'ml' },
        'obras_drenaje': { label: 'Obras de drenaje', unit: 'ml' },
        'construccion_terraplenes': { label: 'Construcción de terraplenes', unit: 'm³' },
        'relleno_compactacion': { label: 'Relleno y compactación de material', unit: 'm³' },
        'conformacion_taludes': { label: 'Conformación de taludes', unit: 'm²' }
      };
      
      Object.entries(fullReport.metricData).forEach(([key, value]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const fieldInfo = fieldLabels[key] || { 
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
          unit: '' 
        };
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${fieldInfo.label}:`, margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        const valueText = fieldInfo.unit ? `${value} ${fieldInfo.unit}` : String(value);
        doc.text(valueText, margin + 100, yPos);
        yPos += 6;
      });
      
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
    doc.save(`${fullReport.numeroReporte}_reporte.pdf`);
  };

  const handleDownloadExcel = async (report: ReportData) => {
    try {
      // Buscar el reporte completo en Firebase por número de reporte
      const allReports = await firebaseReportStorage.getAllReports();
      const fullReport = allReports.find(r => r.numeroReporte === report.reportNumber);
      
      if (!fullReport) {
        alert('No se pudo obtener la información completa del reporte desde Firebase');
        return;
      }
      
      await generateExcelContent(fullReport, report);
    } catch (error) {
      console.error('Error descargando Excel:', error);
      alert('Error al generar el archivo Excel');
    }
  };

  const handleDownloadWord = async (report: ReportData) => {
    try {
      // Buscar el reporte completo en Firebase por número de reporte
      const allReports = await firebaseReportStorage.getAllReports();
      const fullReport = allReports.find(r => r.numeroReporte === report.reportNumber);
      
      if (!fullReport) {
        alert('No se pudo obtener la información completa del reporte desde Firebase');
        return;
      }
      
      await generateWordContent(fullReport, report);
    } catch (error) {
      console.error('Error descargando Word:', error);
      alert('Error al generar el archivo Word');
    }
  };

  const generateExcelContent = async (fullReport: FullReportData, displayData: ReportData) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Intervención');
    
    // Configurar ancho de columnas más amplio
    worksheet.columns = [
      { width: 45 },
      { width: 45 }
    ];
    
    // Agregar logo en la parte superior izquierda
    try {
      const response = await fetch('/mopc-logo.png');
      const buffer = await response.arrayBuffer();
      const imageId = workbook.addImage({
        buffer: buffer,
        extension: 'png',
      });
      
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 150, height: 82.5 } // Proporción similar al PDF
      });
    } catch (error) {
      console.log('Logo no cargado en Excel');
    }
    
    // Título central - DIRECCIÓN DE COORDINACIÓN REGIONAL
    const titleRow = worksheet.getRow(2);
    titleRow.height = 20;
    worksheet.mergeCells('A2:B2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DIRECCIÓN DE COORDINACIÓN REGIONAL';
    titleCell.font = { bold: true, size: 11, color: { argb: 'FFFF7A00' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Subtítulo - Tipo de intervención
    const subtitleRow = worksheet.getRow(3);
    subtitleRow.height = 18;
    worksheet.mergeCells('A3:B3');
    const subtitleCell = worksheet.getCell('A3');
    subtitleCell.value = fullReport.tipoIntervencion || 'INTERVENCIÓN VIAL';
    subtitleCell.font = { bold: true, size: 10, color: { argb: 'FFFF7A00' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Cuadro de información (lado derecho simulado con celdas fusionadas)
    const infoStartRow = 1;
    
    // N° REPORTE
    const reportNumLabelRow = worksheet.getRow(infoStartRow);
    const reportNumLabel = reportNumLabelRow.getCell(2);
    reportNumLabel.value = 'N° REPORTE:';
    reportNumLabel.font = { bold: true, size: 9 };
    reportNumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    reportNumLabel.border = {
      top: { style: 'medium', color: { argb: 'FFFF7A00' } },
      left: { style: 'medium', color: { argb: 'FFFF7A00' } },
      right: { style: 'medium', color: { argb: 'FFFF7A00' } }
    };
    
    const reportNumValueRow = worksheet.getRow(infoStartRow + 1);
    const reportNumValue = reportNumValueRow.getCell(2);
    reportNumValue.value = fullReport.numeroReporte;
    reportNumValue.font = { bold: true, size: 9, color: { argb: 'FFFF7A00' } };
    reportNumValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    reportNumValue.border = {
      left: { style: 'medium', color: { argb: 'FFFF7A00' } },
      right: { style: 'medium', color: { argb: 'FFFF7A00' } }
    };
    
    // Usuario que lo creó (sin etiqueta "CREADO POR:")
    const createdByValueRow = worksheet.getRow(infoStartRow + 2);
    const createdByValue = createdByValueRow.getCell(2);
    createdByValue.value = fullReport.creadoPor || 'Sistema';
    createdByValue.font = { size: 8 };
    createdByValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    createdByValue.border = {
      left: { style: 'medium', color: { argb: 'FFFF7A00' } },
      right: { style: 'medium', color: { argb: 'FFFF7A00' } }
    };
    
    // FECHA y ESTADO en la misma fila
    const fechaEstadoRow = worksheet.getRow(infoStartRow + 3);
    const fechaCell = fechaEstadoRow.getCell(2);
    fechaCell.value = `FECHA: ${new Date(fullReport.fechaCreacion).toLocaleDateString('es-PY')}`;
    fechaCell.font = { bold: true, size: 8, color: { argb: 'FF666666' } };
    fechaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    fechaCell.border = {
      left: { style: 'medium', color: { argb: 'FFFF7A00' } },
      right: { style: 'medium', color: { argb: 'FFFF7A00' } }
    };
    
    // ESTADO
    const estadoRow = worksheet.getRow(infoStartRow + 4);
    const estadoCell = estadoRow.getCell(2);
    estadoCell.value = fullReport.estado.toUpperCase();
    estadoCell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    const estadoColor = fullReport.estado === 'completado' ? 'FF228B22' : 
                        fullReport.estado === 'pendiente' ? 'FFFF8C00' : 'FF808080';
    estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColor } };
    estadoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    estadoCell.border = {
      bottom: { style: 'medium', color: { argb: 'FFFF7A00' } },
      left: { style: 'medium', color: { argb: 'FFFF7A00' } },
      right: { style: 'medium', color: { argb: 'FFFF7A00' } }
    };
    
    // Línea separadora naranja
    const separatorRow = worksheet.getRow(7);
    separatorRow.height = 3;
    worksheet.mergeCells('A7:B7');
    const separatorCell = worksheet.getCell('A7');
    separatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7A00' } };
    
    let currentRow = 9;
    
    // Función auxiliar para agregar secciones con encabezado naranja
    const addSectionHeader = (title: string) => {
      const headerRow = worksheet.getRow(currentRow);
      headerRow.height = 20;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const headerCell = worksheet.getCell(`A${currentRow}`);
      headerCell.value = title;
      headerCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerCell.alignment = { horizontal: 'left', vertical: 'middle' };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7A00' } };
      currentRow++;
    };
    
    const addDataRow = (label: string, value: string, boldValue = false) => {
      const row = worksheet.getRow(currentRow);
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(2);
      
      labelCell.value = label;
      labelCell.font = { bold: true, size: 10 };
      
      valueCell.value = value;
      valueCell.font = boldValue ? { bold: true, size: 10 } : { size: 10 };
      
      currentRow++;
    };
    
    // Sección: Ubicación Geográfica
    addSectionHeader('UBICACIÓN GEOGRÁFICA');
    addDataRow('Región:', fullReport.region || 'N/A');
    addDataRow('Provincia:', fullReport.provincia || 'N/A');
    addDataRow('Municipio:', fullReport.municipio || 'N/A');
    addDataRow('Distrito:', fullReport.distrito || 'N/A');
    addDataRow('Sector:', fullReport.sector || 'N/A');
    currentRow++;
    
    // Sección: Datos de la Intervención
    addSectionHeader('DATOS DE LA INTERVENCIÓN');
    addDataRow('Tipo de Intervención:', fullReport.tipoIntervencion || 'N/A');
    if (fullReport.subTipoCanal) {
      addDataRow('Subtipo:', fullReport.subTipoCanal);
    }
    currentRow++;
    
    // Sección: Datos Métricos
    if (fullReport.metricData && Object.keys(fullReport.metricData).length > 0) {
      addSectionHeader('DATOS MÉTRICOS DE LA INTERVENCIÓN');
      
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
        'suministro_extension_material': { label: 'Suministro y extensión de material', unit: 'm³' },
        'suministro_colocacion_grava': { label: 'Suministro y colocación de grava', unit: 'm³' },
        'nivelacion_compactacion_grava': { label: 'Nivelación y compactación de grava', unit: 'm²' },
        'reparacion_alcantarillas': { label: 'Reparación de alcantarillas existentes', unit: 'und' },
        'construccion_alcantarillas': { label: 'Construcción de alcantarillas', unit: 'und' },
        'limpieza_alcantarillas': { label: 'Limpieza de alcantarillas', unit: 'und' },
        'limpieza_cauces': { label: 'Limpieza de cauces y cañadas', unit: 'ml' },
        'obras_drenaje': { label: 'Obras de drenaje', unit: 'ml' },
        'construccion_terraplenes': { label: 'Construcción de terraplenes', unit: 'm³' },
        'relleno_compactacion': { label: 'Relleno y compactación de material', unit: 'm³' },
        'conformacion_taludes': { label: 'Conformación de taludes', unit: 'm²' }
      };
      
      Object.entries(fullReport.metricData).forEach(([key, value]) => {
        const fieldInfo = fieldLabels[key] || { 
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
          unit: '' 
        };
        const valueText = fieldInfo.unit ? `${value} ${fieldInfo.unit}` : String(value);
        addDataRow(fieldInfo.label + ':', valueText);
      });
      
      currentRow++;
    }
    
    // Sección: Coordenadas GPS
    if (fullReport.gpsData && (fullReport.gpsData.punto_inicial || fullReport.gpsData.punto_alcanzado)) {
      addSectionHeader('COORDENADAS GPS');
      
      if (fullReport.gpsData.punto_inicial) {
        addDataRow('Punto Inicial:', `Lat: ${fullReport.gpsData.punto_inicial.lat}, Lon: ${fullReport.gpsData.punto_inicial.lon}`);
      }
      if (fullReport.gpsData.punto_alcanzado) {
        addDataRow('Punto Alcanzado:', `Lat: ${fullReport.gpsData.punto_alcanzado.lat}, Lon: ${fullReport.gpsData.punto_alcanzado.lon}`);
      }
      
      currentRow++;
    }
    
    // Sección: Observaciones
    if (fullReport.observaciones) {
      addSectionHeader('OBSERVACIONES');
      
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const obsCell = worksheet.getCell(`A${currentRow}`);
      obsCell.value = fullReport.observaciones;
      obsCell.font = { size: 9 };
      obsCell.alignment = { wrapText: true, vertical: 'top' };
      currentRow++;
    }
    
    // Generar y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fullReport.numeroReporte}_reporte.xlsx`);
  };

  const generateWordContent = async (fullReport: FullReportData, displayData: ReportData) => {
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
      'suministro_extension_material': { label: 'Suministro y extensión de material', unit: 'm³' },
      'suministro_colocacion_grava': { label: 'Suministro y colocación de grava', unit: 'm³' },
      'nivelacion_compactacion_grava': { label: 'Nivelación y compactación de grava', unit: 'm²' },
      'reparacion_alcantarillas': { label: 'Reparación de alcantarillas existentes', unit: 'und' },
      'construccion_alcantarillas': { label: 'Construcción de alcantarillas', unit: 'und' },
      'limpieza_alcantarillas': { label: 'Limpieza de alcantarillas', unit: 'und' },
      'limpieza_cauces': { label: 'Limpieza de cauces y cañadas', unit: 'ml' },
      'obras_drenaje': { label: 'Obras de drenaje', unit: 'ml' },
      'construccion_terraplenes': { label: 'Construcción de terraplenes', unit: 'm³' },
      'relleno_compactacion': { label: 'Relleno y compactación de material', unit: 'm³' },
      'conformacion_taludes': { label: 'Conformación de taludes', unit: 'm²' }
    };
    
    // Cargar logo
    let logoImage;
    try {
      const response = await fetch('/mopc-logo.png');
      const arrayBuffer = await response.arrayBuffer();
      logoImage = new Uint8Array(arrayBuffer);
    } catch (error) {
      console.log('Logo no cargado en Word');
    }
    
    const children: any[] = [];
    
    // Agregar logo al inicio del documento si está disponible
    if (logoImage) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoImage,
              transformation: {
                width: 150,
                height: 82.5
              },
              type: 'png'
            })
          ],
          spacing: { after: 300 }
        })
      );
    }
    
    // Encabezado - DIRECCIÓN DE COORDINACIÓN REGIONAL (centrado, naranja)
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
        spacing: { after: 200 }
      })
    );
    
    // Subtítulo - Tipo de intervención (centrado, naranja)
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
    
    // Información del reporte en tabla (ancho completo, formato vertical)
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
    
    // UBICACIÓN GEOGRÁFICA
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
    
    // DATOS DE LA INTERVENCIÓN
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
    
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: interventionRows
    }));
    
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
      
      const metricRows = Object.entries(fullReport.metricData).map(([key, value]) => {
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
    
    // COORDENADAS GPS
    if (fullReport.gpsData && (fullReport.gpsData.punto_inicial || fullReport.gpsData.punto_alcanzado)) {
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
          spacing: { before: 300, after: 100 }
        })
      );
      
      const gpsRows = [];
      if (fullReport.gpsData.punto_inicial) {
        gpsRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Punto Inicial:', bold: true, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Lat: ${fullReport.gpsData.punto_inicial.lat}, Lon: ${fullReport.gpsData.punto_inicial.lon}`, size: 18 })] })] })
            ]
          })
        );
      }
      if (fullReport.gpsData.punto_alcanzado) {
        gpsRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Punto Alcanzado:', bold: true, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Lat: ${fullReport.gpsData.punto_alcanzado.lat}, Lon: ${fullReport.gpsData.punto_alcanzado.lon}`, size: 18 })] })] })
            ]
          })
        );
      }
      
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: gpsRows
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
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fullReport.numeroReporte}_reporte.docx`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="export-page">
      {/* Topbar */}
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: 'white',
        color: '#2c3e50',
        padding: '12px 20px',
        marginBottom: '20px',
        borderRadius: '0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Volver
          </button>
          <div style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#dee2e6'
          }}></div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '18px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            📤 Exportar Reportes
          </h1>
        </div>
        {/* Ícono de notificaciones - posicionado a la derecha */}
        <div className="notification-container" style={{ position: 'relative', cursor: 'pointer' }}>
          <img 
            src="/images/notification-bell-icon.svg" 
            alt="Notificaciones" 
            style={{
              width: '24px', 
              height: '24px',
              filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              animation: pendingCount > 0 ? 'bellShake 0.5s ease-in-out infinite alternate' : 'none'
            }}
            onClick={() => setShowPendingModal(true)}
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
          {pendingCount > 0 && (
            <span 
              className="notification-badge"
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
          )}
        </div>
      </div>

      <div className="export-content">
        <div className="search-container">
          <div className="search-header">
            <h2 className="search-title">🔍 Buscar Reporte por Número</h2>
            <p className="search-description">
              Ingresa el número de reporte para buscar y descargar la plantilla en diferentes formatos
            </p>
          </div>

          <div className="search-box">
            <div className="search-input-container">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                className="search-input"
                placeholder="Ej: DCR-2025-001"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="search-button"
                onClick={handleSearch}
                disabled={loading || !searchNumber.trim()}
              >
                {loading ? '🔄 Buscando...' : '🔍 Buscar'}
              </button>
            </div>
          </div>

          {/* Ejemplos de números de reporte */}
          <div className="examples-container">
            <h3 className="examples-title">💡 Ejemplos de números de reporte:</h3>
            <div className="examples-grid">
              {(() => {
                // Obtener reportes reales según el rol del usuario
                const searchFilters = user.role === UserRole.TECNICO 
                  ? { creadoPor: user.username } 
                  : {};
                
                const availableReports = reportStorage.searchReports(searchFilters)
                  .slice(0, 3)
                  .map(report => ({
                    reportNumber: report.numeroReporte,
                    title: report.tipoIntervencion || 'Sin título'
                  }));
                
                return availableReports;
              })().map((report) => (
                <div 
                  key={report.reportNumber}
                  className="example-item"
                  onClick={() => setSearchNumber(report.reportNumber)}
                >
                  <span className="example-number">{report.reportNumber}</span>
                  <span className="example-title">{report.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resultado de búsqueda */}
        {searchResult && (
          <div className="result-container">
            <div className="result-header">
              <h3 className="result-title">✅ Reporte Encontrado</h3>
            </div>
            
            <div className="result-card">
              <div className="result-info">
                <div className="result-main">
                  <h4 className="result-number">{searchResult.reportNumber}</h4>
                  <h5 className="result-project-title">{searchResult.title}</h5>
                  <div className="result-details">
                    <span className="result-detail">📅 {searchResult.date}</span>
                    <span className="result-detail">📍 {searchResult.province}</span>
                    <span className={`result-status status-${searchResult.status.toLowerCase().replace(' ', '-')}`}>
                      {searchResult.status}
                    </span>
                  </div>
                  <p className="result-description">{searchResult.description}</p>
                </div>
              </div>

              <div className="download-options">
                <h4 className="download-title">📥 Descargar en formato:</h4>
                <div className="download-buttons">
                  <button 
                    className="download-btn pdf-btn"
                    onClick={() => handleDownloadPDF(searchResult)}
                  >
                    📄 PDF
                  </button>
                  <button 
                    className="download-btn excel-btn"
                    onClick={() => handleDownloadExcel(searchResult)}
                  >
                    📊 Excel
                  </button>
                  <button 
                    className="download-btn word-btn"
                    onClick={() => handleDownloadWord(searchResult)}
                  >
                    📝 Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No encontrado */}
        {notFound && (
          <div className="not-found-container">
            <div className="not-found-card">
              <div className="not-found-icon">❌</div>
              <h3 className="not-found-title">Reporte No Encontrado</h3>
              <p className="not-found-message">
                No se encontró ningún reporte con el número: <strong>{searchNumber}</strong>
              </p>
              <p className="not-found-suggestion">
                Verifica que el número esté escrito correctamente o intenta con uno de los ejemplos.
              </p>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="info-section">
          <div className="info-card">
            <h3 className="info-title">ℹ️ Información sobre los formatos</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon">📄</div>
                <div className="info-content">
                  <h4>PDF</h4>
                  <p>Formato ideal para visualización e impresión. No editable.</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📊</div>
                <div className="info-content">
                  <h4>Excel</h4>
                  <p>Formato de hoja de cálculo. Ideal para análisis de datos.</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📝</div>
                <div className="info-content">
                  <h4>Word</h4>
                  <p>Documento editable. Ideal para modificaciones y reportes.</p>
                </div>
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
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />
    </div>
  );
};

export default ExportPage;