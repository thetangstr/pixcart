'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Shield, UserPlus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface WhitelistEntry {
  id: string
  email: string
  addedBy: string
  addedAt: string
  notes?: string
}

export default function AdminPanel() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user?.email !== 'thetangstr@gmail.com') {
      router.push('/auth/not-authorized')
    } else {
      fetchWhitelist()
    }
  }, [session, status, router])

  const fetchWhitelist = async () => {
    try {
      const response = await fetch('/api/admin/whitelist')
      if (response.ok) {
        const data = await response.json()
        setWhitelist(data)
      } else {
        setError('Failed to fetch whitelist')
      }
    } catch (err) {
      setError('Error loading whitelist')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail, 
          notes,
          action: 'add' 
        }),
      })

      if (response.ok) {
        setMessage(`Successfully added ${newEmail} to whitelist`)
        setNewEmail('')
        setNotes('')
        await fetchWhitelist()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add email')
      }
    } catch (err) {
      setError('Error adding email to whitelist')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remove ${email} from whitelist?`)) return

    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          action: 'remove' 
        }),
      })

      if (response.ok) {
        setMessage(`Removed ${email} from whitelist`)
        await fetchWhitelist()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove email')
      }
    } catch (err) {
      setError('Error removing email from whitelist')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-amber-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/admin/feedback" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                View Feedback
              </Link>
              <Link href="/upload" className="text-amber-600 hover:text-amber-700">
                ← Back to App
              </Link>
            </div>
          </div>
          
          <p className="text-gray-600">
            Manage whitelist access for the Oil Painting App. Only whitelisted emails can sign in.
          </p>
          
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Admin:</strong> {session?.user?.email}
            </p>
          </div>
        </div>

        {/* Add Email Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-amber-600" />
            Add Email to Whitelist
          </h2>

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          <form onSubmit={handleAddEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Friend, Beta tester, etc."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add to Whitelist
                </>
              )}
            </button>
          </form>
        </div>

        {/* Whitelist Table */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold mb-4">
            Current Whitelist ({whitelist.length} users)
          </h2>

          {whitelist.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No emails in whitelist yet. Add your first email above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Email</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Notes</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Added By</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <span className="font-medium">{entry.email}</span>
                        {entry.email === 'thetangstr@gmail.com' && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Admin</span>
                        )}
                        {entry.notes?.includes('Beta') && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Beta</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {entry.notes || '-'}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {entry.addedBy}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {new Date(entry.addedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {entry.email !== 'thetangstr@gmail.com' && (
                          <button
                            onClick={() => handleRemoveEmail(entry.email)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}