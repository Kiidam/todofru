'use client';

import React from 'react';
import { Loader2, Package, TrendingUp, BarChart3 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  type?: 'default' | 'table' | 'card' | 'modal' | 'stats';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Cargando...",
  type = 'default',
  size = 'md',
  className = ""
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = {
    default: 'flex flex-col items-center justify-center p-8',
    table: 'flex items-center justify-center p-12',
    card: 'flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow',
    modal: 'flex items-center justify-center p-4',
    stats: 'flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg'
  };

  return (
    <div className={`${containerClasses[type]} ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-orange-600 animate-spin mb-3`} />
      <p className="text-gray-600 text-sm font-medium">{message}</p>
    </div>
  );
};

// Skeleton para tabla de movimientos
export const MovimientosTableSkeleton: React.FC = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </div>
      <div className="divide-y divide-gray-200">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton para tarjetas de estadísticas
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton para formulario de filtros
export const FiltersSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-2">
        <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>
    </div>
  );
};

// Loading overlay para modales
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Procesando..."
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-md">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-orange-600 animate-spin mx-auto mb-2" />
        <p className="text-gray-600 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

// Loading para botones
interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  className = "",
  disabled = false,
  onClick,
  type = 'button' as const
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`relative inline-flex items-center justify-center ${className} ${
        loading || disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      )}
      {children}
    </button>
  );
};