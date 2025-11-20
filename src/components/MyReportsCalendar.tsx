import React, { useState, useEffect, useCallback } from 'react';
import { reportStorage } from '../services/reportStorage';
import './MyReportsCalendar.css';

interface MyReportsCalendarProps {
  username: string;
  onClose: () => void;
}

interface ReportByDate {
  date: string;
  reports: {
    id: string;
    numeroReporte: string;
    tipoIntervencion: string;
    provincia: string;
    municipio: string;
    timestamp: string;
    estado: string;
  }[];
}

const MyReportsCalendar: React.FC<MyReportsCalendarProps> = ({ username, onClose }) => {
  const [reportsByDate, setReportsByDate] = useState<ReportByDate[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    today: 0
  });

  const loadUserReports = useCallback(() => {
    // Obtener todos los reportes del usuario
    const allReports = reportStorage.getAllReports();
    const userReports = allReports.filter(report => report.creadoPor === username);

    // Agrupar por fecha
    const reportsByDateMap = new Map<string, any[]>();
    
    userReports.forEach(report => {
      const date = new Date(report.fechaCreacion).toISOString().split('T')[0];
      if (!reportsByDateMap.has(date)) {
        reportsByDateMap.set(date, []);
      }
      reportsByDateMap.get(date)!.push({
        id: report.id,
        numeroReporte: report.numeroReporte,
        tipoIntervencion: report.tipoIntervencion,
        provincia: report.provincia,
        municipio: report.municipio,
        timestamp: report.fechaCreacion,
        estado: report.estado || 'Completado'
      });
    });

    // Convertir a array y ordenar por fecha descendente
    const reportsArray: ReportByDate[] = Array.from(reportsByDateMap.entries())
      .map(([date, reports]) => ({ date, reports }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setReportsByDate(reportsArray);

    // Calcular estadísticas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const thisMonthReports = userReports.filter(r => new Date(r.fechaCreacion) >= startOfMonth);
    const thisWeekReports = userReports.filter(r => new Date(r.fechaCreacion) >= startOfWeek);
    const todayReports = userReports.filter(r => new Date(r.fechaCreacion) >= startOfDay);

    setStats({
      total: userReports.length,
      thisMonth: thisMonthReports.length,
      thisWeek: thisWeekReports.length,
      today: todayReports.length
    });
  }, [username]);

  useEffect(() => {
    loadUserReports();
  }, [loadUserReports]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Agregar días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Agregar días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getReportsForDate = (day: number) => {
    const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayReports = reportsByDate.find(r => r.date === dateStr);
    return dayReports?.reports || [];
  };

  const hasReportsOnDate = (day: number) => {
    return getReportsForDate(day).length > 0;
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const selectedDateReports = selectedDate ? reportsByDate.find(r => r.date === selectedDate)?.reports || [] : [];

  return (
    <div className="my-reports-calendar">
      {/* Estadísticas */}
      <div className="reports-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.thisMonth}</div>
            <div className="stat-label">Este mes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📆</div>
          <div className="stat-info">
            <div className="stat-value">{stats.thisWeek}</div>
            <div className="stat-label">Esta semana</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="stat-value">{stats.today}</div>
            <div className="stat-label">Hoy</div>
          </div>
        </div>
      </div>

      {/* Controles de vista */}
      <div className="view-controls">
        <button 
          className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 Calendario
        </button>
        <button 
          className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📝 Lista
        </button>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendario */}
          <div className="calendar-header">
            <button className="calendar-nav-btn" onClick={previousMonth}>←</button>
            <h3 className="calendar-title">
              {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
            </h3>
            <button className="calendar-nav-btn" onClick={nextMonth}>→</button>
          </div>

          <div className="calendar-grid">
            {/* Nombres de días */}
            {dayNames.map(day => (
              <div key={day} className="calendar-day-name">{day}</div>
            ))}

            {/* Días del mes */}
            {getDaysInMonth(selectedMonth).map((day, index) => {
              const hasReports = day ? hasReportsOnDate(day) : false;
              const reportsCount = day ? getReportsForDate(day).length : 0;
              const isToday = day && 
                new Date().getDate() === day && 
                new Date().getMonth() === selectedMonth.getMonth() &&
                new Date().getFullYear() === selectedMonth.getFullYear();
              
              return (
                <div 
                  key={index} 
                  className={`calendar-day ${!day ? 'empty' : ''} ${hasReports ? 'has-reports' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => day && hasReports && handleDateClick(day)}
                  style={{ cursor: hasReports ? 'pointer' : 'default' }}
                >
                  {day && (
                    <>
                      <div className="day-number">{day}</div>
                      {hasReports && (
                        <div className="reports-indicator">
                          <span className="reports-count">{reportsCount}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detalle de reportes del día seleccionado */}
          {selectedDate && selectedDateReports.length > 0 && (
            <div className="selected-date-reports">
              <h4 className="selected-date-title">
                📋 Reportes del {new Date(selectedDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              <div className="reports-list">
                {selectedDateReports.map(report => (
                  <div key={report.id} className="report-item">
                    <div className="report-header">
                      <span className="report-number">{report.numeroReporte}</span>
                      <span className={`report-status ${report.estado.toLowerCase().replace(' ', '-')}`}>
                        {report.estado}
                      </span>
                    </div>
                    <div className="report-details">
                      <div className="report-type">{report.tipoIntervencion}</div>
                      <div className="report-location">📍 {report.municipio}, {report.provincia}</div>
                      <div className="report-time">
                        🕒 {new Date(report.timestamp).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="close-details-btn" onClick={() => setSelectedDate(null)}>
                Cerrar
              </button>
            </div>
          )}
        </>
      ) : (
        /* Vista de lista */
        <div className="reports-list-view">
          {reportsByDate.length > 0 ? (
            reportsByDate.map(({ date, reports }) => (
              <div key={date} className="date-group">
                <h4 className="date-group-title">
                  {new Date(date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  <span className="date-count">({reports.length})</span>
                </h4>
                <div className="reports-list">
                  {reports.map(report => (
                    <div key={report.id} className="report-item">
                      <div className="report-header">
                        <span className="report-number">{report.numeroReporte}</span>
                        <span className={`report-status ${report.estado.toLowerCase().replace(' ', '-')}`}>
                          {report.estado}
                        </span>
                      </div>
                      <div className="report-details">
                        <div className="report-type">{report.tipoIntervencion}</div>
                        <div className="report-location">📍 {report.municipio}, {report.provincia}</div>
                        <div className="report-time">
                          🕒 {new Date(report.timestamp).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="no-reports">
              <div className="no-reports-icon">📭</div>
              <p>No has registrado reportes aún</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyReportsCalendar;
