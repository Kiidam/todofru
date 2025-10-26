"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface Client {
  id: string;
  nombre: string;
  numeroIdentificacion?: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipoCliente: 'MAYORISTA' | 'MINORISTA';
  tipoEntidad?: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  mensajePersonalizado?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClienteToggleStatusProps {
  client: Client;
  onUpdate: (clientId: string, updatedData: Partial<Client>) => void;
  onError: (error: string) => void;
}

export default function ClienteToggleStatus({ client, onUpdate, onError }: ClienteToggleStatusProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleClick = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/clientes/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          activo: !client.activo
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Error al actualizar el cliente';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          switch (response.status) {
            case 404:
              errorMessage = 'Cliente no encontrado';
              break;
            case 400:
              errorMessage = 'Datos de solicitud inválidos';
              break;
            case 401:
              errorMessage = 'No autorizado para realizar esta acción';
              break;
            case 403:
              errorMessage = 'No tiene permisos para modificar este cliente';
              break;
            case 500:
              errorMessage = 'Error interno del servidor';
              break;
            default:
              errorMessage = `Error del servidor (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const updatedClient = await response.json();
      
      // Actualizar el cliente en el estado padre
      onUpdate(client.id, {
        activo: !client.activo,
        updatedAt: new Date().toISOString(),
      });

    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleClick}
      disabled={isLoading}
      className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
        client.activo
          ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
      } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      title={client.activo ? 'Desactivar cliente' : 'Activar cliente'}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : client.activo ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{client.activo ? 'Desactivar' : 'Activar'}</span>
    </button>
  );
}