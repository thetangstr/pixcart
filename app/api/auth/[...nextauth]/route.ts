import NextAuth from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { FirestoreAdapter } from '@/app/lib/firestoreAdapter'
import { FirestoreUsers } from '@/app/lib/firestore'

export const authOptions: NextAuthOptions = {
  adapter: FirestoreAdapter(),
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    
    // Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    
    // Apple OAuth
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    
    // Email/Password credentials
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await FirestoreUsers.findByEmail(credentials.email)

        if (!user) {
          throw new Error('Invalid credentials')
        }

        // For now, we'll skip password validation since we don't have password storage implemented
        // In a full implementation, you'd need to add password field to User model and hash storage
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    })
  ],
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Admin always allowed
      if (user.email === 'thetangstr@gmail.com') {
        // Set admin flag
        const dbUser = await FirestoreUsers.findByEmail(user.email);
        if (dbUser) {
          await FirestoreUsers.update(dbUser.id, { isAdmin: true, isWhitelisted: true });
        }
        return true;
      }

      // Check if email is whitelisted
      const { FirestoreWhitelist } = await import('@/app/lib/firestore');
      const isWhitelisted = await FirestoreWhitelist.isWhitelisted(user.email!);
      
      if (!isWhitelisted) {
        // Redirect to not authorized page
        return '/auth/not-authorized';
      }

      // Update user whitelist status
      const dbUser = await FirestoreUsers.findByEmail(user.email!);
      if (dbUser) {
        await FirestoreUsers.update(dbUser.id, { isWhitelisted: true });
      }

      return true;
    },
    
    async session({ session, token, user }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
        
        // Add admin and beta tester status to session
        const dbUser = await FirestoreUsers.findByEmail(session.user.email!);
        if (dbUser) {
          (session.user as any).isAdmin = dbUser.isAdmin || false;
          (session.user as any).isBetaTester = dbUser.isBetaTester || false;
        }
      }
      return session
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  
  session: {
    strategy: 'jwt',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }