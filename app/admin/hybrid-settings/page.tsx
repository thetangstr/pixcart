'use client'

/**
 * Admin Panel - Hybrid Model Settings
 * 
 * Control the SDXL + Gemini hybrid system parameters
 * - Upgrade threshold (default: 3 generations)
 * - Model priorities and fallback settings
 * - Cost tracking and usage analytics
 */

import { useState, useEffect } from 'react'
import { Save, Settings, BarChart, Users, Zap, Shield, RefreshCw } from 'lucide-react'
import UsageTracker from '../../lib/usage-tracker'

interface HybridSettings {
  upgradeThreshold: number
  enableFallback: boolean
  primaryModel: 'sdxl' | 'gemini'
  sdxlTimeout: number
  geminiTimeout: number
  enableUsageTracking: boolean
  costAlerts: boolean
  maxCostPerSession: number
}

interface SystemStats {
  totalUsers: number
  totalGenerations: number
  sdxlGenerations: number
  geminiGenerations: number
  averageUpgradeTime: number
  costSavings: number
}

export default function HybridSettingsPage() {
  const [settings, setSettings] = useState<HybridSettings>({
    upgradeThreshold: 3,
    enableFallback: true,
    primaryModel: 'sdxl',
    sdxlTimeout: 60000, // 60 seconds
    geminiTimeout: 45000, // 45 seconds
    enableUsageTracking: true,
    costAlerts: true,
    maxCostPerSession: 1.0 // $1.00
  })

  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalGenerations: 0,
    sdxlGenerations: 0,
    geminiGenerations: 0,
    averageUpgradeTime: 0,
    costSavings: 0
  })

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load current settings and stats
  useEffect(() => {
    loadSettings()
    loadStats()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/hybrid-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/hybrid-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/hybrid-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const resetUsageData = async () => {
    if (!confirm('Are you sure you want to reset all usage data? This cannot be undone.')) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/hybrid-stats', {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadStats()
        alert('Usage data reset successfully')
      } else {
        alert('Failed to reset usage data')
      }
    } catch (error) {
      console.error('Failed to reset usage data:', error)
      alert('Failed to reset usage data')
    } finally {
      setLoading(false)
    }
  }

  const testConfiguration = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/test-hybrid-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`Configuration test passed!\n\nSDXL: ${result.sdxl ? '✅' : '❌'}\nGemini: ${result.gemini ? '✅' : '❌'}`)
      } else {
        alert(`Configuration test failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Configuration test failed:', error)
      alert('Configuration test failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Hybrid Model Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure the SDXL + Gemini hybrid system for optimal performance and cost efficiency
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Core Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Core Settings
              </h2>

              <div className="space-y-4">
                {/* Upgrade Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upgrade Threshold (generations to unlock Gemini)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.upgradeThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      upgradeThreshold: parseInt(e.target.value) || 3
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Users will upgrade to Gemini after this many generations
                  </p>
                </div>

                {/* Primary Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Model for New Users
                  </label>
                  <select
                    value={settings.primaryModel}
                    onChange={(e) => setSettings({
                      ...settings,
                      primaryModel: e.target.value as 'sdxl' | 'gemini'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sdxl">SDXL Optimized (Recommended)</option>
                    <option value="gemini">Gemini 2.5 Flash</option>
                  </select>
                </div>

                {/* Enable Fallback */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableFallback"
                    checked={settings.enableFallback}
                    onChange={(e) => setSettings({
                      ...settings,
                      enableFallback: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableFallback" className="ml-2 text-sm text-gray-700">
                    Enable automatic fallback between models
                  </label>
                </div>

                {/* Usage Tracking */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableTracking"
                    checked={settings.enableUsageTracking}
                    onChange={(e) => setSettings({
                      ...settings,
                      enableUsageTracking: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableTracking" className="ml-2 text-sm text-gray-700">
                    Enable usage tracking and analytics
                  </label>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                Advanced Settings
              </h2>

              <div className="space-y-4">
                {/* Timeouts */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SDXL Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={settings.sdxlTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        sdxlTimeout: parseInt(e.target.value) || 60000
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gemini Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={settings.geminiTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        geminiTimeout: parseInt(e.target.value) || 45000
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Cost Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Cost Per Session ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.maxCostPerSession}
                    onChange={(e) => setSettings({
                      ...settings,
                      maxCostPerSession: parseFloat(e.target.value) || 1.0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert when user session cost exceeds this amount
                  </p>
                </div>

                {/* Cost Alerts */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="costAlerts"
                    checked={settings.costAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      costAlerts: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="costAlerts" className="ml-2 text-sm text-gray-700">
                    Enable cost alerts and monitoring
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saved ? 'Saved!' : 'Save Settings'}
                </button>
                
                <button
                  onClick={testConfiguration}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  Test Config
                </button>

                <button
                  onClick={() => loadStats()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Stats
                </button>

                <button
                  onClick={resetUsageData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Data
                </button>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* System Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-purple-500" />
                System Statistics
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalGenerations.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Total Generations</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total Users</div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.sdxlGenerations.toLocaleString()}
                  </div>
                  <div className="text-sm text-yellow-600">SDXL Generations</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.geminiGenerations.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-600">Gemini Generations</div>
                </div>
              </div>
            </div>

            {/* Cost Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Cost Analysis
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">SDXL Cost (estimated)</span>
                  <span className="font-semibold">
                    ${(stats.sdxlGenerations * 0.01).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Gemini Cost</span>
                  <span className="font-semibold">
                    ${(stats.geminiGenerations * 0.039).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-900 font-semibold">Total Cost</span>
                  <span className="font-bold text-lg">
                    ${((stats.sdxlGenerations * 0.01) + (stats.geminiGenerations * 0.039)).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-green-600">
                  <span>Cost Savings vs. All-Gemini</span>
                  <span className="font-semibold">
                    ${(stats.sdxlGenerations * (0.039 - 0.01)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Usage Patterns */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Usage Patterns
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Average Upgrade Time</span>
                  <span className="font-semibold">
                    {stats.averageUpgradeTime ? `${stats.averageUpgradeTime.toFixed(1)} min` : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">SDXL Usage Rate</span>
                  <span className="font-semibold">
                    {stats.totalGenerations > 0 
                      ? `${((stats.sdxlGenerations / stats.totalGenerations) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Gemini Adoption Rate</span>
                  <span className="font-semibold">
                    {stats.totalGenerations > 0 
                      ? `${((stats.geminiGenerations / stats.totalGenerations) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}