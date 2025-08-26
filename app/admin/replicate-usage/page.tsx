'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, AlertCircle, RefreshCw, Zap, BarChart2 } from 'lucide-react'

interface UsageData {
  stats: {
    totalCalls: number
    successfulCalls: number
    failedCalls: number
    totalCost: number
    byQuality: Record<string, { count: number; cost: number }>
    byStyle: Record<string, number>
    dailyUsage: Record<string, { calls: number; cost: number }>
  }
  budget: {
    monthly: number
    spent: number
    remaining: number
    percentUsed: string
    estimatedCallsRemaining: Record<string, number>
  }
}

export default function ReplicateUsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthlyBudget, setMonthlyBudget] = useState(10)

  const fetchUsage = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/replicate-usage?budget=${monthlyBudget}`)
      if (response.ok) {
        const usageData = await response.json()
        setData(usageData)
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [monthlyBudget])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Failed to load usage data</p>
          </div>
        </div>
      </div>
    )
  }

  const { stats, budget } = data

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Replicate API Usage</h1>
          <p className="text-gray-600">Track your API usage and costs</p>
        </div>

        {/* Budget Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Monthly Budget
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                className="w-20 px-2 py-1 border rounded"
                min="1"
                step="5"
              />
              <span className="text-gray-600">USD</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Spent This Month</p>
              <p className="text-2xl font-bold text-blue-900">${budget.spent.toFixed(3)}</p>
              <p className="text-xs text-blue-600 mt-1">{budget.percentUsed}% of budget</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Remaining</p>
              <p className="text-2xl font-bold text-green-900">${budget.remaining.toFixed(3)}</p>
              <p className="text-xs text-green-600 mt-1">
                ~{budget.estimatedCallsRemaining.standard} standard conversions
              </p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-600 mb-1">Total Lifetime</p>
              <p className="text-2xl font-bold text-amber-900">${stats.totalCost.toFixed(3)}</p>
              <p className="text-xs text-amber-600 mt-1">{stats.totalCalls} total calls</p>
            </div>
          </div>

          {/* Budget Warning */}
          {Number(budget.percentUsed) > 80 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                You've used {budget.percentUsed}% of your monthly budget
              </p>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Success Rate */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-semibold">
                  {stats.totalCalls > 0 
                    ? ((stats.successfulCalls / stats.totalCalls) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Successful Calls</span>
                <span className="font-semibold text-green-600">{stats.successfulCalls}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Failed Calls</span>
                <span className="font-semibold text-red-600">{stats.failedCalls}</span>
              </div>
            </div>
          </div>

          {/* Quality Breakdown */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-amber-600" />
              Quality Tiers
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byQuality).map(([quality, data]) => (
                <div key={quality} className="flex justify-between items-center">
                  <span className="text-gray-600 capitalize">{quality}</span>
                  <div className="text-right">
                    <span className="font-semibold">{data.count} calls</span>
                    <span className="text-sm text-gray-500 ml-2">${data.cost.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Style Usage */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />
            Style Popularity
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byStyle).map(([style, count]) => (
              <div key={style} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600 capitalize">{style}</p>
                <p className="text-xl font-semibold">{count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Usage */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Usage (Last 7 Days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Calls</th>
                  <th className="text-right py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.dailyUsage)
                  .slice(-7)
                  .reverse()
                  .map(([date, data]) => (
                    <tr key={date} className="border-b">
                      <td className="py-2">{date}</td>
                      <td className="text-right">{data.calls}</td>
                      <td className="text-right">${data.cost.toFixed(3)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={fetchUsage}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <a
            href="/api/replicate-usage?format=report"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            Download Text Report
          </a>
        </div>
      </div>
    </div>
  )
}