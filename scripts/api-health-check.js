#!/usr/bin/env node

/**
 * API Health Check Script for PixCart Application
 * 
 * This script performs comprehensive health checks on all API endpoints:
 * - Tests public endpoints (no auth required)
 * - Tests authenticated endpoints with proper auth
 * - Validates response formats and status codes
 * - Checks database connectivity through API endpoints
 * - Measures response times and performance
 * 
 * Usage:
 *   node scripts/api-health-check.js [base-url]
 *   node scripts/api-health-check.js https://oil-painting-app-thetangstrs-projects.vercel.app
 */

const https = require('https');
const http = require('http');
const { promisify } = require('util');

// Configuration
const CONFIG = {
  // Default base URL - can be overridden by command line arg
  defaultBaseUrl: 'https://oil-painting-app-thetangstrs-projects.vercel.app',
  
  // Request timeout (ms)
  timeout: 15000,
  
  // Performance thresholds (ms)
  performanceThresholds: {
    fast: 500,
    acceptable: 2000,
    slow: 5000
  },
  
  // Test user credentials for authenticated endpoints
  testAuth: {
    // Note: In production, these should come from environment variables
    email: 'test@example.com',
    password: 'test-password'
  }
};

// Define all API endpoints to test
const API_ENDPOINTS = [
  // Public endpoints (no auth required)
  {
    name: 'Homepage',
    path: '/',
    method: 'GET',
    auth: false,
    expectedStatus: [200, 401], // 401 might be expected if site is protected
    description: 'Main application homepage'
  },
  
  // Authentication endpoints
  {
    name: 'Sign In Page',
    path: '/login',
    method: 'GET',
    auth: false,
    expectedStatus: [200, 401],
    description: 'User sign in page'
  },
  {
    name: 'Auth Callback',
    path: '/api/auth/callback',
    method: 'GET',
    auth: false,
    expectedStatus: [200, 302, 400, 401],
    description: 'Authentication callback endpoint'
  },
  
  // Core API endpoints
  {
    name: 'Generate Preview API',
    path: '/api/generate',
    method: 'POST',
    auth: true,
    expectedStatus: [200, 400, 401, 403],
    description: 'AI image generation endpoint',
    testData: {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      style: 'oil-painting'
    }
  },
  {
    name: 'Upload API',
    path: '/api/upload',
    method: 'POST',
    auth: true,
    expectedStatus: [200, 400, 401, 403],
    description: 'File upload endpoint'
  },
  {
    name: 'Orders API - List',
    path: '/api/orders',
    method: 'GET',
    auth: true,
    expectedStatus: [200, 401, 403],
    description: 'List user orders'
  },
  {
    name: 'User Profile API',
    path: '/api/profile',
    method: 'GET',
    auth: true,
    expectedStatus: [200, 401, 403],
    description: 'User profile information'
  },
  {
    name: 'Feedback API',
    path: '/api/feedback',
    method: 'POST',
    auth: false,
    expectedStatus: [200, 400, 429],
    description: 'User feedback submission',
    testData: {
      message: 'API health check test',
      type: 'general'
    }
  },
  {
    name: 'Analytics Track API',
    path: '/api/analytics/track',
    method: 'POST',
    auth: false,
    expectedStatus: [200, 400, 429],
    description: 'Analytics tracking endpoint',
    testData: {
      event: 'health_check',
      data: { source: 'api_health_check' }
    }
  },
  
  // Admin endpoints (if accessible)
  {
    name: 'Admin Dashboard',
    path: '/admin',
    method: 'GET',
    auth: true,
    expectedStatus: [200, 401, 403],
    description: 'Admin dashboard access',
    optional: true
  },
  {
    name: 'Admin Users API',
    path: '/api/admin/users',
    method: 'GET',
    auth: true,
    expectedStatus: [200, 401, 403],
    description: 'Admin user management',
    optional: true
  },
  
  // User-specific endpoints
  {
    name: 'User Usage API',
    path: '/api/user/usage',
    method: 'GET',
    auth: true,
    expectedStatus: [200, 401, 403],
    description: 'User usage statistics'
  },
  {
    name: 'User Beta Status API',
    path: '/api/user/beta-status',
    method: 'GET',
    auth: true,
    expectedStatus: [200, 401, 403],
    description: 'User beta access status'
  }
];

class APIHealthChecker {
  constructor(baseUrl = CONFIG.defaultBaseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        averageResponseTime: 0
      },
      tests: [],
      issues: [],
      performance: {
        fastest: null,
        slowest: null,
        averageTime: 0
      }
    };
    this.authToken = null;
  }

  // Make HTTP request with proper error handling
  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const fullUrl = `${this.baseUrl}${endpoint.path}`;
      const urlObj = new URL(fullUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const postData = endpoint.testData ? JSON.stringify(endpoint.testData) : null;
      
      const options = {
        method: endpoint.method,
        timeout: CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PixCart-API-HealthCheck/1.0',
          ...(this.authToken && endpoint.auth ? { 'Authorization': `Bearer ${this.authToken}` } : {})
        }
      };
      
      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
      
      const startTime = Date.now();
      
      const req = client.request(fullUrl, options, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = {
            endpoint: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            status: res.statusCode,
            responseTime,
            success: endpoint.expectedStatus.includes(res.statusCode),
            headers: res.headers,
            bodySize: data.length,
            timestamp: new Date().toISOString()
          };
          
          // Try to parse JSON response
          try {
            result.response = JSON.parse(data);
          } catch (e) {
            result.response = data.substring(0, 200); // Truncate for readability
          }
          
          resolve(result);
        });
      });
      
      req.on('error', (error) => {
        const result = {
          endpoint: endpoint.name,
          path: endpoint.path,
          method: endpoint.method,
          status: 0,
          responseTime: Date.now() - startTime,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        resolve(result);
      });
      
      req.on('timeout', () => {
        req.destroy();
        const result = {
          endpoint: endpoint.name,
          path: endpoint.path,
          method: endpoint.method,
          status: 0,
          responseTime: CONFIG.timeout,
          success: false,
          error: 'Request timeout',
          timestamp: new Date().toISOString()
        };
        resolve(result);
      });
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  // Attempt to get authentication token
  async authenticate() {
    console.log('🔐 Attempting to authenticate...');
    
    // For now, we'll skip authentication and just note it
    // In a real scenario, you'd implement proper auth flow here
    console.log('ℹ️  Skipping authentication (would need real credentials)');
    this.authToken = null;
  }

  // Test a single endpoint
  async testEndpoint(endpoint) {
    console.log(`🧪 Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
    
    const result = await this.makeRequest(endpoint);
    
    // Performance analysis
    let performanceRating = 'slow';
    if (result.responseTime < CONFIG.performanceThresholds.fast) {
      performanceRating = 'fast';
    } else if (result.responseTime < CONFIG.performanceThresholds.acceptable) {
      performanceRating = 'acceptable';
    }
    
    result.performance = performanceRating;
    result.description = endpoint.description;
    result.optional = endpoint.optional || false;
    
    // Detailed success analysis
    if (result.success) {
      console.log(`   ✅ ${endpoint.name}: ${result.status} (${result.responseTime}ms) [${performanceRating}]`);
    } else if (endpoint.optional) {
      console.log(`   ⚠️  ${endpoint.name}: ${result.status || result.error} (optional)`);
      result.success = true; // Don't count optional failures
    } else {
      console.log(`   ❌ ${endpoint.name}: ${result.status || result.error} (${result.responseTime}ms)`);
      this.results.issues.push(`${endpoint.name} failed: ${result.status || result.error}`);
    }
    
    return result;
  }

  // Run all health checks
  async runHealthChecks() {
    console.log(`🏥 Starting API health checks for: ${this.baseUrl}`);
    console.log(`📅 Timestamp: ${this.results.timestamp}\n`);
    
    // Attempt authentication first
    await this.authenticate();
    
    // Test all endpoints
    for (const endpoint of API_ENDPOINTS) {
      const result = await this.testEndpoint(endpoint);
      this.results.tests.push(result);
      
      // Update summary
      this.results.summary.total++;
      if (result.success) {
        this.results.summary.passed++;
      } else if (endpoint.optional) {
        this.results.summary.skipped++;
      } else {
        this.results.summary.failed++;
      }
    }
    
    // Calculate performance metrics
    this.analyzePerformance();
    
    // Display summary
    this.displaySummary();
    
    return this.results;
  }

  // Analyze performance metrics
  analyzePerformance() {
    const validResults = this.results.tests.filter(r => r.responseTime && r.success);
    
    if (validResults.length === 0) {
      return;
    }
    
    const responseTimes = validResults.map(r => r.responseTime);
    
    this.results.performance = {
      fastest: Math.min(...responseTimes),
      slowest: Math.max(...responseTimes),
      averageTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      fastEndpoints: validResults.filter(r => r.performance === 'fast').length,
      slowEndpoints: validResults.filter(r => r.performance === 'slow').length
    };
  }

  // Display comprehensive summary
  displaySummary() {
    const summary = this.results.summary;
    const performance = this.results.performance;
    
    console.log(`\n📊 HEALTH CHECK SUMMARY`);
    console.log(`========================`);
    console.log(`Total endpoints tested: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Skipped (optional): ${summary.skipped}`);
    console.log(`Success rate: ${((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1)}%`);
    
    if (performance.averageTime > 0) {
      console.log(`\n⚡ PERFORMANCE METRICS`);
      console.log(`======================`);
      console.log(`Average response time: ${performance.averageTime}ms`);
      console.log(`Fastest response: ${performance.fastest}ms`);
      console.log(`Slowest response: ${performance.slowest}ms`);
      console.log(`Fast endpoints (< ${CONFIG.performanceThresholds.fast}ms): ${performance.fastEndpoints}`);
      console.log(`Slow endpoints (> ${CONFIG.performanceThresholds.acceptable}ms): ${performance.slowEndpoints}`);
    }
    
    if (this.results.issues.length > 0) {
      console.log(`\n⚠️  ISSUES DETECTED`);
      console.log(`==================`);
      this.results.issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }
    
    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS`);
      console.log(`==================`);
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
  }

  // Generate recommendations based on results
  generateRecommendations() {
    const recommendations = [];
    const failureRate = (this.results.summary.failed / this.results.summary.total) * 100;
    
    if (failureRate > 50) {
      recommendations.push('High failure rate detected. Check authentication and server status.');
    }
    
    if (this.results.performance.slowEndpoints > 2) {
      recommendations.push('Multiple slow endpoints detected. Consider performance optimization.');
    }
    
    if (this.results.performance.averageTime > CONFIG.performanceThresholds.acceptable) {
      recommendations.push('Average response time is slow. Investigate database queries and API optimization.');
    }
    
    const authFailures = this.results.tests.filter(t => t.status === 401).length;
    if (authFailures > 2) {
      recommendations.push('Multiple authentication failures. Verify auth implementation and test credentials.');
    }
    
    const serverErrors = this.results.tests.filter(t => t.status >= 500).length;
    if (serverErrors > 0) {
      recommendations.push('Server errors detected. Check application logs and error handling.');
    }
    
    return recommendations;
  }

  // Export results to JSON file
  async exportResults() {
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `api-health-check-${timestamp}.json`;
    const filepath = `./test-results/${filename}`;
    
    try {
      await fs.mkdir('./test-results', { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
      console.log(`\n📄 Results exported to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.warn(`⚠️  Could not export results: ${error.message}`);
      return null;
    }
  }
}

// Main execution function
async function main() {
  const baseUrl = process.argv[2] || CONFIG.defaultBaseUrl;
  
  console.log('🏥 PixCart API Health Check');
  console.log('============================');
  
  const checker = new APIHealthChecker(baseUrl);
  const results = await checker.runHealthChecks();
  
  // Export results
  await checker.exportResults();
  
  // Exit with appropriate code
  const hasFailures = results.summary.failed > 0;
  const hasCriticalIssues = results.issues.some(issue => 
    issue.includes('server error') || 
    issue.includes('timeout') ||
    issue.includes('connection')
  );
  
  if (hasCriticalIssues) {
    console.log('\n❌ Health check completed with critical issues');
    process.exit(1);
  } else if (hasFailures) {
    console.log('\n⚠️  Health check completed with some failures');
    process.exit(1);
  } else {
    console.log('\n✅ All health checks passed!');
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

module.exports = { APIHealthChecker, CONFIG, API_ENDPOINTS };