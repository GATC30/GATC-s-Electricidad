import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET
          })
        ]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET
          })
        ]
      : []),
    // Fallback credentials provider for offline / local demo testing
    Credentials({
      name: 'Modo Invitado / Demo',
      credentials: {
        email: { label: 'Correo', type: 'email', placeholder: 'demo@gatc.app' },
        name: { label: 'Nombre', type: 'text', placeholder: 'Ingeniero Residente' }
      },
      async authorize(credentials) {
        const email = (credentials?.email as string) || 'invitado@gatc.app';
        const name = (credentials?.name as string) || 'Usuario Invitado';
        return {
          id: 'demo-user-001',
          email,
          name
        };
      }
    })
  ],
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.AUTH_SECRET || 'dev-secret-gatc-offline-local-default-key-32'
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Helper to get the current authenticated user ID, or fallback to demo user ID in offline/local environments.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (err) {
    console.warn('[auth] Could not retrieve session, falling back to demo user:', err);
  }
  return 'demo-user-001';
}
