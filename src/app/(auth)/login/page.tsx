'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import Logo from '@/components/ui/Logo';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Logo/Branding Side - 50% */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-400 to-orange-300 items-center justify-center p-10">
        <div className="flex flex-col items-center justify-center">
          <Logo size="large" />
          <p className="text-green-800 mt-4 text-sm tracking-widest">FRUTAS / VERDURAS</p>
        </div>
      </div>
      
      {/* Form Side - 50% */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden flex flex-col items-center justify-center mb-8">
            <Logo size="medium" />
            <p className="text-green-800 mt-2 text-xs tracking-widest">FRUTAS / VERDURAS</p>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900">
            ¡Bienvenido a TodoFru!
          </h1>
          
          <LoginForm />
        </div>
      </div>
    </div>
  );
}