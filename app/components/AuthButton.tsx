'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { User, LogIn, LogOut } from 'lucide-react'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="animate-pulse bg-gray-200 h-10 w-24 rounded-lg"></div>
    )
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {session.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {session.user?.name || session.user?.email}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Sign Out</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-md"
    >
      <LogIn className="w-4 h-4" />
      Sign In
    </button>
  )
}