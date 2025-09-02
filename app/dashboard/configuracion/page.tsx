'use client';

import { useState } from 'react';

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  settings: ConfigSetting[];
}

interface ConfigSetting {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'email' | 'url';
  value: any;
  options?: { label: string; value: any }[];
  required?: boolean;
}

export default function ConfiguracionPage() {
  const [configSections, setConfigSections] = useState<ConfigSection[]>([
    {
      id: 'general',
      title: 'Configuración General',
      description: 'Configuraciones básicas del sistema',
      settings: [
        {
          id: 'company_name',
          name: 'Nombre de la Empresa',
          description: 'Nombre que aparecerá en documentos y reportes',
          type: 'text',
          value: 'TodoFru S.A.S.',
          required: true
        },
        {
          id: 'company_nit',
          name: 'NIT de la Empresa',
          description: 'Número de identificación tributaria',
          type: 'text',
          value: '900123456-7',
          required: true
        },
        {
          id: 'company_address',
          name: 'Dirección',
          description: 'Dirección principal de la empresa',
          type: 'text',
          value: 'Calle 123 #45-67, Bogotá',
          required: true
        },
        {
          id: 'company_phone',
          name: 'Teléfono',
          description: 'Teléfono principal de contacto',
          type: 'text',
          value: '+57 1 234 5678'
        },
        {
          id: 'company_email',
          name: 'Email',
          description: 'Email principal de la empresa',
          type: 'email',
          value: 'info@todofru.com'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventario',
      description: 'Configuraciones relacionadas con el manejo de inventario',
      settings: [
        {
          id: 'low_stock_alert',
          name: 'Alerta de Stock Bajo',
          description: 'Activar alertas cuando el stock esté bajo',
          type: 'boolean',
          value: true
        },
        {
          id: 'low_stock_threshold',
          name: 'Umbral de Stock Bajo',
          description: 'Cantidad mínima antes de mostrar alerta',
          type: 'number',
          value: 10
        },
        {
          id: 'auto_reorder',
          name: 'Reorden Automático',
          description: 'Generar órdenes de compra automáticamente',
          type: 'boolean',
          value: false
        },
        {
          id: 'inventory_method',
          name: 'Método de Inventario',
          description: 'Método de valoración de inventario',
          type: 'select',
          value: 'fifo',
          options: [
            { label: 'FIFO (Primero en entrar, primero en salir)', value: 'fifo' },
            { label: 'LIFO (Último en entrar, primero en salir)', value: 'lifo' },
            { label: 'Promedio Ponderado', value: 'weighted_average' }
          ]
        }
      ]
    },
    {
      id: 'sales',
      title: 'Ventas',
      description: 'Configuraciones del módulo de ventas',
      settings: [
        {
          id: 'tax_rate',
          name: 'Tasa de IVA (%)',
          description: 'Porcentaje de IVA aplicado a las ventas',
          type: 'number',
          value: 19
        },
        {
          id: 'discount_limit',
          name: 'Límite de Descuento (%)',
          description: 'Descuento máximo permitido sin autorización',
          type: 'number',
          value: 15
        },
        {
          id: 'invoice_prefix',
          name: 'Prefijo de Factura',
          description: 'Prefijo para numeración de facturas',
          type: 'text',
          value: 'TF'
        },
        {
          id: 'payment_terms',
          name: 'Términos de Pago por Defecto',
          description: 'Términos de pago predeterminados',
          type: 'select',
          value: '30',
          options: [
            { label: 'Contado', value: '0' },
            { label: '15 días', value: '15' },
            { label: '30 días', value: '30' },
            { label: '45 días', value: '45' },
            { label: '60 días', value: '60' }
          ]
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configuración de alertas y notificaciones',
      settings: [
        {
          id: 'email_notifications',
          name: 'Notificaciones por Email',
          description: 'Enviar notificaciones por correo electrónico',
          type: 'boolean',
          value: true
        },
        {
          id: 'notification_email',
          name: 'Email para Notificaciones',
          description: 'Dirección de email para recibir notificaciones',
          type: 'email',
          value: 'admin@todofru.com'
        },
        {
          id: 'daily_reports',
          name: 'Reportes Diarios',
          description: 'Enviar reportes diarios automáticamente',
          type: 'boolean',
          value: false
        },
        {
          id: 'backup_notifications',
          name: 'Notificaciones de Respaldo',
          description: 'Alertas sobre el estado de los respaldos',
          type: 'boolean',
          value: true
        }
      ]
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Configuraciones de seguridad del sistema',
      settings: [
        {
          id: 'session_timeout',
          name: 'Tiempo de Sesión (minutos)',
          description: 'Tiempo antes de cerrar sesión automáticamente',
          type: 'number',
          value: 60
        },
        {
          id: 'password_expiry',
          name: 'Expiración de Contraseña (días)',
          description: 'Días antes de requerir cambio de contraseña',
          type: 'number',
          value: 90
        },
        {
          id: 'two_factor_auth',
          name: 'Autenticación de Dos Factores',
          description: 'Requerir verificación adicional al iniciar sesión',
          type: 'boolean',
          value: false
        },
        {
          id: 'login_attempts',
          name: 'Intentos de Login',
          description: 'Número máximo de intentos fallidos antes de bloquear',
          type: 'number',
          value: 5
        }
      ]
    }
  ]);

  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const handleSettingChange = (sectionId: string, settingId: string, value: any) => {
    setConfigSections(prev => prev.map(section => 
      section.id === sectionId 
        ? {
            ...section,
            settings: section.settings.map(setting => 
              setting.id === settingId ? { ...setting, value } : setting
            )
          }
        : section
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Aquí se guardarían las configuraciones
    console.log('Guardando configuraciones...', configSections);
    setHasChanges(false);
    alert('Configuraciones guardadas exitosamente');
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres restablecer todas las configuraciones?')) {
      // Aquí se restablecerían las configuraciones por defecto
      setHasChanges(false);
      alert('Configuraciones restablecidas');
    }
  };

  const renderSetting = (sectionId: string, setting: ConfigSetting) => {
    const commonClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base bg-white";

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => handleSettingChange(sectionId, setting.id, e.target.checked)}
              className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-base text-gray-700 font-medium">
              {setting.value ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        );
      
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(sectionId, setting.id, e.target.value)}
            className={commonClasses}
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => handleSettingChange(sectionId, setting.id, parseFloat(e.target.value) || 0)}
            className={commonClasses}
            required={setting.required}
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={setting.value}
            onChange={(e) => handleSettingChange(sectionId, setting.id, e.target.value)}
            className={commonClasses}
            required={setting.required}
          />
        );
      
      case 'url':
        return (
          <input
            type="url"
            value={setting.value}
            onChange={(e) => handleSettingChange(sectionId, setting.id, e.target.value)}
            className={commonClasses}
            required={setting.required}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => handleSettingChange(sectionId, setting.id, e.target.value)}
            className={commonClasses}
            required={setting.required}
          />
        );
    }
  };

  const activeConfigSection = configSections.find(section => section.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
              <p className="text-gray-600 mt-1">Administra las configuraciones del sistema</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Restablecer
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasChanges
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Guardar Cambios
              </button>
            </div>
          </div>

          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Tienes cambios sin guardar. No olvides hacer clic en "Guardar Cambios" para aplicar las modificaciones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* Sidebar de secciones */}
          <div className="xl:w-80 xl:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Secciones</h3>
              <nav className="space-y-3">
                {configSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {activeConfigSection && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">{activeConfigSection.title}</h2>
                  <p className="text-gray-600 mt-2 text-lg">{activeConfigSection.description}</p>
                </div>

                <div className="space-y-8">
                  {activeConfigSection.settings.map(setting => (
                    <div key={setting.id} className="border-b border-gray-200 pb-8 last:border-b-0 last:pb-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div>
                          <label className="block text-base font-semibold text-gray-900 mb-2">
                            {setting.name}
                            {setting.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <p className="text-sm text-gray-600 leading-relaxed">{setting.description}</p>
                        </div>
                        <div className="lg:pl-4">
                          {renderSetting(activeConfigSection.id, setting)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}