'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RecuperarCuentaPage() {
  const [step, setStep] = useState<'usuario' | 'pregunta' | 'nueva-password'>('usuario');
  const [usuario, setUsuario] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleBuscarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/recuperar-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verificar-usuario', usuario })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Usuario no encontrado');
        setIsLoading(false);
        return;
      }

      setPregunta(data.data.pregunta);
      setStep('pregunta');
      setIsLoading(false);
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setIsLoading(false);
    }
  };

  const handleVerificarRespuesta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/recuperar-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verificar-respuesta', usuario, respuesta })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Respuesta incorrecta');
        setIsLoading(false);
        return;
      }

      setStep('nueva-password');
      setIsLoading(false);
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setIsLoading(false);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/recuperar-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          step: 'cambiar-password', 
          usuario, 
          respuesta, 
          nuevaPassword 
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Error al cambiar contraseña');
        setIsLoading(false);
        return;
      }

      alert(data.data.mensaje || 'Contraseña cambiada exitosamente');
      router.push('/login');
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex flex-col items-center mx-auto mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center relative">
              <div className="w-6 h-6 absolute -top-1 -right-1 bg-green-600 rounded-full transform rotate-45"></div>
              <div className="w-6 h-6 absolute -top-2 bg-green-600 rounded-tr-full rounded-tl-full h-3"></div>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-700 mt-2 tracking-wider">
            TODOFRU<span className="text-xs align-top">®</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Recuperar Cuenta
        </h1>
        <p className="text-gray-600 mt-2">
          {step === 'usuario' && 'Ingresa tu nombre de usuario o email'}
          {step === 'pregunta' && 'Responde la pregunta de seguridad'}
          {step === 'nueva-password' && 'Crea tu nueva contraseña'}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {step === 'usuario' && (
          <form onSubmit={handleBuscarUsuario} className="space-y-4">
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-gray-700">
                Usuario o Email
              </label>
              <input
                type="text"
                id="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                placeholder="usuario o email@ejemplo.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Buscando...' : 'Continuar'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

        {step === 'pregunta' && (
          <form onSubmit={handleVerificarRespuesta} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900">{pregunta}</p>
            </div>

            <div>
              <label htmlFor="respuesta" className="block text-sm font-medium text-gray-700">
                Tu Respuesta
              </label>
              <input
                type="text"
                id="respuesta"
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                placeholder="Escribe tu respuesta"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Verificando...' : 'Verificar Respuesta'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setStep('usuario')}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Volver atrás
              </button>
            </div>
          </form>
        )}

        {step === 'nueva-password' && (
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label htmlFor="nuevaPassword" className="block text-sm font-medium text-gray-700">
                Nueva Contraseña
              </label>
              <input
                type="password"
                id="nuevaPassword"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmarPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                id="confirmarPassword"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                placeholder="Repite la contraseña"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
