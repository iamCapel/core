import React from 'react';
import './ModernFormContainer.css';

interface ModernFormContainerProps {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export const ModernFormContainer: React.FC<ModernFormContainerProps> = ({
  title,
  subtitle,
  icon,
  children,
  className = ''
}) => {
  return (
    <div className={`modern-form-container ${className}`}>
      <div className="form-header">
        <div className="form-title-section">
          {icon && <div className="form-icon">{icon}</div>}
          <div className="form-text">
            <h2 className="form-title">{title}</h2>
            {subtitle && <p className="form-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="form-content">
        {children}
      </div>
    </div>
  );
};
