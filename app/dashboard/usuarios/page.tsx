'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { UserPlus, Edit2, Trash2, Shield, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Usuario {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: 'ADMIN' | 'USER';
  securityQuestion?: string | null;
  securityAnswer?: string | null;
  createdAt: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    securityQuestion: '',
    securityAnswer: '',
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      const url = editingUser
        ? `/api/usuarios/${editingUser.id}`
        : '/api/usuarios';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
        setShowModal(false);
        setFormData({ 
          name: '', 
          email: '', 
          username: '',
          password: '', 
          role: 'USER',
          securityQuestion: '',
          securityAnswer: '',
        });
        setEditingUser(null);
        fetchUsuarios();
      } else {
        setError(data.error || 'Error al guardar usuario');
        toast.error(data.error || 'Error al guardar usuario');
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setError('Error de conexión');
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUser(usuario);
    setFormData({
      name: usuario.name,
      email: usuario.email,
      username: usuario.username || '',
      password: '',
      role: usuario.role,
      securityQuestion: usuario.securityQuestion || '',
      securityAnswer: usuario.securityAnswer || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Usuario eliminado correctamente');
        fetchUsuarios();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      toast.error('Error de conexión');
    }
  };

  if (isLoading) {
    return <div className="p-8">Cargando usuarios...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios y Roles</h1>
          <p className="text-gray-600 mt-2">
            Gestión de usuarios del sistema
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ 
              name: '', 
              email: '', 
              username: '',
              password: '', 
              role: 'USER',
              securityQuestion: '',
              securityAnswer: '',
            });
            setError('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-900">{usuarios.length}</p>
            </div>
            <User className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Administradores</p>
              <p className="text-3xl font-bold text-gray-900">
                {usuarios.filter((u) => u.role === 'ADMIN').length}
              </p>
            </div>
            <Shield className="text-red-600" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Usuarios Normales</p>
              <p className="text-3xl font-bold text-gray-900">
                {usuarios.filter((u) => u.role === 'USER').length}
              </p>
            </div>
            <User className="text-green-600" size={40} />
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Creación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {usuario.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{usuario.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{usuario.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      usuario.role === 'ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {usuario.role === 'ADMIN' ? (
                      <span className="flex items-center gap-1">
                        <Shield size={12} />
                        Administrador
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        Usuario
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(usuario.createdAt).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(usuario)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Editar usuario"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {usuarios.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza creando un nuevo usuario.</p>
          </div>
        )}
      </div>

      {/* Modal de crear/editar */}
      <Modal 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          setError('');
        }}
        ariaLabel={editingUser ? "Editar usuario" : "Crear nuevo usuario"}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {editingUser ? 'Modifica los datos del usuario seleccionado' : 'Completa los datos para crear un nuevo usuario'}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Ej: Juan Pérez"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="correo@todafru.com"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Nombre de usuario <span className="text-gray-500 text-xs">(opcional, para recuperación de cuenta)</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Ej: jperez"
                  disabled={saving}
                />
                {editingUser && formData.username && (
                  <p className="text-xs text-gray-500 mt-1">Actual: {editingUser.username || 'No configurado'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Contraseña {editingUser && <span className="text-gray-500 text-xs">(dejar en blanco para no cambiar)</span>}
                  {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required={!editingUser}
                  disabled={saving}
                  minLength={6}
                />
                {!editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Pregunta de seguridad (para recuperar cuenta)
                  {editingUser && (editingUser.securityQuestion || editingUser.securityAnswer) && (
                    <span className="text-xs text-gray-500 font-normal ml-2">- Configurada</span>
                  )}
                </h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Pregunta
                  </label>
                  <input
                    type="text"
                    value={formData.securityQuestion}
                    onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Ej: ¿Cuál es tu fruta favorita?"
                    disabled={saving}
                  />
                  {editingUser && !formData.securityQuestion && editingUser.securityQuestion && (
                    <p className="text-xs text-gray-500 mt-1">Actual: {editingUser.securityQuestion}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Respuesta
                  </label>
                  <input
                    type="text"
                    value={formData.securityAnswer}
                    onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Ej: manzana"
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editingUser 
                      ? 'Dejar en blanco para mantener la respuesta actual' 
                      : 'Esta información se usará para recuperar la contraseña'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Rol del usuario <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'USER' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      formData.role === 'USER'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                    disabled={saving}
                  >
                    <User size={18} />
                    <span className="font-medium">Usuario</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      formData.role === 'ADMIN'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                    disabled={saving}
                  >
                    <Shield size={18} />
                    <span className="font-medium">Administrador</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Los administradores tienen acceso completo al sistema
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      {editingUser ? 'Actualizar' : 'Crear Usuario'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                  disabled={saving}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
      </Modal>
    </div>
  );
}
