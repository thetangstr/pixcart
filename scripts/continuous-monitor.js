#!/usr/bin/env node

/**
 * Continuous Deployment Monitoring Agent
 * 
 * This script runs continuously to monitor deployments and health status
 * without requiring manual intervention. It automatically:
 * - Detects new deployments
 * - Monitors deployment progress  
 * - Runs health checks
 * - Reports status
 * - Takes corrective actions
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class ContinuousMonitor {
  constructor(options = {}) {
    this.projectName = options.projectName || 'oil-painting-app';
    this.baseUrl = options.baseUrl || 'https://oil-painting-app-thetangstrs-projects.vercel.app';
    this.interval = options.interval || 60000; // 1 minute default
    this.maxRetries = options.maxRetries || 3;
    this.isRunning = false;
    this.lastDeploymentId = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 5;
    
    // Monitoring state
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      uptime: 0,
      startTime: Date.now()
    };
  }

  async start() {
    console.log('🚀 Starting Continuous Deployment Monitor');
    console.log(`📦 Project: ${this.projectName}`);
    console.log(`🌐 URL: ${this.baseUrl}`);
    console.log(`⏱️  Check interval: ${this.interval / 1000}s`);
    console.log('=' .repeat(50));
    
    this.isRunning = true;
    this.metrics.startTime = Date.now();
    
    // Initial deployment check
    await this.checkDeploymentStatus();
    
    // Start continuous monitoring loop
    this.monitoringLoop();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop() {
    console.log('\n🛑 Stopping Continuous Monitor...');
    this.isRunning = false;
    
    // Generate final report
    await this.generateReport();
    
    console.log('👋 Monitor stopped gracefully');
    process.exit(0);
  }

  async monitoringLoop() {
    while (this.isRunning) {
      try {
        await this.performMonitoringCycle();
        
        // Reset consecutive failures on success
        this.consecutiveFailures = 0;
        
      } catch (error) {
        console.error(`❌ Monitoring cycle failed:`, error.message);
        this.consecutiveFailures++;
        
        // Stop if too many consecutive failures
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          console.error(`🚨 Too many consecutive failures (${this.consecutiveFailures}). Stopping monitor.`);
          await this.stop();
          return;
        }
      }
      
      // Wait for next cycle
      await this.sleep(this.interval);
    }
  }

  async performMonitoringCycle() {
    const cycleStart = Date.now();
    console.log(`\n🔍 Monitoring Cycle - ${new Date().toLocaleString()}`);
    
    this.metrics.totalChecks++;
    
    // Check for new deployments
    const deploymentStatus = await this.checkDeploymentStatus();
    
    // Run health checks
    const healthStatus = await this.runHealthChecks();
    
    // Update metrics
    const cycleTime = Date.now() - cycleStart;
    this.updateMetrics(healthStatus, cycleTime);
    
    // Log status summary
    this.logStatusSummary(deploymentStatus, healthStatus);
    
    // Save monitoring data
    await this.saveMonitoringData({
      timestamp: Date.now(),
      deployment: deploymentStatus,
      health: healthStatus,
      cycleTime
    });
  }

  async checkDeploymentStatus() {
    try {
      console.log('📋 Checking deployment status...');
      
      const { stdout } = await execAsync(`vercel list ${this.projectName}`);
      
      // Parse the deployment list manually since --json flag isn't available
      const lines = stdout.split('\n').filter(line => line.trim());
      const deployments = [];
      
      for (const line of lines) {
        if (line.includes('https://')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            deployments.push({
              uid: parts[0] || 'unknown',
              url: parts[1] || 'unknown',
              state: parts[2] || 'unknown',
              createdAt: Date.now() // Approximate timestamp
            });
          }
        }
      }
      
      if (!deployments || deployments.length === 0) {
        console.log('⚠️  No deployments found');
        return { status: 'no_deployments' };
      }
      
      const latestDeployment = deployments[0];
      const deploymentId = latestDeployment.uid;
      
      // Check if this is a new deployment
      if (this.lastDeploymentId !== deploymentId) {
        console.log(`🆕 New deployment detected: ${deploymentId}`);
        this.lastDeploymentId = deploymentId;
        
        // Run comprehensive monitoring for new deployments
        await this.runComprehensiveMonitoring(latestDeployment);
      }
      
      return {
        status: 'found',
        id: deploymentId,
        url: latestDeployment.url,
        state: latestDeployment.state,
        createdAt: latestDeployment.createdAt,
        isNew: this.lastDeploymentId !== deploymentId
      };
      
    } catch (error) {
      console.error('❌ Failed to check deployment status:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  async runHealthChecks() {
    try {
      console.log('🏥 Running health checks...');
      
      const healthEndpoints = [
        { path: '/', name: 'Homepage', critical: true },
        { path: '/api/auth/callback', name: 'Auth API', critical: true },
        { path: '/api/generate', name: 'Generate API', critical: false }
      ];
      
      const results = [];
      let totalResponseTime = 0;
      
      for (const endpoint of healthEndpoints) {
        const startTime = Date.now();
        
        try {
          const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
            method: 'GET',
            timeout: 10000,
            headers: { 'User-Agent': 'PixCart-Monitor/1.0' }
          });
          
          const responseTime = Date.now() - startTime;
          totalResponseTime += responseTime;
          
          const result = {
            endpoint: endpoint.name,
            path: endpoint.path,
            status: response.status,
            responseTime,
            success: response.status < 500,
            critical: endpoint.critical
          };
          
          results.push(result);
          
          const statusIcon = result.success ? '✅' : '❌';
          console.log(`  ${statusIcon} ${endpoint.name}: ${response.status} (${responseTime}ms)`);
          
        } catch (error) {
          const responseTime = Date.now() - startTime;
          
          results.push({
            endpoint: endpoint.name,
            path: endpoint.path,
            status: 0,
            responseTime,
            success: false,
            critical: endpoint.critical,
            error: error.message
          });
          
          console.log(`  ❌ ${endpoint.name}: ${error.message}`);
        }
      }
      
      // Calculate health metrics
      const successCount = results.filter(r => r.success).length;
      const criticalFailures = results.filter(r => !r.success && r.critical).length;
      const healthScore = (successCount / results.length) * 100;
      const avgResponseTime = totalResponseTime / results.length;
      
      return {
        status: criticalFailures === 0 ? 'healthy' : 'unhealthy',
        healthScore,
        avgResponseTime,
        results,
        criticalFailures
      };
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return {
        status: 'error',
        error: error.message,
        healthScore: 0,
        results: []
      };
    }
  }

  async runComprehensiveMonitoring(deployment) {
    console.log('🔍 Running comprehensive monitoring for new deployment...');
    
    try {
      // Run the full monitoring script
      const { stdout, stderr } = await execAsync('./monitor.sh --json', { 
        timeout: 120000 // 2 minute timeout
      });
      
      console.log('✅ Comprehensive monitoring completed');
      
      // Parse results if JSON output is available
      try {
        const results = JSON.parse(stdout);
        await this.saveComprehensiveResults(deployment.uid, results);
      } catch (parseError) {
        console.log('⚠️  Could not parse monitoring results as JSON');
      }
      
    } catch (error) {
      console.error('❌ Comprehensive monitoring failed:', error.message);
    }
  }

  updateMetrics(healthStatus, cycleTime) {
    if (healthStatus.status === 'healthy') {
      this.metrics.successfulChecks++;
    } else {
      this.metrics.failedChecks++;
    }
    
    // Update average response time
    if (healthStatus.avgResponseTime) {
      const totalResponses = this.metrics.successfulChecks + this.metrics.failedChecks;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (totalResponses - 1) + healthStatus.avgResponseTime) / totalResponses;
    }
    
    // Calculate uptime percentage
    this.metrics.uptime = (this.metrics.successfulChecks / this.metrics.totalChecks) * 100;
  }

  logStatusSummary(deploymentStatus, healthStatus) {
    const uptime = this.metrics.uptime.toFixed(1);
    const avgResponseTime = Math.round(this.metrics.averageResponseTime);
    
    console.log('\n📊 Status Summary:');
    console.log(`   Health: ${healthStatus.status} (${healthStatus.healthScore?.toFixed(1)}%)`);
    console.log(`   Uptime: ${uptime}% (${this.metrics.successfulChecks}/${this.metrics.totalChecks})`);
    console.log(`   Avg Response: ${avgResponseTime}ms`);
    console.log(`   Runtime: ${Math.round((Date.now() - this.metrics.startTime) / 1000)}s`);
  }

  async saveMonitoringData(data) {
    try {
      const resultsDir = path.join(process.cwd(), 'test-results');
      await fs.mkdir(resultsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `continuous-monitor-${timestamp}.json`;
      const filepath = path.join(resultsDir, filename);
      
      const monitoringData = {
        ...data,
        metrics: this.metrics,
        config: {
          projectName: this.projectName,
          baseUrl: this.baseUrl,
          interval: this.interval
        }
      };
      
      await fs.writeFile(filepath, JSON.stringify(monitoringData, null, 2));
      
    } catch (error) {
      console.error('⚠️  Failed to save monitoring data:', error.message);
    }
  }

  async saveComprehensiveResults(deploymentId, results) {
    try {
      const resultsDir = path.join(process.cwd(), 'test-results');
      await fs.mkdir(resultsDir, { recursive: true });
      
      const filename = `comprehensive-monitor-${deploymentId}.json`;
      const filepath = path.join(resultsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(results, null, 2));
      console.log(`💾 Comprehensive results saved: ${filename}`);
      
    } catch (error) {
      console.error('⚠️  Failed to save comprehensive results:', error.message);
    }
  }

  async generateReport() {
    const runtime = Date.now() - this.metrics.startTime;
    const runtimeHours = (runtime / (1000 * 60 * 60)).toFixed(2);
    
    const report = `
# Continuous Monitoring Report

**Runtime:** ${runtimeHours} hours
**Total Checks:** ${this.metrics.totalChecks}
**Successful:** ${this.metrics.successfulChecks}
**Failed:** ${this.metrics.failedChecks}
**Uptime:** ${this.metrics.uptime.toFixed(2)}%
**Avg Response Time:** ${Math.round(this.metrics.averageResponseTime)}ms

**Configuration:**
- Project: ${this.projectName}
- URL: ${this.baseUrl}
- Check Interval: ${this.interval / 1000}s
- Max Retries: ${this.maxRetries}

Generated at: ${new Date().toISOString()}
    `.trim();
    
    console.log('\n📋 Final Report:');
    console.log('=' .repeat(50));
    console.log(report);
    
    // Save report to file
    try {
      await fs.writeFile('monitoring-report.md', report);
      console.log('💾 Report saved to monitoring-report.md');
    } catch (error) {
      console.error('⚠️  Failed to save report:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Command line interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--interval' && i + 1 < args.length) {
      options.interval = parseInt(args[i + 1]) * 1000; // Convert to milliseconds
      i++;
    } else if (arg === '--project' && i + 1 < args.length) {
      options.projectName = args[i + 1];
      i++;
    } else if (arg === '--url' && i + 1 < args.length) {
      options.baseUrl = args[i + 1];
      i++;
    }
  }
  
  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  const monitor = new ContinuousMonitor(options);
  
  monitor.start().catch(error => {
    console.error('❌ Monitor failed to start:', error);
    process.exit(1);
  });
}

module.exports = ContinuousMonitor;