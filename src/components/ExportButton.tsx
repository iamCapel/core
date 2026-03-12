import React from 'react';
import { exportReport } from '../utils/reportExport';

interface ExportButtonProps {
  selectedReport?: any;
  onExport?: (format: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ selectedReport, onExport }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastText, setToastText] = React.useState('');
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleMenu = () => {
    if (loading) return;
    setMenuOpen((open) => !open);
  };

  const pick = async (
    label: string,
    format: string,
    ext: string,
    color?: string
  ) => {
    setMenuOpen(false);
    if (!selectedReport) {
      alert('No hay un reporte seleccionado para exportar');
      return;
    }

    setLoading(true);

    // simulate the button animation duration and perform export
    setTimeout(async () => {
      try {
        console.log(`📁 Exportando a ${format}...`);
        await exportReport(selectedReport, format as any);
        if (onExport) onExport(format);
      } catch (err) {
        console.error('Error durante exportación', err);
        alert('Fallo en la exportación. Revise la consola.');
      }

      setLoading(false);
      setToastText(
        `Descargando ${label} ` +
          `<span style="opacity:.4;font-weight:400;margin-left:4px">${ext}</span>`
      );
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    }, 1600);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn-export" id="mainBtn" onClick={toggleMenu}>
        <div className="shimmer"></div>
        {loading ? (
          <div className="spinner" id="btnIcon" />
        ) : (
          <span className="btn-icon" id="btnIcon">
            📤
          </span>
        )}
        <span id="btnLabel">{loading ? 'Exportando…' : 'Exportar'}</span>
        <span
          className="caret"
          id="caret"
          style={{ display: loading ? 'none' : 'inline-block' }}
        >
          ▼
        </span>
      </button>

      <div className={`menu ${menuOpen ? 'open' : ''}`} id="menu">
        <button
          className="opt"
          onClick={() => pick('Excel', 'excel', '.xlsx', '#16a34a')}
        >
          <span className="opt-ico">
            {/* svg icon copied from original markup */}
            <svg width="34" height="34" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill="#16a34a" />
              <path
                d="M7 9l5 7-5 7M25 9l-5 7 5 7"
                stroke="white"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1="13"
                y1="16"
                x2="19"
                y2="16"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span style={{ color: '#16a34a' }}>Excel</span>
          <span className="opt-ext">.xlsx</span>
        </button>

        <div className="divider" />

        <button
          className="opt"
          onClick={() => pick('Word', 'word', '.docx', '#1d4ed8')}
        >
          <span className="opt-ico">
            <svg width="34" height="34" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill="#1d4ed8" />
              <path
                d="M5 10l3.5 12L12 14l3.5 8L19 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span style={{ color: '#1d4ed8' }}>Word</span>
          <span className="opt-ext">.docx</span>
        </button>

        <div className="divider" />

        <button
          className="opt"
          onClick={() => pick('PDF', 'pdf', '.pdf', '#dc2626')}
        >
          <span className="opt-ico">
            <svg width="34" height="34" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill="#dc2626" />
              <text
                x="4"
                y="22"
                fontSize="13"
                fontWeight="900"
                fill="white"
                fontFamily="Arial,sans-serif"
              >
                PDF
              </text>
            </svg>
          </span>
          <span style={{ color: '#dc2626' }}>PDF</span>
          <span className="opt-ext">.pdf</span>
        </button>
      </div>

      <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast">
        <div className="check">✓</div>
        <span
          id="toastText"
          dangerouslySetInnerHTML={{ __html: toastText }}
        ></span>
      </div>
    </div>
  );
};

export default ExportButton;
