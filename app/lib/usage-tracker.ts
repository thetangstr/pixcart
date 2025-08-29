/**
 * Usage Tracking System
 * 
 * Tracks user image generation usage to determine when to upgrade from SDXL to Gemini
 * After 3+ generations, users get access to premium Gemini 2.5 Flash
 */

export interface UserUsage {
  sessionId: string;
  totalGenerations: number;
  sdxlGenerations: number;
  geminiGenerations: number;
  createdAt: string;
  lastUsed: string;
  upgradeEligible: boolean; // True after 3+ generations
}

export class UsageTracker {
  private static STORAGE_KEY = 'petcanvas_usage';
  private static UPGRADE_THRESHOLD = 3; // Upgrade to Gemini after 3 generations

  /**
   * Get current user usage from localStorage
   */
  static getCurrentUsage(sessionId?: string): UserUsage {
    if (typeof window === 'undefined') {
      // Server-side: return default
      return this.createDefaultUsage(sessionId || 'server');
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const usage: UserUsage = JSON.parse(stored);
        // Update session ID if provided
        if (sessionId && usage.sessionId !== sessionId) {
          usage.sessionId = sessionId;
        }
        return usage;
      }
    } catch (error) {
      console.warn('Failed to load usage data:', error);
    }

    return this.createDefaultUsage(sessionId || this.generateSessionId());
  }

  /**
   * Record a new image generation
   */
  static recordGeneration(model: 'sdxl' | 'gemini', sessionId?: string): UserUsage {
    const usage = this.getCurrentUsage(sessionId);
    
    // Update counters
    usage.totalGenerations += 1;
    if (model === 'sdxl') {
      usage.sdxlGenerations += 1;
    } else {
      usage.geminiGenerations += 1;
    }
    
    // Update timestamps
    usage.lastUsed = new Date().toISOString();
    
    // Check if user is now eligible for upgrade
    usage.upgradeEligible = usage.totalGenerations >= this.UPGRADE_THRESHOLD;
    
    // Save to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
      } catch (error) {
        console.warn('Failed to save usage data:', error);
      }
    }
    
    return usage;
  }

  /**
   * Check if user should get Gemini model
   */
  static shouldUseGemini(sessionId?: string): boolean {
    const usage = this.getCurrentUsage(sessionId);
    return usage.upgradeEligible;
  }

  /**
   * Get recommended model for user
   */
  static getRecommendedModel(sessionId?: string): 'sdxl' | 'gemini' {
    return this.shouldUseGemini(sessionId) ? 'gemini' : 'sdxl';
  }

  /**
   * Get user's progress towards Gemini upgrade
   */
  static getUpgradeProgress(sessionId?: string): {
    current: number;
    required: number;
    remaining: number;
    eligible: boolean;
    percentage: number;
  } {
    const usage = this.getCurrentUsage(sessionId);
    const remaining = Math.max(0, this.UPGRADE_THRESHOLD - usage.totalGenerations);
    const percentage = Math.min(100, (usage.totalGenerations / this.UPGRADE_THRESHOLD) * 100);

    return {
      current: usage.totalGenerations,
      required: this.UPGRADE_THRESHOLD,
      remaining,
      eligible: usage.upgradeEligible,
      percentage
    };
  }

  /**
   * Get usage statistics
   */
  static getUsageStats(sessionId?: string): {
    total: number;
    sdxl: number;
    gemini: number;
    upgradeEligible: boolean;
    sessionDuration: number; // in hours
  } {
    const usage = this.getCurrentUsage(sessionId);
    const createdAt = new Date(usage.createdAt);
    const now = new Date();
    const sessionDuration = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    return {
      total: usage.totalGenerations,
      sdxl: usage.sdxlGenerations,
      gemini: usage.geminiGenerations,
      upgradeEligible: usage.upgradeEligible,
      sessionDuration
    };
  }

  /**
   * Reset usage data (for testing or new sessions)
   */
  static resetUsage(): UserUsage {
    const usage = this.createDefaultUsage(this.generateSessionId());
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
      } catch (error) {
        console.warn('Failed to reset usage data:', error);
      }
    }
    
    return usage;
  }

  /**
   * Create default usage object
   */
  private static createDefaultUsage(sessionId: string): UserUsage {
    const now = new Date().toISOString();
    return {
      sessionId,
      totalGenerations: 0,
      sdxlGenerations: 0,
      geminiGenerations: 0,
      createdAt: now,
      lastUsed: now,
      upgradeEligible: false
    };
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export usage data for analytics
   */
  static exportUsageData(sessionId?: string): string {
    const usage = this.getCurrentUsage(sessionId);
    const stats = this.getUsageStats(sessionId);
    const progress = this.getUpgradeProgress(sessionId);

    return JSON.stringify({
      usage,
      stats,
      progress,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

export default UsageTracker;