'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  // Global: auto-seleccionar contenido en inputs numéricos al enfocar
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !(target instanceof HTMLInputElement)) return;
      const isNumber = target.type === 'number';
      if (!isNumber) return;
      if (target.readOnly || target.disabled) return;
      // Seleccionar tras el enfoque para cubrir click y tab
      setTimeout(() => {
        try {
          target.select();
        } catch (_) {
          // Ignorar si el input no soporta select
        }
      }, 0);
    };

    document.addEventListener('focusin', handler);
    return () => {
      document.removeEventListener('focusin', handler);
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
