"use client";

import { useState } from 'react';
import { useAuth } from '../../../../../src/hooks/useAuth';

export default function CrearUsuarioAdministradorPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'ADMIN' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Error ${res.status}`);
      }
      setSuccess('Usuario administrador creado correctamente');
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = (user as any)?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Crear usuario administrador</h1>
        <p className="mt-2 text-gray-900">No autorizado. Requiere rol ADMIN.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
  <h1 className="text-2xl font-bold text-gray-900">Crear usuario administrador</h1>
  <p className="text-gray-900 mb-6">Registra un nuevo usuario con privilegios de administrador.</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-900">Nombre completo</label>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Correo electrónico</label>
          <input
            type="email"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Rol</label>
          <input
            type="text"
            value="ADMIN"
            disabled
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900">Contraseña</label>
          <input
            type="password"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <div className="text-sm text-gray-900">{error}</div>}
        {success && <div className="text-sm text-gray-900">{success}</div>}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Crear usuario administrador'}
          </button>
        </div>
      </form>
    </div>
  );
}
