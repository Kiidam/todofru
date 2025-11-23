"use client";

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Tipos para las notificaciones
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  createdAt: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

// Estado del contexto
interface NotificationState {
  notifications: Notification[];
}

// Acciones del reducer
type NotificationAction_Reducer =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' };

// Estado inicial
const initialState: NotificationState = {
  notifications: [],
};

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction_Reducer): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
      };
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    
    default:
      return state;
  }
}

// Contexto
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  showSuccess: (title: string, message?: string, options?: Partial<Notification>) => string;
  showError: (title: string, message?: string, options?: Partial<Notification>) => string;
  showWarning: (title: string, message?: string, options?: Partial<Notification>) => string;
  showInfo: (title: string, message?: string, options?: Partial<Notification>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook para usar el contexto
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationProvider');
  }
  return context;
}

// Configuración por defecto
const DEFAULT_DURATION = 5000; // 5 segundos
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

// Provider del contexto
interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Función para generar ID único
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Función para mostrar notificación genérica
  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
      duration: notification.duration ?? DEFAULT_DURATIONS[notification.type] ?? DEFAULT_DURATION,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remover la notificación si no es persistente
    const durationMs = newNotification.duration ?? 0;
    if (!newNotification.persistent && durationMs > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, durationMs);
    }

    return id;
  }, [generateId]);

  // Funciones de conveniencia para diferentes tipos
  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return showNotification({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return showNotification({
      type: 'error',
      title,
      message,
      persistent: options?.persistent ?? true, // Los errores son persistentes por defecto
      ...options,
    });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return showNotification({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [showNotification]);

  // Función para remover notificación
  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  // Función para limpiar todas las notificaciones
  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  }, []);

  const contextValue: NotificationContextType = {
    notifications: state.notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// Componente para mostrar las notificaciones
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

// Componente individual de notificación
interface NotificationItemProps {
  notification: Notification;
  onRemove: () => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const { type, title, message, actions } = notification;

  // Configuración de estilos por tipo
  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
    },
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right duration-300`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className={`text-sm font-medium ${config.titleColor}`}>
              {title}
            </h4>
            <button
              onClick={onRemove}
              className={`ml-2 flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {message && (
            <p className={`mt-1 text-sm ${config.messageColor}`}>
              {message}
            </p>
          )}
          
          {actions && actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    onRemove();
                  }}
                  className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                    action.variant === 'primary'
                      ? `${config.iconColor} bg-white hover:bg-gray-50 border border-current`
                      : `${config.messageColor} hover:opacity-70`
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationContext;