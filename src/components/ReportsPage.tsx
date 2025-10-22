import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts';
import './ReportsPage.css';

interface User {
  username: string;
  name: string;
}

interface ReportsPageProps {
  user: User;
  onBack: () => void;
}

interface ProvinceData {
  name: string;
  completed: number;
  pending: number;
  inProgress: number;
  total: number;
  icon: string;
}

interface RegionData {
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleData {
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8', '#82ca9d'];

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onBack }) => {
  const [provincesData, setProvincesData] = useState<ProvinceData[]>([]);
  const [regionCandleData, setRegionCandleData] = useState<CandleData[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'province-detail'>('overview');

  useEffect(() => {
    // Datos simulados de provincias del Paraguay
    const mockProvincesData: ProvinceData[] = [
      { name: 'Asunción', completed: 75, pending: 15, inProgress: 10, total: 100, icon: '🏛️' },
      { name: 'Central', completed: 120, pending: 30, inProgress: 25, total: 175, icon: '🌆' },
      { name: 'Alto Paraná', completed: 85, pending: 20, inProgress: 15, total: 120, icon: '🌊' },
      { name: 'Itapúa', completed: 65, pending: 18, inProgress: 12, total: 95, icon: '🌾' },
      { name: 'Ciudad del Este', completed: 90, pending: 22, inProgress: 18, total: 130, icon: '🏪' },
      { name: 'San Lorenzo', completed: 55, pending: 12, inProgress: 8, total: 75, icon: '🏫' },
      { name: 'Luque', completed: 70, pending: 16, inProgress: 14, total: 100, icon: '✈️' },
      { name: 'Capiatá', completed: 45, pending: 10, inProgress: 7, total: 62, icon: '🏘️' },
      { name: 'Lambaré', completed: 40, pending: 8, inProgress: 6, total: 54, icon: '🏡' },
      { name: 'Fernando de la Mora', completed: 60, pending: 14, inProgress: 11, total: 85, icon: '🏬' },
      { name: 'Limpio', completed: 35, pending: 7, inProgress: 5, total: 47, icon: '🌳' },
      { name: 'Ñemby', completed: 30, pending: 6, inProgress: 4, total: 40, icon: '🏞️' }
    ];

    setProvincesData(mockProvincesData);

    // Datos de velas por regiones
    const candleData: CandleData[] = [
      { name: 'Región Oriental', open: 100, high: 150, low: 80, close: 135, volume: 2400 },
      { name: 'Región Occidental', open: 80, high: 120, low: 60, close: 95, volume: 1800 },
      { name: 'Región Central', open: 120, high: 180, low: 100, close: 165, volume: 3200 },
      { name: 'Región Norte', open: 90, high: 140, low: 70, close: 125, volume: 2100 },
      { name: 'Región Sur', open: 110, high: 160, low: 85, close: 145, volume: 2800 },
      { name: 'Región Este', open: 95, high: 135, low: 75, close: 120, volume: 2300 }
    ];

    setRegionCandleData(candleData);
  }, []);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const renderUnifiedPieChart = () => {
    // Crear data para el gráfico unificado con todas las provincias
    const unifiedData = provincesData.map((province, index) => ({
      name: province.name,
      value: province.total,
      color: COLORS[index % COLORS.length],
      icon: province.icon,
      completed: province.completed,
      pending: province.pending,
      inProgress: province.inProgress
    }));

    const customTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="custom-tooltip">
            <p className="tooltip-title">{`${data.icon} ${data.name}`}</p>
            <p className="tooltip-total">{`Total: ${data.value} intervenciones`}</p>
            <p className="tooltip-detail" style={{ color: '#00C49F' }}>
              {`Completados: ${data.completed}`}
            </p>
            <p className="tooltip-detail" style={{ color: '#FFBB28' }}>
              {`Pendientes: ${data.pending}`}
            </p>
            <p className="tooltip-detail" style={{ color: '#FF8042' }}>
              {`En Progreso: ${data.inProgress}`}
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="unified-chart-container">
        <div className="unified-chart">
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={unifiedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={200}
                fill="#8884d8"
                dataKey="value"
              >
                {unifiedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="unified-legend">
          {unifiedData.map((entry, index) => (
            <div key={index} className="unified-legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="legend-text">
                {entry.icon} {entry.name}: {entry.value} intervenciones
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProvincePieChart = (province: ProvinceData) => {
    const data = [
      { name: 'Completados', value: province.completed, color: '#00C49F' },
      { name: 'Pendientes', value: province.pending, color: '#FFBB28' },
      { name: 'En Progreso', value: province.inProgress, color: '#FF8042' }
    ];

    return (
      <div key={province.name} className="province-chart-container">
        <div className="province-header">
          <span className="province-icon">{province.icon}</span>
          <h3 className="province-name">{province.name}</h3>
          <span className="province-total">Total: {province.total}</span>
        </div>
        <div className="province-chart">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [value, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="province-legend">
          {data.map((entry, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="legend-text">{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 className="page-title">
            📊 Informes y Estadísticas por Provincias
          </h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="welcome-text">Bienvenido, {user.name}</span>
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="reports-content">
        <div className="overview-content">
          {/* Gráfico de Pastel Unificado por Provincias */}
          <div className="section-header">
            <h2 className="section-title">📈 Estadísticas Consolidadas por Provincia</h2>
            <p className="section-description">
              Distribución total de intervenciones entre todas las provincias
            </p>
          </div>

          {renderUnifiedPieChart()}

          {/* Gráfico de Velas por Regiones */}
          <div className="section-header">
            <h2 className="section-title">📊 Análisis de Tendencias por Región</h2>
            <p className="section-description">
              Gráfico de velas mostrando el rendimiento de intervenciones por región
            </p>
          </div>

          <div className="trading-chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={regionCandleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#666"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    typeof value === 'number' ? value.toFixed(2) : value, 
                    name
                  ]}
                  labelStyle={{ color: '#333' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="volume" fill="#8884d8" opacity={0.3} yAxisId="volume" />
                <Bar dataKey="open" fill="#00C49F" />
                <Bar dataKey="high" fill="#FFBB28" />
                <Bar dataKey="low" fill="#FF8042" />
                <Bar dataKey="close" fill="#0088FE" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend-horizontal">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#00C49F' }}></div>
              <span>Apertura</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFBB28' }}></div>
              <span>Máximo</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF8042' }}></div>
              <span>Mínimo</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#0088FE' }}></div>
              <span>Cierre</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#8884d8', opacity: 0.3 }}></div>
              <span>Volumen</span>
            </div>
          </div>

          {/* Resumen Estadístico */}
          <div className="summary-stats">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <h3>Total Intervenciones</h3>
                  <p className="stat-value">
                    {provincesData.reduce((sum, province) => sum + province.total, 0)}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>Completadas</h3>
                  <p className="stat-value">
                    {provincesData.reduce((sum, province) => sum + province.completed, 0)}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <h3>En Progreso</h3>
                  <p className="stat-value">
                    {provincesData.reduce((sum, province) => sum + province.inProgress, 0)}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <h3>Pendientes</h3>
                  <p className="stat-value">
                    {provincesData.reduce((sum, province) => sum + province.pending, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;