/**
 * Queue management for local model processing
 * Ensures efficient GPU utilization and prevents overload
 */

import { EventEmitter } from 'events';

export interface QueueJob {
  id: string;
  modelId: string;
  type: 'comfyui' | 'a1111';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retries: number;
  priority: number; // Higher number = higher priority
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
  gpuUtilization: number;
  vramUsage: number;
}

class ModelProcessingQueue extends EventEmitter {
  private queue: QueueJob[] = [];
  private processing: Map<string, QueueJob> = new Map();
  private maxConcurrent: number;
  private processInterval: NodeJS.Timeout | null = null;
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalProcessingTime: 0
  };

  constructor(maxConcurrent = 2) { // Mac Studio can handle 2 concurrent SD jobs
    super();
    this.maxConcurrent = maxConcurrent;
    this.startProcessing();
    // Initialize VRAM monitoring
    this.updateVRAMUsage();
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    modelId: string,
    type: 'comfyui' | 'a1111',
    payload: any,
    priority = 5
  ): Promise<string> {
    const job: QueueJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId,
      type,
      payload,
      status: 'pending',
      createdAt: new Date(),
      retries: 0,
      priority
    };

    // Insert job based on priority
    const insertIndex = this.queue.findIndex(j => j.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    this.emit('job:added', job);
    return job.id;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): QueueJob | undefined {
    // Check processing jobs
    const processingJob = this.processing.get(jobId);
    if (processingJob) return processingJob;

    // Check queue
    return this.queue.find(j => j.id === jobId);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const completed = this.stats.totalProcessed;
    const failed = this.stats.totalFailed;
    const pending = this.queue.filter(j => j.status === 'pending').length;
    const processing = this.processing.size;

    return {
      pending,
      processing,
      completed,
      failed,
      averageProcessingTime: completed > 0 
        ? this.stats.totalProcessingTime / completed 
        : 0,
      gpuUtilization: this.calculateGPUUtilization(),
      vramUsage: this.getVRAMUsage()
    };
  }

  /**
   * Process queue
   */
  private startProcessing() {
    this.processInterval = setInterval(() => {
      this.processNext();
    }, 1000); // Check every second
  }

  /**
   * Process next job in queue
   */
  private async processNext() {
    // Check if we can process more jobs
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Get next job
    const job = this.queue.find(j => j.status === 'pending');
    if (!job) return;

    // Mark as processing
    job.status = 'processing';
    job.startedAt = new Date();
    this.processing.set(job.id, job);
    
    // Remove from queue
    this.queue = this.queue.filter(j => j.id !== job.id);

    this.emit('job:started', job);

    try {
      // Process based on type
      let result;
      if (job.type === 'comfyui') {
        result = await this.processComfyUIJob(job);
      } else {
        result = await this.processA1111Job(job);
      }

      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      
      // Update stats
      this.stats.totalProcessed++;
      this.stats.totalProcessingTime += 
        (job.completedAt.getTime() - job.startedAt!.getTime()) / 1000;

      this.emit('job:completed', job);
    } catch (error) {
      // Handle failure
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      
      // Retry logic
      if (job.retries < 3) {
        job.retries++;
        job.status = 'pending';
        this.queue.push(job); // Add back to queue
        this.emit('job:retry', job);
      } else {
        this.stats.totalFailed++;
        this.emit('job:failed', job);
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Process ComfyUI job
   */
  private async processComfyUIJob(job: QueueJob): Promise<any> {
    const response = await fetch('http://localhost:8188/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: job.payload.workflow,
        client_id: `queue_${job.id}`
      })
    });

    if (!response.ok) {
      throw new Error(`ComfyUI error: ${response.statusText}`);
    }

    const result = await response.json();
    const promptId = result.prompt_id;

    // Wait for completion
    return await this.waitForComfyUICompletion(promptId);
  }

  /**
   * Process A1111 job
   */
  private async processA1111Job(job: QueueJob): Promise<any> {
    const response = await fetch('http://localhost:7860/sdapi/v1/img2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.payload)
    });

    if (!response.ok) {
      throw new Error(`A1111 error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Wait for ComfyUI completion
   */
  private async waitForComfyUICompletion(
    promptId: string,
    maxAttempts = 300 // 5 minutes
  ): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`http://localhost:8188/history/${promptId}`);
      const history = await response.json();
      
      if (history[promptId]?.status?.completed) {
        return history[promptId];
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('ComfyUI processing timeout');
  }

  /**
   * Calculate GPU utilization
   */
  private calculateGPUUtilization(): number {
    // Estimate based on processing jobs
    // Each job uses roughly 50% GPU on Mac Studio
    return Math.min(100, this.processing.size * 50);
  }

  /**
   * Get VRAM usage from ComfyUI (synchronous cached version)
   */
  private cachedVRAMUsage: number = 0;
  private lastVRAMCheck: number = 0;
  
  private getVRAMUsage(): number {
    // Update cache every 5 seconds
    if (Date.now() - this.lastVRAMCheck > 5000) {
      this.updateVRAMUsage();
    }
    return this.cachedVRAMUsage;
  }
  
  private async updateVRAMUsage(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8188/system_stats');
      const stats = await response.json();
      const device = stats.devices[0];
      if (device) {
        const used = device.vram_total - device.vram_free;
        this.cachedVRAMUsage = (used / device.vram_total) * 100;
        this.lastVRAMCheck = Date.now();
      }
    } catch (error) {
      console.error('Failed to get VRAM stats:', error);
    }
  }

  /**
   * Clear completed/failed jobs older than specified time
   */
  clearOldJobs(olderThanMinutes = 60) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    this.queue = this.queue.filter(job => {
      if (job.status === 'completed' || job.status === 'failed') {
        return job.completedAt && job.completedAt > cutoff;
      }
      return true;
    });
  }

  /**
   * Stop processing
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }
}

// Singleton instance
let queueInstance: ModelProcessingQueue | null = null;

export function getQueue(): ModelProcessingQueue {
  if (!queueInstance) {
    // Mac Studio can handle 2-3 concurrent SD jobs efficiently
    queueInstance = new ModelProcessingQueue(2);
  }
  return queueInstance;
}

export default ModelProcessingQueue;