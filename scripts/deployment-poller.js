#!/usr/bin/env node

/**
 * PixCart Deployment Poller
 * 
 * Continuously polls Vercel deployment status until deployment is complete.
 * Used by Git hooks to wait for deployments and trigger appropriate monitoring.
 * 
 * Features:
 * - Smart polling with exponential backoff
 * - Deployment completion detection
 * - Status change notifications
 * - Timeout handling
 * - Integration with monitoring system
 * 
 * Usage:
 *   node scripts/deployment-poller.js [project-name] [max-wait-minutes]
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

// Configuration
const CONFIG = {
  defaultProject: 'oil-painting-app',
  defaultMaxWaitMinutes: 10,
  initialPollInterval: 10000,  // 10 seconds
  maxPollInterval: 60000,      // 60 seconds
  backoffMultiplier: 1.2,
  maxConsecutiveFailures: 5,
  statusFile: './deployment-poll-status.json'
};

class DeploymentPoller {
  constructor(projectName, maxWaitMinutes) {
    this.projectName = projectName || CONFIG.defaultProject;
    this.maxWaitMinutes = maxWaitMinutes || CONFIG.defaultMaxWaitMinutes;
    this.maxWaitMs = this.maxWaitMinutes * 60 * 1000;
    
    this.startTime = Date.now();
    this.pollInterval = CONFIG.initialPollInterval;
    this.consecutiveFailures = 0;
    this.lastStatus = null;
    this.pollCount = 0;
    
    this.status = {
      startTime: new Date().toISOString(),
      project: this.projectName,
      maxWaitMinutes: this.maxWaitMinutes,
      polling: true,
      currentStatus: 'starting',
      pollCount: 0,
      deployments: [],
      lastUpdate: new Date().toISOString()
    };
  }

  // Log with timestamp
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      polling: '🔄'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  // Update status file
  async updateStatus() {
    try {
      await fs.writeFile(CONFIG.statusFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      // Don't fail polling if we can't write status
      this.log(`Warning: Could not update status file: ${error.message}`, 'warning');
    }
  }

  // Check if Vercel CLI is available
  async checkVercelCLI() {
    try {
      await execAsync('vercel --version');
      return true;
    } catch (error) {
      this.log('Vercel CLI not available - falling back to basic polling', 'warning');
      return false;
    }
  }

  // Get deployment status using Vercel CLI
  async getDeploymentStatus() {
    try {
      const { stdout } = await execAsync(`vercel ls --scope pixcart ${this.projectName} --meta gitCommitSha --limit 5`);
      
      // Parse Vercel output (simplified - real implementation would be more robust)
      const lines = stdout.split('\n').filter(line => line.trim());
      const deployments = [];
      
      for (const line of lines) {
        if (line.includes('http') && (line.includes('Ready') || line.includes('Building') || line.includes('Error'))) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            deployments.push({
              url: parts[0],
              status: parts[1],
              age: parts[2],
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      return deployments;
    } catch (error) {
      this.consecutiveFailures++;
      throw new Error(`Failed to get deployment status: ${error.message}`);
    }
  }

  // Check deployment completion
  isDeploymentComplete(deployments) {
    if (deployments.length === 0) {
      return { complete: false, reason: 'No deployments found' };
    }

    const latestDeployment = deployments[0];
    
    if (latestDeployment.status === 'Ready') {
      return { complete: true, status: 'success', deployment: latestDeployment };
    } else if (latestDeployment.status === 'Error') {
      return { complete: true, status: 'failed', deployment: latestDeployment };
    } else if (latestDeployment.status === 'Building' || latestDeployment.status === 'Queued') {
      return { complete: false, reason: `Deployment is ${latestDeployment.status.toLowerCase()}` };
    }
    
    return { complete: false, reason: `Unknown status: ${latestDeployment.status}` };
  }

  // Calculate next poll interval with exponential backoff
  calculateNextInterval() {
    const newInterval = Math.min(this.pollInterval * CONFIG.backoffMultiplier, CONFIG.maxPollInterval);
    this.pollInterval = newInterval;
    return newInterval;
  }

  // Main polling loop
  async poll() {
    this.log(`Starting deployment polling for ${this.projectName}`, 'polling');
    this.log(`Maximum wait time: ${this.maxWaitMinutes} minutes`);

    // Check if Vercel CLI is available
    const hasVercelCLI = await this.checkVercelCLI();
    if (!hasVercelCLI) {
      // Fallback to simple time-based waiting
      return await this.fallbackPoll();
    }

    while (Date.now() - this.startTime < this.maxWaitMs) {
      this.pollCount++;
      this.status.pollCount = this.pollCount;
      
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      this.log(`Poll #${this.pollCount} (${elapsed}s elapsed)`, 'polling');

      try {
        // Get current deployment status
        const deployments = await this.getDeploymentStatus();
        this.status.deployments = deployments;
        this.status.lastUpdate = new Date().toISOString();

        // Check if deployment is complete
        const completion = this.isDeploymentComplete(deployments);
        
        if (completion.complete) {
          this.status.polling = false;
          this.status.currentStatus = completion.status;
          this.status.finalDeployment = completion.deployment;
          
          await this.updateStatus();
          
          if (completion.status === 'success') {
            this.log(`✅ Deployment completed successfully!`, 'success');
            this.log(`🌐 URL: ${completion.deployment.url}`, 'success');
            return { success: true, deployment: completion.deployment, pollCount: this.pollCount };
          } else {
            this.log(`❌ Deployment failed`, 'error');
            return { success: false, error: 'Deployment failed', deployment: completion.deployment, pollCount: this.pollCount };
          }
        }

        // Still building/queued
        this.log(`🔄 ${completion.reason}`, 'polling');
        this.status.currentStatus = completion.reason;
        
        // Reset consecutive failures on success
        this.consecutiveFailures = 0;

      } catch (error) {
        this.log(`Error during polling: ${error.message}`, 'error');
        
        if (this.consecutiveFailures >= CONFIG.maxConsecutiveFailures) {
          this.log(`❌ Too many consecutive failures (${this.consecutiveFailures})`, 'error');
          this.status.polling = false;
          this.status.currentStatus = 'failed';
          await this.updateStatus();
          return { success: false, error: 'Too many polling failures', pollCount: this.pollCount };
        }
      }

      // Wait before next poll
      const nextInterval = this.calculateNextInterval();
      this.log(`⏳ Waiting ${Math.round(nextInterval/1000)}s before next poll...`, 'polling');
      
      await this.updateStatus();
      await new Promise(resolve => setTimeout(resolve, nextInterval));
    }

    // Timeout reached
    this.log(`⏰ Polling timeout reached (${this.maxWaitMinutes} minutes)`, 'warning');
    this.status.polling = false;
    this.status.currentStatus = 'timeout';
    await this.updateStatus();
    
    return { success: false, error: 'Polling timeout', pollCount: this.pollCount };
  }

  // Fallback polling when Vercel CLI is not available
  async fallbackPoll() {
    this.log('Using fallback polling (time-based waiting)', 'warning');
    
    // Wait a reasonable amount of time for deployment
    const fallbackWaitTime = Math.min(this.maxWaitMs, 3 * 60 * 1000); // Max 3 minutes
    this.log(`⏳ Waiting ${Math.round(fallbackWaitTime/1000)} seconds for deployment...`, 'polling');
    
    this.status.currentStatus = 'waiting';
    await this.updateStatus();
    
    await new Promise(resolve => setTimeout(resolve, fallbackWaitTime));
    
    this.log('⏰ Fallback wait completed', 'info');
    this.status.polling = false;
    this.status.currentStatus = 'completed';
    await this.updateStatus();
    
    return { success: true, fallback: true, message: 'Completed fallback wait' };
  }

  // Cleanup status file
  async cleanup() {
    try {
      await fs.unlink(CONFIG.statusFile);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
async function main() {
  const projectName = process.argv[2];
  const maxWaitMinutes = parseInt(process.argv[3]) || CONFIG.defaultMaxWaitMinutes;
  
  console.log('🚀 PixCart Deployment Poller');
  console.log('============================');
  
  const poller = new DeploymentPoller(projectName, maxWaitMinutes);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⚠️ Polling interrupted by user');
    await poller.cleanup();
    process.exit(130);
  });

  try {
    const result = await poller.poll();
    
    console.log('\n📊 Polling Results:');
    console.log('==================');
    console.log(`Success: ${result.success}`);
    console.log(`Poll Count: ${result.pollCount || 0}`);
    
    if (result.success) {
      if (result.fallback) {
        console.log(`✅ Completed using fallback method`);
        console.log(`ℹ️ ${result.message}`);
      } else {
        console.log(`✅ Deployment successful`);
        console.log(`🌐 URL: ${result.deployment.url}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
    
    await poller.cleanup();
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error(`💥 Polling failed: ${error.message}`);
    await poller.cleanup();
    process.exit(1);
  }
}

// Export for use as module
module.exports = { DeploymentPoller, CONFIG };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}