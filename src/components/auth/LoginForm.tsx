'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// Esquema de validación con Zod
const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const validateField = (name: keyof LoginFormData, value: string) => {
    try {
      loginSchema.shape[name].parse(value);
      setErrors(prev => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [name]: error.issues[0].message }));
      }
      return false;
    }
  };

  // Validación del formulario completo usando safeParse y flatten()
  const validateForm = (data: LoginFormData) => {
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      // Si existiera un error general del formulario, lo mostramos como error de login
      if (formErrors && formErrors.length > 0) {
        setLoginError(formErrors[0]);
      }
      return false;
    }
    // Limpiar errores si todo es válido
    setErrors({});
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name as keyof LoginFormData, value);
    // Limpiar error de login cuando el usuario modifica los campos
    if (loginError) setLoginError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    // Validar todos los campos con el esquema completo
    const isValid = validateForm(formData);
    if (!isValid) return;

    setIsLoading(true);
    
    try {
      // Autenticar con el hook useAuth
      const { success } = await login(formData.email, formData.password);
      
      if (!success) {
        setLoginError('Credenciales incorrectas. Por favor, verifica tu correo y contraseña.');
        return;
      }
      
      // Si la autenticación fue exitosa, redirigir al dashboard
      router.push('/dashboard');
    } catch {
      setLoginError('Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {loginError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {loginError}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition`}
            placeholder="Tu correo electrónico*"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
        
        <div className="relative">
          <label htmlFor="password" className="sr-only">Contraseña</label>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition pr-10`}
            placeholder="Tu contraseña*"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading || !!errors.email || !!errors.password}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white ${isLoading || !!errors.email || !!errors.password ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'} transition-colors`}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </div>
    </form>
  );
}