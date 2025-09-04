#!/usr/bin/env node

/**
 * Comprehensive Deployment Monitoring System for PixCart
 * 
 * This script combines deployment monitoring and API health checks to provide
 * complete visibility into the application's deployment status and health.
 * 
 * Features:
 * - Deployment status monitoring via Vercel CLI
 * - API endpoint health checks
 * - Performance monitoring
 * - Issue detection and recommendations
 * - Automated reporting
 * - Integration with CI/CD workflows
 * 
 * Usage:
 *   node scripts/comprehensive-monitor.js [project-name] [base-url]
 *   node scripts/comprehensive-monitor.js oil-painting-app https://oil-painting-app-thetangstrs-projects.vercel.app
 * 
 * Environment Variables:
 *   MONITOR_SLACK_WEBHOOK - Slack webhook for notifications
 *   MONITOR_EMAIL_RECIPIENT - Email for critical alerts
 *   MONITOR_SEVERITY_THRESHOLD - Minimum severity level for alerts (low|medium|high|critical)
 */

const { DeploymentMonitor } = require('./deployment-monitor');
const { APIHealthChecker } = require('./api-health-check');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  defaultProject: 'oil-painting-app',
  defaultBaseUrl: 'https://oil-painting-app-thetangstrs-projects.vercel.app',
  
  // Monitoring intervals
  intervals: {
    quick: 300,    // 5 minutes
    standard: 900, // 15 minutes
    extended: 3600 // 1 hour
  },
  
  // Alert thresholds
  thresholds: {
    maxFailureRate: 25, // % of deployments that can fail
    maxResponseTime: 5000, // ms
    minSuccessfulEndpoints: 80, // % of endpoints that must be healthy
    maxConsecutiveFailures: 3
  },
  
  // Severity levels
  severity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
};

class ComprehensiveMonitor {
  constructor(projectName, baseUrl) {
    this.projectName = projectName || CONFIG.defaultProject;
    this.baseUrl = baseUrl || CONFIG.defaultBaseUrl;
    
    this.deploymentMonitor = new DeploymentMonitor(this.projectName);
    this.apiHealthChecker = new APIHealthChecker(this.baseUrl);
    
    this.results = {
      timestamp: new Date().toISOString(),
      project: this.projectName,
      baseUrl: this.baseUrl,
      deployment: null,
      apiHealth: null,
      overallStatus: 'unknown',
      severity: CONFIG.severity.LOW,
      alerts: [],
      recommendations: [],
      summary: {}
    };
  }

  // Run comprehensive monitoring
  async monitor() {
    console.log(`🚀 Starting comprehensive monitoring for PixCart`);
    console.log(`📦 Project: ${this.projectName}`);
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    console.log(`📅 Timestamp: ${this.results.timestamp}\n`);
    
    try {
      // Step 1: Check deployment status
      console.log('🔍 Phase 1: Deployment Monitoring');
      console.log('=====================================');
      this.results.deployment = await this.deploymentMonitor.monitor();
      
      console.log('\n🏥 Phase 2: API Health Checks');
      console.log('=====================================');
      this.results.apiHealth = await this.apiHealthChecker.runHealthChecks();
      
      // Step 3: Analyze combined results
      console.log('\n📊 Phase 3: Analysis & Recommendations');
      console.log('=====================================');
      this.analyzeResults();
      
      // Step 4: Generate alerts if needed
      this.generateAlerts();
      
      // Step 5: Display comprehensive summary
      this.displayComprehensiveSummary();
      
      // Step 6: Export results
      await this.exportResults();
      
      // Step 7: Send notifications if configured
      await this.sendNotifications();
      
    } catch (error) {
      console.error(`💥 Monitoring failed: ${error.message}`);
      this.results.alerts.push({
        severity: CONFIG.severity.CRITICAL,
        type: 'monitoring_failure',
        message: `Monitoring system failure: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.severity = CONFIG.severity.CRITICAL;
    }
    
    return this.results;
  }

  // Analyze combined deployment and health check results
  analyzeResults() {
    const deployment = this.results.deployment;
    const apiHealth = this.results.apiHealth;
    
    // Overall status determination
    let overallStatus = 'healthy';
    let severity = CONFIG.severity.LOW;
    
    // Check deployment status
    if (deployment.issues.length > 0) {
      const hasFailedDeployments = deployment.deployments.some(d => d.status === 'Error');
      const siteAccessible = deployment.healthChecks && deployment.healthChecks.some(h => h.success);
      
      if (hasFailedDeployments && !siteAccessible) {
        overallStatus = 'critical';
        severity = CONFIG.severity.CRITICAL;
      } else if (hasFailedDeployments && siteAccessible) {
        overallStatus = 'warning';
        severity = CONFIG.severity.MEDIUM;
      }
    }
    
    // Check API health status
    if (apiHealth.summary.failed > 0) {
      const successRate = (apiHealth.summary.passed / (apiHealth.summary.total - apiHealth.summary.skipped)) * 100;
      
      if (successRate < CONFIG.thresholds.minSuccessfulEndpoints) {
        overallStatus = 'critical';
        severity = Math.max(severity, CONFIG.severity.HIGH);
      } else {
        overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
        severity = Math.max(severity, CONFIG.severity.MEDIUM);
      }
    }
    
    // Performance analysis
    if (apiHealth.performance.averageTime > CONFIG.thresholds.maxResponseTime) {
      overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
      severity = Math.max(severity, CONFIG.severity.MEDIUM);
    }
    
    // Failure pattern analysis
    if (deployment.summary.failureRate > CONFIG.thresholds.maxFailureRate) {
      const recentFailures = deployment.summary.recentPattern.filter(s => s === 'Error').length;
      if (recentFailures >= CONFIG.thresholds.maxConsecutiveFailures) {
        overallStatus = 'critical';
        severity = CONFIG.severity.HIGH;
      }
    }
    
    this.results.overallStatus = overallStatus;
    this.results.severity = severity;
    
    // Generate comprehensive recommendations
    this.generateRecommendations();
  }

  // Generate actionable recommendations
  generateRecommendations() {
    const recommendations = [];
    const deployment = this.results.deployment;
    const apiHealth = this.results.apiHealth;
    
    // Deployment recommendations
    if (deployment.summary.failureRate > 20) {
      if (deployment.issues.some(issue => issue.includes('FileUpload') || issue.includes('Element type is invalid'))) {
        recommendations.push({
          priority: 'high',
          category: 'build',
          title: 'Fix Component Import Issues',
          description: 'Build failures are caused by component import/export mismatches. Check FileUpload component exports.',
          action: 'Review component imports in detailed/page.tsx and simple/page.tsx files'
        });
      }
      
      recommendations.push({
        priority: 'medium',
        category: 'deployment',
        title: 'High Deployment Failure Rate',
        description: `${deployment.summary.failureRate}% of recent deployments have failed`,
        action: 'Review build process and fix recurring build issues'
      });
    }
    
    // API Health recommendations
    if (apiHealth.summary.failed > 2) {
      const authFailures = apiHealth.tests.filter(t => t.status === 401).length;
      if (authFailures > 1) {
        recommendations.push({
          priority: 'medium',
          category: 'authentication',
          title: 'Authentication Issues Detected',
          description: `${authFailures} endpoints returned 401 Unauthorized`,
          action: 'Verify authentication flow and API endpoint protection'
        });
      }
    }
    
    // Performance recommendations
    if (apiHealth.performance.averageTime > CONFIG.thresholds.maxResponseTime) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Slow API Response Times',
        description: `Average response time is ${apiHealth.performance.averageTime}ms`,
        action: 'Optimize database queries and consider caching strategies'
      });
    }
    
    // Infrastructure recommendations
    if (deployment.healthChecks && deployment.healthChecks.some(h => !h.success)) {
      recommendations.push({
        priority: 'high',
        category: 'infrastructure',
        title: 'Site Accessibility Issues',
        description: 'Production site is not accessible despite successful deployments',
        action: 'Check domain configuration and Vercel project settings'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  // Generate alerts based on severity and thresholds
  generateAlerts() {
    const alerts = [];
    
    // Critical: Site completely down
    if (this.results.overallStatus === 'critical') {
      alerts.push({
        severity: CONFIG.severity.CRITICAL,
        type: 'site_down',
        title: 'Site Critical Status',
        message: 'PixCart application is experiencing critical issues',
        timestamp: new Date().toISOString()
      });
    }
    
    // High: Recent deployment failures
    const recentFailures = this.results.deployment.summary.recentPattern.filter(s => s === 'Error').length;
    if (recentFailures >= CONFIG.thresholds.maxConsecutiveFailures) {
      alerts.push({
        severity: CONFIG.severity.HIGH,
        type: 'deployment_failures',
        title: 'Multiple Consecutive Deployment Failures',
        message: `${recentFailures} consecutive deployments have failed`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Medium: Performance degradation
    if (this.results.apiHealth.performance.averageTime > CONFIG.thresholds.maxResponseTime) {
      alerts.push({
        severity: CONFIG.severity.MEDIUM,
        type: 'performance_degradation',
        title: 'Performance Degradation Detected',
        message: `Average API response time: ${this.results.apiHealth.performance.averageTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Medium: API health issues
    const apiFailureRate = (this.results.apiHealth.summary.failed / this.results.apiHealth.summary.total) * 100;
    if (apiFailureRate > 20) {
      alerts.push({
        severity: CONFIG.severity.MEDIUM,
        type: 'api_health_issues',
        title: 'API Health Issues',
        message: `${apiFailureRate.toFixed(1)}% of API endpoints are failing`,
        timestamp: new Date().toISOString()
      });
    }
    
    this.results.alerts = alerts;
  }

  // Display comprehensive summary
  displayComprehensiveSummary() {
    const status = this.results.overallStatus;
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌',
      unknown: '❓'
    }[status] || '❓';
    
    console.log(`\n${statusEmoji} COMPREHENSIVE MONITORING SUMMARY`);
    console.log(`=============================================`);
    console.log(`Overall Status: ${status.toUpperCase()}`);
    console.log(`Severity Level: ${this.results.severity.toUpperCase()}`);
    console.log(`Project: ${this.projectName}`);
    console.log(`Base URL: ${this.baseUrl}`);
    
    // Deployment summary
    const dep = this.results.deployment.summary;
    console.log(`\n📦 DEPLOYMENT STATUS`);
    console.log(`-------------------`);
    console.log(`Total deployments checked: ${dep.total}`);
    console.log(`Successful: ${dep.successful} | Failed: ${dep.failed}`);
    console.log(`Failure rate: ${dep.failureRate}%`);
    
    // API health summary
    const api = this.results.apiHealth.summary;
    console.log(`\n🏥 API HEALTH STATUS`);
    console.log(`-------------------`);
    console.log(`Endpoints tested: ${api.total}`);
    console.log(`Passed: ${api.passed} | Failed: ${api.failed} | Skipped: ${api.skipped}`);
    console.log(`Success rate: ${((api.passed / (api.total - api.skipped)) * 100).toFixed(1)}%`);
    
    if (this.results.apiHealth.performance.averageTime > 0) {
      console.log(`Average response time: ${this.results.apiHealth.performance.averageTime}ms`);
    }
    
    // Alerts
    if (this.results.alerts.length > 0) {
      console.log(`\n🚨 ACTIVE ALERTS`);
      console.log(`---------------`);
      this.results.alerts.forEach((alert, i) => {
        const emoji = {
          low: '🔵',
          medium: '🟡',
          high: '🟠',
          critical: '🔴'
        }[alert.severity] || '⚪';
        console.log(`${i + 1}. ${emoji} [${alert.severity.toUpperCase()}] ${alert.title}`);
        console.log(`   ${alert.message}`);
      });
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS`);
      console.log(`------------------`);
      this.results.recommendations.forEach((rec, i) => {
        const emoji = {
          low: '🔵',
          medium: '🟡',
          high: '🟠'
        }[rec.priority] || '⚪';
        console.log(`${i + 1}. ${emoji} [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   Action: ${rec.action}`);
      });
    }
  }

  // Export comprehensive results
  async exportResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comprehensive-monitor-${this.projectName}-${timestamp}.json`;
    const filepath = path.join('./test-results', filename);
    
    try {
      await fs.mkdir('./test-results', { recursive: true });
      
      // Create a comprehensive report
      const report = {
        ...this.results,
        generatedBy: 'PixCart Comprehensive Monitor v1.0',
        version: '1.0.0',
        metadata: {
          node_version: process.version,
          platform: process.platform,
          hostname: require('os').hostname(),
          working_directory: process.cwd()
        }
      };
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Comprehensive report exported to: ${filepath}`);
      
      // Also create a summary file for quick reading
      const summaryPath = path.join('./test-results', `summary-${timestamp}.md`);
      await this.exportMarkdownSummary(summaryPath);
      
      return filepath;
    } catch (error) {
      console.warn(`⚠️  Could not export results: ${error.message}`);
      return null;
    }
  }

  // Export a markdown summary for easy reading
  async exportMarkdownSummary(filepath) {
    const status = this.results.overallStatus;
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌',
      unknown: '❓'
    }[status] || '❓';
    
    const markdown = `# PixCart Monitoring Report

${statusEmoji} **Overall Status:** ${status.toUpperCase()}
**Severity:** ${this.results.severity.toUpperCase()}
**Generated:** ${this.results.timestamp}
**Project:** ${this.projectName}
**URL:** ${this.baseUrl}

## Deployment Status

- **Total Deployments:** ${this.results.deployment.summary.total}
- **Successful:** ${this.results.deployment.summary.successful}
- **Failed:** ${this.results.deployment.summary.failed}
- **Failure Rate:** ${this.results.deployment.summary.failureRate}%

## API Health Status

- **Endpoints Tested:** ${this.results.apiHealth.summary.total}
- **Passed:** ${this.results.apiHealth.summary.passed}
- **Failed:** ${this.results.apiHealth.summary.failed}
- **Success Rate:** ${((this.results.apiHealth.summary.passed / (this.results.apiHealth.summary.total - this.results.apiHealth.summary.skipped)) * 100).toFixed(1)}%
- **Average Response Time:** ${this.results.apiHealth.performance.averageTime}ms

${this.results.alerts.length > 0 ? `## 🚨 Active Alerts

${this.results.alerts.map((alert, i) => `${i + 1}. **[${alert.severity.toUpperCase()}]** ${alert.title}
   ${alert.message}`).join('\n\n')}` : ''}

${this.results.recommendations.length > 0 ? `## 💡 Recommendations

${this.results.recommendations.map((rec, i) => `${i + 1}. **[${rec.priority.toUpperCase()}]** ${rec.title}
   ${rec.description}
   **Action:** ${rec.action}`).join('\n\n')}` : ''}

---
*Generated by PixCart Comprehensive Monitor*
`;
    
    try {
      await fs.writeFile(filepath, markdown);
      console.log(`📄 Summary report exported to: ${filepath}`);
    } catch (error) {
      console.warn(`⚠️  Could not export markdown summary: ${error.message}`);
    }
  }

  // Send notifications (Slack, email, etc.)
  async sendNotifications() {
    const severityThreshold = process.env.MONITOR_SEVERITY_THRESHOLD || 'medium';
    const currentSeverityLevel = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    }[this.results.severity] || 0;
    
    const thresholdLevel = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    }[severityThreshold] || 2;
    
    if (currentSeverityLevel < thresholdLevel) {
      console.log(`ℹ️  Severity ${this.results.severity} is below threshold ${severityThreshold}, skipping notifications`);
      return;
    }
    
    console.log(`🔔 Sending notifications for ${this.results.severity} severity issues...`);
    
    // Note: In a real implementation, you would add actual notification logic here
    // For example:
    // - Slack webhook notifications
    // - Email alerts
    // - Discord notifications
    // - PagerDuty integration
    
    console.log(`ℹ️  Notification system not configured (set MONITOR_SLACK_WEBHOOK environment variable)`);
  }

  // Generate a quick status for CI/CD integration
  getQuickStatus() {
    return {
      status: this.results.overallStatus,
      severity: this.results.severity,
      healthy: this.results.overallStatus === 'healthy',
      alertCount: this.results.alerts.length,
      recommendationCount: this.results.recommendations.length
    };
  }
}

// Main execution function
async function main() {
  const projectName = process.argv[2];
  const baseUrl = process.argv[3];
  
  console.log('🔍 PixCart Comprehensive Monitoring System');
  console.log('===========================================');
  
  const monitor = new ComprehensiveMonitor(projectName, baseUrl);
  const results = await monitor.monitor();
  
  // For CI/CD integration, output quick status
  const quickStatus = monitor.getQuickStatus();
  console.log(`\n🎯 Quick Status: ${quickStatus.status} (${quickStatus.severity})`);
  
  // Exit with appropriate code
  const exitCode = {
    healthy: 0,
    warning: 1,
    critical: 2,
    unknown: 1
  }[results.overallStatus] || 1;
  
  console.log(`\n👋 Monitoring completed with exit code: ${exitCode}`);
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(2);
  });
}

module.exports = { ComprehensiveMonitor, CONFIG };