'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

interface TestResult {
  success: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  message?: string;
}

export default function JWTTestPage() {
  const { data: session, status } = useSession();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<string>('');

  const updateResult = (test: string, result: TestResult) => {
    setTestResults((prev: Record<string, TestResult>) => ({ ...prev, [test]: result }));
  };

  const testProviders = async () => {
    setLoading('providers');
    try {
      const res = await fetch('/api/auth/providers');
      const data = await res.json();
      updateResult('providers', { 
        success: res.ok, 
        status: res.status, 
        data 
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      updateResult('providers', { 
        success: false, 
        error: message
      });
    }
    setLoading('');
  };

  const testCSRF = async () => {
    setLoading('csrf');
    try {
      const res = await fetch('/api/auth/csrf');
      const data = await res.json();
      updateResult('csrf', { 
        success: res.ok, 
        status: res.status, 
        data 
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      updateResult('csrf', { 
        success: false, 
        error: message
      });
    }
    setLoading('');
  };

  const testLogin = async () => {
    setLoading('login');
    try {
      const result = await signIn('credentials', {
        email: 'admin@todofru.com',
        password: 'admin123',
        redirect: false
      });
      updateResult('login', { 
        success: !result?.error, 
        data: result 
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      updateResult('login', { 
        success: false, 
        error: message
      });
    }
    setLoading('');
  };

  const testLogout = async () => {
    setLoading('logout');
    try {
      await signOut({ redirect: false });
      updateResult('logout', { 
        success: true, 
        message: 'Logout ejecutado' 
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      updateResult('logout', { 
        success: false, 
        error: message
      });
    }
    setLoading('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            🔐 Test de JWT Authentication - TodoFru
          </h1>

          {/* Estado de la sesión */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold mb-3 text-blue-800">
              Estado Actual de la Sesión
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  status === 'authenticated' ? 'bg-green-100 text-green-800' :
                  status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {status}
                </span>
              </div>
              <div>
                <span className="font-medium">Usuario:</span>
                <span className="ml-2">{session?.user?.email || 'No autenticado'}</span>
              </div>
              <div>
                <span className="font-medium">Rol:</span>
                <span className="ml-2">{session?.user?.role || 'N/A'}</span>
              </div>
            </div>
            {session && (
              <div className="mt-3">
                <span className="font-medium">Datos completos de sesión:</span>
                <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Tests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Test Providers */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">1. Test de Proveedores</h3>
              <button
                onClick={testProviders}
                disabled={loading === 'providers'}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading === 'providers' ? 'Verificando...' : 'Verificar Proveedores'}
              </button>
              {testResults.providers && (
                <div className={`mt-3 p-3 rounded ${
                  testResults.providers.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium">
                    {testResults.providers.success ? '✅ Éxito' : '❌ Error'}
                  </div>
                  <pre className="mt-2 text-sm overflow-x-auto">
                    {JSON.stringify(testResults.providers, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Test CSRF */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">2. Test de CSRF Token</h3>
              <button
                onClick={testCSRF}
                disabled={loading === 'csrf'}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading === 'csrf' ? 'Verificando...' : 'Verificar CSRF'}
              </button>
              {testResults.csrf && (
                <div className={`mt-3 p-3 rounded ${
                  testResults.csrf.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium">
                    {testResults.csrf.success ? '✅ Éxito' : '❌ Error'}
                  </div>
                  <pre className="mt-2 text-sm overflow-x-auto">
                    {JSON.stringify(testResults.csrf, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Test Login */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">3. Test de Login</h3>
              <button
                onClick={testLogin}
                disabled={loading === 'login'}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading === 'login' ? 'Probando Login...' : 'Probar Login (admin@todofru.com)'}
              </button>
              {testResults.login && (
                <div className={`mt-3 p-3 rounded ${
                  testResults.login.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium">
                    {testResults.login.success ? '✅ Login Exitoso' : '❌ Error en Login'}
                  </div>
                  <pre className="mt-2 text-sm overflow-x-auto">
                    {JSON.stringify(testResults.login, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Test Logout */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">4. Test de Logout</h3>
              <button
                onClick={testLogout}
                disabled={loading === 'logout'}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                {loading === 'logout' ? 'Cerrando Sesión...' : 'Probar Logout'}
              </button>
              {testResults.logout && (
                <div className={`mt-3 p-3 rounded ${
                  testResults.logout.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium">
                    {testResults.logout.success ? '✅ Logout Exitoso' : '❌ Error en Logout'}
                  </div>
                  <pre className="mt-2 text-sm overflow-x-auto">
                    {JSON.stringify(testResults.logout, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold mb-2 text-yellow-800">
              📋 Instrucciones de Prueba
            </h3>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li>Verifica que todos los endpoints respondan correctamente</li>
              <li>Prueba el login con las credenciales admin@todofru.com / admin123</li>
              <li>Observa como cambia el estado de la sesión después del login</li>
              <li>Verifica que el logout elimine la sesión correctamente</li>
              <li>Revisa los datos del JWT en la respuesta de sesión</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
