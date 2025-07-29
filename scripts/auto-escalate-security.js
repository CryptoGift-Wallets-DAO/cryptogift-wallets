#!/usr/bin/env node
/**
 * 🔄 Automatic Security Enforcement Escalation
 * Runs weekly to analyze security compliance and escalate enforcement
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.security-config.json';
const AUDIT_LOG = '.security-audit.log';
const ESCALATION_LOG = '.security-escalation.log';

class SecurityEscalationManager {
  constructor() {
    this.config = this.loadConfig();
    this.metrics = this.analyzeMetrics();
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (error) {
      console.error('❌ Failed to load security config:', error.message);
      return { enforcement: { level: 'warning' } };
    }
  }

  analyzeMetrics() {
    const metrics = {
      bypassCount: 0,
      warningCount: 0,
      lastWeekBypasses: 0,
      complianceScore: 0
    };

    // Analyze bypass usage from audit log
    if (fs.existsSync(AUDIT_LOG)) {
      const auditContent = fs.readFileSync(AUDIT_LOG, 'utf8');
      const lines = auditContent.split('\n').filter(l => l.startsWith('['));
      
      metrics.bypassCount = lines.filter(l => l.includes('[BYPASS]')).length;
      
      // Count bypasses in last 7 days
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      metrics.lastWeekBypasses = lines.filter(line => {
        const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]/);
        if (!timestampMatch) return false;
        
        const lineDate = new Date(timestampMatch[1]);
        return lineDate > oneWeekAgo && line.includes('[BYPASS]');
      }).length;
    }

    // Calculate compliance score (0-100)
    metrics.complianceScore = Math.max(0, 100 - (metrics.lastWeekBypasses * 20));

    return metrics;
  }

  shouldEscalate() {
    const { enforcement } = this.config;
    const { lastWeekBypasses, complianceScore } = this.metrics;

    // Escalation rules
    const rules = [
      {
        condition: lastWeekBypasses >= 5,
        reason: `Too many bypasses in last week (${lastWeekBypasses})`,
        targetLevel: 'error'
      },
      {
        condition: complianceScore < 70 && enforcement.level === 'warning',
        reason: `Low compliance score (${complianceScore}%)`,
        targetLevel: 'error'
      },
      {
        condition: lastWeekBypasses === 0 && complianceScore > 90 && enforcement.level === 'error',
        reason: `Excellent compliance (${complianceScore}%) - can relax enforcement`,
        targetLevel: 'warning'
      }
    ];

    return rules.find(rule => rule.condition) || null;
  }

  escalate(rule) {
    const timestamp = new Date().toISOString();
    const oldLevel = this.config.enforcement.level;
    
    // Update config
    this.config.enforcement.level = rule.targetLevel;
    this.config.enforcement.lastEscalation = timestamp;
    this.config.enforcement.escalationReason = rule.reason;

    // Save updated config
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));

    // Log escalation
    const logEntry = `[${timestamp}] ESCALATION: ${oldLevel} → ${rule.targetLevel} | Reason: ${rule.reason}\n`;
    fs.appendFileSync(ESCALATION_LOG, logEntry);

    console.log(`🔄 Security enforcement escalated: ${oldLevel} → ${rule.targetLevel}`);
    console.log(`📋 Reason: ${rule.reason}`);
    console.log(`📊 Compliance score: ${this.metrics.complianceScore}%`);
    
    return true;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      currentLevel: this.config.enforcement.level,
      metrics: this.metrics,
      recommendations: this.getRecommendations()
    };

    console.log('\n📊 SECURITY COMPLIANCE REPORT');
    console.log('================================');
    console.log(`Current enforcement level: ${report.currentLevel}`);
    console.log(`Total bypasses: ${this.metrics.bypassCount}`);
    console.log(`Last week bypasses: ${this.metrics.lastWeekBypasses}`);
    console.log(`Compliance score: ${this.metrics.complianceScore}%`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }

    return report;
  }

  getRecommendations() {
    const recommendations = [];
    const { lastWeekBypasses, complianceScore } = this.metrics;

    if (lastWeekBypasses > 3) {
      recommendations.push('Review bypass usage patterns - consider if security rules need adjustment');
    }

    if (complianceScore < 80) {
      recommendations.push('Focus on improving test coverage and security patterns');
    }

    if (lastWeekBypasses === 0 && complianceScore > 95) {
      recommendations.push('Excellent security compliance! Team is following best practices');
    }

    return recommendations;
  }

  run() {
    console.log('🔍 Analyzing security compliance...');
    
    const report = this.generateReport();
    const escalationRule = this.shouldEscalate();

    if (escalationRule) {
      this.escalate(escalationRule);
    } else {
      console.log('✅ No escalation needed - security compliance is stable');
    }

    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new SecurityEscalationManager();
  manager.run();
}

module.exports = SecurityEscalationManager;