"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import ClienteForm, { ClienteFormData } from './ClienteForm';

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

interface EditClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (clientId: string, updatedData: Partial<Client>) => Promise<void>;
}

export default function EditClienteModal({ isOpen, onClose, client, onSave }: EditClienteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialData, setInitialData] = useState<typeof ClienteFormData | null>(null);

  // Inicializar formulario cuando se abre el modal con un cliente
  useEffect(() => {
    if (isOpen && client) {
      // Determinar tipo de identificación basado en la longitud del número
      const tipoId = client.numeroIdentificacion?.length === 11 ? 'RUC' : 'DNI';
      
      setInitialData({
        tipoIdentificacion: tipoId,
        numeroIdentificacion: client.numeroIdentificacion || '',
        nombres: client.nombres || '',
        apellidos: client.apellidos || '',
        razonSocial: tipoId === 'RUC' ? (client.razonSocial || client.nombre || '') : '',
        representanteLegal: '',
        direccion: client.direccion || '',
        telefono: client.telefono || '',
        email: client.email || '',
        mensajePersonalizado: client.mensajePersonalizado || ''
      });
      setShowSuccess(false);
      setShowError(false);
    }
  }, [isOpen, client]);

  // Manejar cierre con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading]);



  const handleSubmit = async (formData: ClienteFormData) => {
    if (!client) return;

    setIsLoading(true);
    setShowError(false);

    try {
      // Preparar datos para la API siguiendo el formato esperado
      const payload: Partial<Client> = {
        tipoEntidad: formData.tipoIdentificacion === 'DNI' ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA',
        numeroIdentificacion: formData.numeroIdentificacion.replace(/\D/g, ''),
        nombres: formData.tipoIdentificacion === 'DNI' ? formData.nombres : undefined,
        apellidos: formData.tipoIdentificacion === 'DNI' ? formData.apellidos : undefined,
        razonSocial: formData.tipoIdentificacion === 'RUC' ? formData.razonSocial : undefined,
        telefono: formData.telefono || undefined,
        email: formData.email || undefined,
        direccion: formData.direccion,
        tipoCliente: 'MINORISTA' as const,
        contacto: undefined,
        mensajePersonalizado: formData.mensajePersonalizado || undefined,
        activo: true
      };

      const response = await fetch(`/api/clientes/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el cliente');
      }

      setShowSuccess(true);
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onSave(client.id, payload);
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar el cliente');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleCancel();
    }
  };

  if (!isOpen || !client) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-black">Editar Cliente</h2>
            <p className="text-sm text-black mt-1">Modifica los datos del cliente</p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido del formulario */}
        <div className="p-6">
          {initialData && (
            <ClienteForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitButtonText="Actualizar Cliente"
              isSubmitting={isLoading}
              submitError={showError ? errorMessage : undefined}
              submitSuccess={showSuccess ? "Cliente actualizado exitosamente" : undefined}
              isEditMode={true}
              initialData={initialData}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}