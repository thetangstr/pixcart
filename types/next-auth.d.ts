import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      isAdmin?: boolean
      isBetaTester?: boolean
    } & DefaultSession['user']
  }

  interface User {
    isAdmin?: boolean
    isBetaTester?: boolean
  }
}