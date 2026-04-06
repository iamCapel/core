import React, { useState, useEffect, useRef } from 'react';
import './ModernSelect.css';

export interface ModernSelectOption {
  value: string;
  label: string;
  special?: boolean;
  icon?: string;
  description?: string;
}

interface ModernSelectProps {
  id: string;
  icon: string;
  hint: string;
  placeholder: string;
  value: string;
  options: ModernSelectOption[];
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  className?: string;
}

export const ModernSelect: React.FC<ModernSelectProps> = ({
  id, icon, hint, placeholder, value, options,
  disabled = false, required = false, onChange, className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredOptions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const closeModal = () => {
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  return (
    <div
      ref={wrapRef}
      className={`modern-select-mobile ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onKeyDown={handleKeyDown}
    >
      <div className="modern-select-trigger" onClick={() => !disabled && setIsOpen(!isOpen)}>
        <div className="modern-select-icon">{icon}</div>
        <div className="modern-select-content">
          <div className="modern-select-label">
            {hint}
            {required && <span className="required">*</span>}
          </div>
          <div className="modern-select-value">
            {selectedOption ? (
              <div className="selected-option">
                {selectedOption.icon && !selectedOption.special && (
                  <span className="option-icon">{selectedOption.icon}</span>
                )}
                <span className="option-text">{selectedOption.label}</span>
                {selectedOption.description && (
                  <span className="option-description">{selectedOption.description}</span>
                )}
              </div>
            ) : (
              <span className="placeholder">{placeholder}</span>
            )}
          </div>
        </div>
        <div className="modern-select-actions">
          {value && !disabled && (
            <button
              type="button"
              className="clear-button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              aria-label="Limpiar selección"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
          <div className="dropdown-arrow">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Modal Fullscreen */}
      {isOpen && (
        <div className="modern-select-modal show">
          <div className="modern-select-modal-content">
            {/* Header */}
            <div className="modern-select-modal-header">
              <h3 className="modern-select-modal-title">
                <span className="title-icon">{icon}</span>
                {hint}
              </h3>
              <button 
                type="button" 
                className="modern-select-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {/* Search */}
              <div className="modern-select-modal-search">
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar opción..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                className="modern-select-search-input"
              />
            </div>

            {/* Options */}
            <div className="modern-select-options">
              {filteredOptions.length === 0 ? (
                <div className="no-options">
                  <span>No se encontraron opciones</span>
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`modern-select-option ${
                      value === option.value ? 'selected' : ''
                    } ${option.special ? 'special' : ''} ${
                      highlightedIndex === index ? 'highlighted' : ''
                    }`}
                    onClick={() => selectOption(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {!option.special && option.icon && <span className="option-icon">{option.icon}</span>}
                    <div className="option-content">
                      <span className="option-text">{option.label}</span>
                      {option.description && (
                        <span className="option-description">{option.description}</span>
                      )}
                    </div>
                    {value === option.value && (
                      <span className="option-check">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="modern-select-modal-footer">
              <button 
                type="button" 
                className="modern-select-modal-button cancel"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="modern-select-modal-button confirm"
                onClick={closeModal}
              >
                Aceptar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
