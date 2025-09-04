#!/usr/bin/env node

/**
 * Vercel Deployment Monitoring Script
 * 
 * This script provides comprehensive monitoring for Vercel deployments:
 * - Checks deployment status via Vercel CLI
 * - Retrieves deployment logs when failures occur
 * - Verifies if the site is actually working despite "failed" status
 * - Reports actionable information about deployment issues
 * 
 * Usage:
 *   node scripts/deployment-monitor.js [project-name]
 *   node scripts/deployment-monitor.js oil-painting-app
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const https = require('https');
const http = require('http');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  // Default project name - can be overridden by command line arg
  defaultProject: 'oil-painting-app',
  
  // Number of recent deployments to check
  maxDeployments: 10,
  
  // Timeout for health checks (ms)
  healthCheckTimeout: 10000,
  
  // Retry attempts for CLI commands
  maxRetries: 3,
  
  // Health check endpoints to test
  healthEndpoints: [
    { path: '/', description: 'Homepage' },
    { path: '/api/health', description: 'Health API', optional: true },
    { path: '/login', description: 'Login page', optional: true }
  ]
};

class DeploymentMonitor {
  constructor(projectName = CONFIG.defaultProject) {
    this.projectName = projectName;
    this.results = {
      timestamp: new Date().toISOString(),
      project: projectName,
      deployments: [],
      healthChecks: [],
      summary: {},
      issues: [],
      recommendations: []
    };
  }

  // Execute Vercel CLI commands with retry logic
  async execVercel(command, retries = CONFIG.maxRetries) {
    try {
      console.log(`🔄 Executing: vercel ${command}`);
      const { stdout, stderr } = await execAsync(`vercel ${command}`);
      
      if (stderr && !stderr.includes('Vercel CLI')) {
        console.warn(`⚠️  Warning: ${stderr}`);
      }
      
      return stdout.trim();
    } catch (error) {
      if (retries > 0) {
        console.log(`🔄 Retrying command (${retries} attempts left)...`);
        await this.sleep(2000);
        return this.execVercel(command, retries - 1);
      }
      throw new Error(`Vercel CLI command failed: ${error.message}`);
    }
  }

  // Check if user is authenticated with Vercel
  async checkAuth() {
    try {
      const result = await this.execVercel('whoami');
      console.log(`✅ Authenticated as: ${result}`);
      return true;
    } catch (error) {
      console.error('❌ Not authenticated with Vercel. Run: vercel login');
      return false;
    }
  }

  // Get list of recent deployments
  async getDeployments() {
    try {
      console.log(`📋 Fetching deployments for project: ${this.projectName}`);
      const output = await this.execVercel(`list ${this.projectName}`);
      
      // Parse the deployments table
      const lines = output.split('\n');
      const deployments = [];
      let inTable = false;
      
      for (const line of lines) {
        if (line.includes('Age') && line.includes('Deployment') && line.includes('Status')) {
          inTable = true;
          continue;
        }
        
        if (inTable && line.trim() && !line.includes('─') && !line.includes('To display the next page')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const deployment = {
              age: parts[0],
              url: parts[1],
              status: parts[2].replace('●', '').trim(),
              environment: parts[3],
              duration: parts[4],
              username: parts[5] || 'unknown'
            };
            deployments.push(deployment);
          }
        }
        
        if (line.includes('To display the next page')) {
          break;
        }
      }
      
      this.results.deployments = deployments.slice(0, CONFIG.maxDeployments);
      console.log(`📊 Found ${deployments.length} recent deployments`);
      
      return deployments;
    } catch (error) {
      console.error(`❌ Failed to get deployments: ${error.message}`);
      this.results.issues.push(`Failed to retrieve deployments: ${error.message}`);
      return [];
    }
  }

  // Get detailed logs for a specific deployment
  async getDeploymentLogs(deploymentUrl) {
    try {
      console.log(`📄 Getting logs for: ${deploymentUrl}`);
      const output = await this.execVercel(`inspect --logs ${deploymentUrl}`);
      
      // Parse logs for common issues
      const issues = [];
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes('Error') || line.includes('Failed') || line.includes('⨯')) {
          issues.push(line.trim());
        }
      }
      
      return {
        rawLogs: output,
        issues: issues,
        hasErrors: issues.length > 0
      };
    } catch (error) {
      console.warn(`⚠️  Could not get logs for ${deploymentUrl}: ${error.message}`);
      return {
        rawLogs: `Log retrieval failed: ${error.message}`,
        issues: [`Log retrieval failed: ${error.message}`],
        hasErrors: true
      };
    }
  }

  // Perform HTTP health check on a URL
  async healthCheck(url, endpoint) {
    return new Promise((resolve) => {
      const fullUrl = `${url}${endpoint.path}`;
      const urlObj = new URL(fullUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      console.log(`🏥 Health check: ${fullUrl}`);
      
      const req = client.request(fullUrl, { 
        method: 'HEAD',
        timeout: CONFIG.healthCheckTimeout
      }, (res) => {
        const result = {
          endpoint: endpoint.path,
          description: endpoint.description,
          status: res.statusCode,
          success: res.statusCode < 400 || (endpoint.optional && res.statusCode < 500),
          responseTime: Date.now() - startTime,
          headers: res.headers
        };
        
        console.log(`${result.success ? '✅' : '❌'} ${endpoint.description}: ${res.statusCode}`);
        resolve(result);
      });
      
      const startTime = Date.now();
      
      req.on('error', (error) => {
        const result = {
          endpoint: endpoint.path,
          description: endpoint.description,
          status: 0,
          success: endpoint.optional || false,
          responseTime: Date.now() - startTime,
          error: error.message
        };
        
        console.log(`${result.success ? '⚠️' : '❌'} ${endpoint.description}: ${error.message}`);
        resolve(result);
      });
      
      req.on('timeout', () => {
        req.destroy();
        const result = {
          endpoint: endpoint.path,
          description: endpoint.description,
          status: 0,
          success: endpoint.optional || false,
          responseTime: CONFIG.healthCheckTimeout,
          error: 'Timeout'
        };
        
        console.log(`${result.success ? '⚠️' : '❌'} ${endpoint.description}: Timeout`);
        resolve(result);
      });
      
      req.end();
    });
  }

  // Test all health check endpoints for a deployment
  async testDeploymentHealth(deploymentUrl) {
    console.log(`🏥 Testing health for: ${deploymentUrl}`);
    
    const healthResults = [];
    
    for (const endpoint of CONFIG.healthEndpoints) {
      const result = await this.healthCheck(deploymentUrl, endpoint);
      healthResults.push(result);
    }
    
    return healthResults;
  }

  // Analyze deployment patterns and provide recommendations
  analyzeDeployments() {
    const deployments = this.results.deployments;
    const analysis = {
      total: deployments.length,
      successful: deployments.filter(d => d.status === 'Ready').length,
      failed: deployments.filter(d => d.status === 'Error').length,
      building: deployments.filter(d => d.status === 'Building').length,
      recentPattern: []
    };
    
    // Analyze recent pattern (last 5 deployments)
    const recent = deployments.slice(0, 5);
    analysis.recentPattern = recent.map(d => d.status);
    
    // Calculate failure rate
    analysis.failureRate = analysis.total > 0 ? (analysis.failed / analysis.total * 100).toFixed(1) : 0;
    
    // Generate recommendations
    const recommendations = [];
    
    if (analysis.failureRate > 50) {
      recommendations.push('High failure rate detected. Consider reviewing build configuration.');
    }
    
    if (analysis.recentPattern.filter(s => s === 'Error').length >= 3) {
      recommendations.push('Multiple consecutive failures. Check for persistent build issues.');
    }
    
    if (analysis.failed > 0 && analysis.successful > 0) {
      recommendations.push('Inconsistent deployments. Compare successful vs failed deployment logs.');
    }
    
    this.results.summary = analysis;
    this.results.recommendations.push(...recommendations);
    
    return analysis;
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main monitoring function
  async monitor() {
    console.log(`🚀 Starting deployment monitoring for: ${this.projectName}`);
    console.log(`📅 Timestamp: ${this.results.timestamp}\n`);
    
    try {
      // Check authentication
      if (!await this.checkAuth()) {
        return this.results;
      }
      
      // Get deployment list
      const deployments = await this.getDeployments();
      
      if (deployments.length === 0) {
        console.log('❌ No deployments found');
        this.results.issues.push('No deployments found for project');
        return this.results;
      }
      
      // Analyze the most recent deployment
      const latestDeployment = deployments[0];
      console.log(`\n🔍 Analyzing latest deployment:`);
      console.log(`   Status: ${latestDeployment.status}`);
      console.log(`   Age: ${latestDeployment.age}`);
      console.log(`   URL: ${latestDeployment.url}`);
      
      // Get logs for failed deployments
      if (latestDeployment.status === 'Error') {
        console.log(`\n📄 Getting logs for failed deployment...`);
        const logs = await this.getDeploymentLogs(latestDeployment.url);
        latestDeployment.logs = logs;
        
        if (logs.issues.length > 0) {
          console.log(`❌ Build issues found:`);
          logs.issues.forEach(issue => console.log(`   - ${issue}`));
          this.results.issues.push(...logs.issues);
        }
      }
      
      // Test health of the production URL (from project list)
      const prodUrl = `https://${this.projectName}-thetangstrs-projects.vercel.app`;
      console.log(`\n🏥 Testing production site health: ${prodUrl}`);
      
      const healthResults = await this.testDeploymentHealth(prodUrl);
      this.results.healthChecks = healthResults;
      
      // If latest deployment failed but site is accessible, note the discrepancy
      const siteAccessible = healthResults.some(h => h.success);
      if (latestDeployment.status === 'Error' && siteAccessible) {
        console.log(`\n🤔 Interesting: Latest deployment shows "Error" but site is accessible!`);
        console.log(`   This suggests the previous successful deployment is still serving.`);
        this.results.issues.push('Deployment status mismatch: showing Error but site is accessible');
      }
      
      // Analyze patterns
      console.log(`\n📊 Analyzing deployment patterns...`);
      this.analyzeDeployments();
      
      // Display summary
      console.log(`\n📋 SUMMARY:`);
      console.log(`   Total deployments: ${this.results.summary.total}`);
      console.log(`   Successful: ${this.results.summary.successful}`);
      console.log(`   Failed: ${this.results.summary.failed}`);
      console.log(`   Failure rate: ${this.results.summary.failureRate}%`);
      
      if (this.results.recommendations.length > 0) {
        console.log(`\n💡 RECOMMENDATIONS:`);
        this.results.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
      
      if (this.results.issues.length > 0) {
        console.log(`\n⚠️  ISSUES FOUND:`);
        this.results.issues.forEach(issue => console.log(`   - ${issue}`));
      }
      
    } catch (error) {
      console.error(`❌ Monitoring failed: ${error.message}`);
      this.results.issues.push(`Monitoring failed: ${error.message}`);
    }
    
    return this.results;
  }

  // Export results to JSON file
  async exportResults() {
    const fs = require('fs').promises;
    const filename = `deployment-monitor-${this.projectName}-${Date.now()}.json`;
    const filepath = `./test-results/${filename}`;
    
    try {
      await fs.mkdir('./test-results', { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
      console.log(`\n📄 Results exported to: ${filepath}`);
    } catch (error) {
      console.warn(`⚠️  Could not export results: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const projectName = process.argv[2] || CONFIG.defaultProject;
  
  console.log('🔍 Vercel Deployment Monitor');
  console.log('================================');
  
  const monitor = new DeploymentMonitor(projectName);
  const results = await monitor.monitor();
  
  // Export results
  await monitor.exportResults();
  
  // Exit with appropriate code
  const hasIssues = results.issues.length > 0;
  const allHealthy = results.healthChecks.every(h => h.success);
  
  if (hasIssues && !allHealthy) {
    console.log('\n❌ Monitoring completed with issues');
    process.exit(1);
  } else if (hasIssues && allHealthy) {
    console.log('\n⚠️  Monitoring completed with warnings (but site is healthy)');
    process.exit(0);
  } else {
    console.log('\n✅ Monitoring completed successfully');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { DeploymentMonitor, CONFIG };