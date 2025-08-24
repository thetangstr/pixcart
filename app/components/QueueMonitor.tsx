'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Cpu, HardDrive, Loader2 } from 'lucide-react';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
  gpuUtilization: number;
  vramUsage: number;
}

export default function QueueMonitor() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/queue/status');
        if (!response.ok) throw new Error('Failed to fetch queue stats');
        const data = await response.json();
        setStats(data.stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll every 2 seconds
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Queue monitoring unavailable</span>
        </div>
      </div>
    );
  }

  const getGPUColor = (utilization: number) => {
    if (utilization < 30) return 'text-green-600';
    if (utilization < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVRAMColor = (usage: number) => {
    if (usage < 50) return 'text-green-600';
    if (usage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Cpu className="h-5 w-5" />
        Processing Queue
      </h3>

      {/* Queue Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Pending</span>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-lg font-semibold">{stats.pending}</span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Processing</span>
          <div className="flex items-center gap-1">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-lg font-semibold text-blue-600">{stats.processing}</span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Completed</span>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-lg font-semibold text-green-600">{stats.completed}</span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Failed</span>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-lg font-semibold text-red-600">{stats.failed}</span>
          </div>
        </div>
      </div>

      {/* GPU Stats */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">GPU Utilization</span>
          <span className={`text-sm font-semibold ${getGPUColor(stats.gpuUtilization)}`}>
            {stats.gpuUtilization.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              stats.gpuUtilization < 30 ? 'bg-green-500' :
              stats.gpuUtilization < 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, stats.gpuUtilization)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-600">VRAM Usage (64GB)</span>
          <span className={`text-sm font-semibold ${getVRAMColor(stats.vramUsage || 0)}`}>
            {(stats.vramUsage || 0).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              (stats.vramUsage || 0) < 50 ? 'bg-green-500' :
              (stats.vramUsage || 0) < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, stats.vramUsage || 0)}%` }}
          />
        </div>

        {stats.averageProcessingTime > 0 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-600">Avg. Processing Time</span>
            <span className="text-sm font-semibold">
              {stats.averageProcessingTime.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* Performance Tips */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-1">Mac Studio GPU Tips:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• MPS (Metal) is active with 64GB unified memory</li>
          <li>• Optimal batch size: 2-3 concurrent jobs</li>
          <li>• FLUX models use ~20GB VRAM per job</li>
          <li>• SD 1.5 uses ~4GB, SDXL uses ~8GB VRAM</li>
        </ul>
      </div>
    </div>
  );
}