'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales incorrectas');
      } else {
        // Verificar que la sesión se creó correctamente
        const session = await getSession();
        if (session) {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      setError('Error al iniciar sesión');
    }
    
    setIsLoading(false);
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
          Iniciar Sesión
        </h1>
        <p className="text-gray-600 mt-2">
          Accede a tu cuenta de TodoFrut
        </p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500 font-medium"
              placeholder="admin@todofru.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500 font-medium"
              placeholder="admin123"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

      </div>
    </div>
  );
}