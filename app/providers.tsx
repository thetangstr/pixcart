'use client'

// import { SessionProvider } from 'next-auth/react' // NextAuth removed

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}