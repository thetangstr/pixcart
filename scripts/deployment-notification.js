#!/usr/bin/env node

/**
 * Automated Deployment Notification System
 * 
 * This script sends deployment notifications via multiple channels:
 * - Console output
 * - File logging
 * - External webhooks (Slack, Discord, etc.)
 * - Email notifications
 * - GitHub issue creation
 */

const fs = require('fs').promises;
const path = require('path');

class DeploymentNotifier {
  constructor(config = {}) {
    this.config = {
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile !== false,
      enableWebhook: config.enableWebhook || false,
      enableEmail: config.enableEmail || false,
      webhookUrl: config.webhookUrl || process.env.DEPLOYMENT_WEBHOOK_URL,
      emailConfig: config.emailConfig || {},
      logFile: config.logFile || 'deployment-notifications.log',
      ...config
    };
  }

  async notify(event) {
    const notification = this.formatNotification(event);
    
    // Send via all enabled channels
    const results = await Promise.allSettled([
      this.config.enableConsole && this.consoleNotify(notification),
      this.config.enableFile && this.fileNotify(notification),
      this.config.enableWebhook && this.webhookNotify(notification),
      this.config.enableEmail && this.emailNotify(notification)
    ].filter(Boolean));
    
    return {
      notification,
      results: results.map((result, index) => ({
        channel: ['console', 'file', 'webhook', 'email'][index],
        status: result.status,
        error: result.reason?.message
      }))
    };
  }

  formatNotification(event) {
    const timestamp = new Date().toISOString();
    const eventType = event.type || 'unknown';
    
    const notification = {
      timestamp,
      type: eventType,
      title: this.getTitle(event),
      message: this.getMessage(event),
      status: event.status || 'unknown',
      deployment: event.deployment || {},
      health: event.health || {},
      metrics: event.metrics || {},
      severity: this.getSeverity(event),
      color: this.getColor(event.status),
      emoji: this.getEmoji(event.status)
    };
    
    return notification;
  }

  getTitle(event) {
    const status = event.status || 'unknown';
    const deployment = event.deployment || {};
    
    switch (event.type) {
      case 'deployment.started':
        return `🚀 Deployment Started - ${deployment.id || 'Unknown'}`;
      case 'deployment.success':
        return `✅ Deployment Successful - ${deployment.url || 'Production'}`;
      case 'deployment.failed':
        return `❌ Deployment Failed - ${deployment.id || 'Unknown'}`;
      case 'health.warning':
        return `⚠️ Health Check Warning - ${event.health?.healthScore || 0}% Success Rate`;
      case 'health.critical':
        return `🚨 Critical Health Issues Detected`;
      case 'monitoring.report':
        return `📊 Deployment Monitoring Report`;
      default:
        return `🔔 Deployment Notification - ${status}`;
    }
  }

  getMessage(event) {
    const deployment = event.deployment || {};
    const health = event.health || {};
    const metrics = event.metrics || {};
    
    let message = [];
    
    // Deployment info
    if (deployment.id) {
      message.push(`**Deployment ID:** ${deployment.id}`);
    }
    if (deployment.url) {
      message.push(`**URL:** ${deployment.url}`);
    }
    if (deployment.buildTime) {
      message.push(`**Build Time:** ${Math.round(deployment.buildTime / 1000)}s`);
    }
    
    // Health metrics
    if (health.healthScore !== undefined) {
      message.push(`**Health Score:** ${health.healthScore.toFixed(1)}%`);
    }
    if (health.avgResponseTime) {
      message.push(`**Avg Response Time:** ${Math.round(health.avgResponseTime)}ms`);
    }
    if (health.criticalFailures) {
      message.push(`**Critical Failures:** ${health.criticalFailures}`);
    }
    
    // Performance metrics
    if (metrics.uptime !== undefined) {
      message.push(`**Uptime:** ${metrics.uptime.toFixed(1)}%`);
    }
    if (metrics.totalChecks) {
      message.push(`**Total Checks:** ${metrics.totalChecks}`);
    }
    
    // Issues
    if (event.issues && event.issues.length > 0) {
      message.push(`\\n**Issues:**`);
      event.issues.forEach(issue => {
        message.push(`- ${issue}`);
      });
    }
    
    // Recommendations
    if (event.recommendations && event.recommendations.length > 0) {
      message.push(`\\n**Recommendations:**`);
      event.recommendations.forEach(rec => {
        message.push(`- ${rec}`);
      });
    }
    
    return message.join('\\n');
  }

  getSeverity(event) {
    switch (event.type) {
      case 'deployment.failed':
      case 'health.critical':
        return 'critical';
      case 'health.warning':
        return 'warning';
      case 'deployment.success':
        return 'success';
      default:
        return 'info';
    }
  }

  getColor(status) {
    switch (status) {
      case 'success':
      case 'healthy':
        return '#28a745'; // Green
      case 'warning':
        return '#ffc107'; // Yellow
      case 'failed':
      case 'critical':
      case 'unhealthy':
        return '#dc3545'; // Red
      default:
        return '#6c757d'; // Gray
    }
  }

  getEmoji(status) {
    switch (status) {
      case 'success':
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'failed':
      case 'critical':
      case 'unhealthy':
        return '❌';
      default:
        return '🔔';
    }
  }

  async consoleNotify(notification) {
    const { emoji, title, message } = notification;
    
    console.log(`\\n${emoji} ${title}`);
    console.log('=' .repeat(50));
    console.log(message.replace(/\\*\\*/g, '').replace(/\\n/g, '\\n'));
    console.log(`\\n⏰ ${notification.timestamp}`);
    
    return { status: 'sent', channel: 'console' };
  }

  async fileNotify(notification) {
    try {
      const logEntry = {
        timestamp: notification.timestamp,
        type: notification.type,
        status: notification.status,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        deployment: notification.deployment,
        health: notification.health,
        metrics: notification.metrics
      };
      
      const logLine = JSON.stringify(logEntry) + '\\n';
      await fs.appendFile(this.config.logFile, logLine);
      
      return { status: 'sent', channel: 'file' };
    } catch (error) {
      return { status: 'failed', channel: 'file', error: error.message };
    }
  }

  async webhookNotify(notification) {
    if (!this.config.webhookUrl) {
      return { status: 'skipped', channel: 'webhook', reason: 'No webhook URL configured' };
    }
    
    try {
      const payload = this.formatWebhookPayload(notification);
      
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return { status: 'sent', channel: 'webhook' };
    } catch (error) {
      return { status: 'failed', channel: 'webhook', error: error.message };
    }
  }

  formatWebhookPayload(notification) {
    // Format for Slack/Discord webhook
    return {
      username: 'PixCart Deploy Bot',
      icon_emoji: notification.emoji,
      attachments: [{
        color: notification.color,
        title: notification.title,
        text: notification.message,
        timestamp: Math.floor(new Date(notification.timestamp).getTime() / 1000),
        fields: [
          {
            title: 'Status',
            value: notification.status,
            short: true
          },
          {
            title: 'Severity',
            value: notification.severity,
            short: true
          }
        ]
      }]
    };
  }

  async emailNotify(notification) {
    // Email notification would require email service setup
    // This is a placeholder for email integration
    return { status: 'skipped', channel: 'email', reason: 'Email not configured' };
  }

  // Convenience methods for common events
  async notifyDeploymentStarted(deployment) {
    return this.notify({
      type: 'deployment.started',
      status: 'in_progress',
      deployment
    });
  }

  async notifyDeploymentSuccess(deployment, health, metrics) {
    return this.notify({
      type: 'deployment.success',
      status: 'success',
      deployment,
      health,
      metrics
    });
  }

  async notifyDeploymentFailed(deployment, error) {
    return this.notify({
      type: 'deployment.failed',
      status: 'failed',
      deployment,
      issues: [error]
    });
  }

  async notifyHealthWarning(health, issues, recommendations) {
    return this.notify({
      type: 'health.warning',
      status: 'warning',
      health,
      issues,
      recommendations
    });
  }

  async notifyHealthCritical(health, issues, recommendations) {
    return this.notify({
      type: 'health.critical',
      status: 'critical',
      health,
      issues,
      recommendations
    });
  }

  async notifyMonitoringReport(metrics, health, deployment) {
    return this.notify({
      type: 'monitoring.report',
      status: 'info',
      metrics,
      health,
      deployment
    });
  }
}

// Export for use in other scripts
module.exports = DeploymentNotifier;

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const notifier = new DeploymentNotifier();
  
  if (args.length === 0) {
    console.log('Usage: node deployment-notification.js <type> [options]');
    console.log('');
    console.log('Types:');
    console.log('  test                 - Send a test notification');
    console.log('  deployment-success   - Notify deployment success');
    console.log('  deployment-failed    - Notify deployment failure');
    console.log('  health-warning       - Notify health warning');
    console.log('  health-critical      - Notify critical health issue');
    process.exit(1);
  }
  
  const type = args[0];
  
  switch (type) {
    case 'test':
      notifier.notify({
        type: 'monitoring.report',
        status: 'success',
        deployment: { 
          id: 'test-123',
          url: 'https://test.vercel.app',
          buildTime: 45000
        },
        health: { 
          healthScore: 95.5,
          avgResponseTime: 150,
          criticalFailures: 0
        },
        metrics: {
          uptime: 99.8,
          totalChecks: 100
        }
      }).then(result => {
        console.log('Test notification sent:', result);
      });
      break;
      
    default:
      console.log(`Unknown notification type: ${type}`);
      process.exit(1);
  }
}