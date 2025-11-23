/* eslint-disable @typescript-eslint/no-explicit-any */
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

// Export authOptions as `any` to avoid strict type coupling in many server route callers
const authOptions: any = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1) Intentar autenticación contra la base de datos
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (user?.password) {
            const ok = await bcrypt.compare(credentials.password, user.password);
            if (ok) {
              return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
            }
          }
        } catch {
          // Ignorar y continuar con fallback
        }

        // 2) Fallback de desarrollo: admin embebido
        if (credentials.email === 'admin@todofru.com' && credentials.password === 'admin123') {
          return { id: 'dev-admin', email: 'admin@todofru.com', name: 'Administrador', role: 'ADMIN' } as any;
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: unknown; user?: unknown | null }) {
      if (user && token && typeof token === 'object' && token !== null) {
        const t = token as Record<string, unknown>;
        const u = user as Record<string, unknown> | null;
        t.role = u?.role;
        t.id = u?.id;
      }
      return token;
    },
    async session({ session, token }: { session: unknown; token: unknown }) {
      if (session && typeof session === 'object' && token && typeof token === 'object') {
        const s = session as Record<string, unknown>;
        const t = token as Record<string, unknown>;
        if (s.user && typeof s.user === 'object') {
          const su = s.user as Record<string, unknown>;
          su.role = t.role as string | undefined;
          su.id = t.id as string | undefined;
        }
      }
      return session;
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
