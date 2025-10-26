"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';

interface ToggleStatusProps {
  id: string;
  isActive: boolean;
  onToggle: (id: string, newStatus: boolean) => Promise<void>;
  entityName?: string; // Para personalizar el tooltip
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showConfirmation?: boolean;
}

export default function ToggleStatus({
  id,
  isActive,
  onToggle,
  entityName = 'elemento',
  disabled = false,
  size = 'md',
  showIcon = true,
  showConfirmation = true
}: ToggleStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    try {
      setIsLoading(true);
      const newStatus = !isActive;
      await onToggle(id, newStatus);
      
      if (showConfirmation) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      // El error se maneja en el componente padre
    } finally {
      setIsLoading(false);
    }
  };

  // Configuración de tamaños
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      loader: 'w-3 h-3'
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      loader: 'w-4 h-4'
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      loader: 'w-5 h-5'
    }
  };

  const config = sizeConfig[size];

  // Estilos del botón
  const buttonClasses = `
    inline-flex items-center space-x-2 rounded-lg font-medium transition-all duration-200
    ${config.button}
    ${isActive 
      ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' 
      : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
    }
    ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
    ${showSuccess ? 'ring-2 ring-green-400 ring-opacity-50' : ''}
  `.trim();

  const tooltipText = isActive 
    ? `Desactivar ${entityName}` 
    : `Activar ${entityName}`;

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={buttonClasses}
      title={tooltipText}
      aria-label={tooltipText}
    >
      {/* Icono */}
      {showIcon && (
        <span className="flex-shrink-0">
          {isLoading ? (
            <Loader2 className={`${config.loader} animate-spin`} />
          ) : showSuccess ? (
            <Check className={`${config.icon} text-green-600`} />
          ) : isActive ? (
            <Eye className={config.icon} />
          ) : (
            <EyeOff className={config.icon} />
          )}
        </span>
      )}
      
      {/* Texto del estado */}
      <span className="font-medium">
        {isLoading ? 'Cambiando...' : isActive ? 'Activo' : 'Inactivo'}
      </span>
    </button>
  );
}