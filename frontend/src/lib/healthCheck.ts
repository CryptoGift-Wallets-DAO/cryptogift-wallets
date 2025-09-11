/**
 * HEALTH CHECK SYSTEM
 * Fail-fast validation for critical dependencies at startup
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import { getRedisConnection, isRedisConfigured, getRedisStatus } from './redisConfig';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheckResult[];
  timestamp: number;
}

/**
 * Check Redis connectivity and configuration
 */
export async function checkRedisHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // First check: Configuration validation
    if (!isRedisConfigured()) {
      const status = getRedisStatus();
      return {
        service: 'redis',
        status: 'unhealthy',
        message: 'Redis not configured - missing environment variables',
        details: {
          variables: status.variables,
          configured: status.configured,
          env_check: process.env.NODE_ENV
        },
        timestamp: Date.now()
      };
    }
    
    // Second check: Connection test
    const redis = getRedisConnection();
    
    // Third check: Ping test
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'ping_test';
    
    await redis.set(testKey, testValue, { ex: 10 }); // 10 second TTL
    const result = await redis.get(testKey);
    await redis.del(testKey);
    
    if (result !== testValue) {
      return {
        service: 'redis',
        status: 'unhealthy', 
        message: 'Redis ping test failed - data integrity issue',
        details: {
          expected: testValue,
          received: result,
          response_time_ms: Date.now() - startTime
        },
        timestamp: Date.now()
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'redis',
      status: responseTime > 1000 ? 'warning' : 'healthy',
      message: responseTime > 1000 ? 'Redis slow response time' : 'Redis healthy',
      details: {
        response_time_ms: responseTime,
        test_key: testKey
      },
      timestamp: Date.now()
    };
    
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      message: `Redis health check failed: ${error.message}`,
      details: {
        error: error.message,
        response_time_ms: Date.now() - startTime,
        redis_status: getRedisStatus()
      },
      timestamp: Date.now()
    };
  }
}

/**
 * Check environment variables and configuration
 */
export function checkEnvironmentHealth(): HealthCheckResult {
  const requiredVars = [
    'NEXT_PUBLIC_TW_CLIENT_ID',
    'NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS',
    'NEXT_PUBLIC_CHAIN_ID',
    'JWT_SECRET'
  ];
  
  const missingVars: string[] = [];
  const presentVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    return {
      service: 'environment',
      status: 'unhealthy',
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
      details: {
        missing: missingVars,
        present: presentVars,
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV
      },
      timestamp: Date.now()
    };
  }
  
  return {
    service: 'environment',
    status: 'healthy',
    message: 'All required environment variables present',
    details: {
      variables_count: presentVars.length,
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV
    },
    timestamp: Date.now()
  };
}

/**
 * Check ThirdWeb client configuration
 */
export function checkThirdWebHealth(): HealthCheckResult {
  try {
    const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
    
    if (!clientId) {
      return {
        service: 'thirdweb',
        status: 'unhealthy',
        message: 'ThirdWeb client ID not configured',
        timestamp: Date.now()
      };
    }
    
    // Basic format validation
    if (clientId.length < 10) {
      return {
        service: 'thirdweb',
        status: 'warning',
        message: 'ThirdWeb client ID appears to be invalid format',
        details: { client_id_length: clientId.length },
        timestamp: Date.now()
      };
    }
    
    return {
      service: 'thirdweb',
      status: 'healthy',
      message: 'ThirdWeb client configured',
      details: { client_id_length: clientId.length },
      timestamp: Date.now()
    };
    
  } catch (error) {
    return {
      service: 'thirdweb',
      status: 'unhealthy',
      message: `ThirdWeb health check failed: ${error.message}`,
      timestamp: Date.now()
    };
  }
}

/**
 * Run comprehensive system health check
 */
export async function runSystemHealthCheck(): Promise<SystemHealth> {
  console.log('🏥 Starting system health check...');
  
  const checks: HealthCheckResult[] = [];
  
  // Run all health checks
  checks.push(checkEnvironmentHealth());
  checks.push(checkThirdWebHealth());
  checks.push(await checkRedisHealth());
  
  // Determine overall system health
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  
  let overall: 'healthy' | 'unhealthy' | 'degraded';
  if (unhealthyCount > 0) {
    overall = 'unhealthy';
  } else if (warningCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }
  
  const systemHealth: SystemHealth = {
    overall,
    checks,
    timestamp: Date.now()
  };
  
  // Log results
  if (overall === 'healthy') {
    console.log('✅ System health check: ALL SYSTEMS HEALTHY');
  } else if (overall === 'degraded') {
    console.warn('⚠️ System health check: DEGRADED PERFORMANCE');
    checks.filter(c => c.status === 'warning').forEach(check => {
      console.warn(`⚠️ ${check.service}: ${check.message}`);
    });
  } else {
    console.error('❌ System health check: CRITICAL ISSUES DETECTED');
    checks.filter(c => c.status === 'unhealthy').forEach(check => {
      console.error(`❌ ${check.service}: ${check.message}`);
    });
  }
  
  return systemHealth;
}

/**
 * Startup health check - fail fast if critical issues
 */
export async function startupHealthCheck(): Promise<void> {
  try {
    const health = await runSystemHealthCheck();
    
    if (health.overall === 'unhealthy') {
      const criticalIssues = health.checks
        .filter(c => c.status === 'unhealthy')
        .map(c => `${c.service}: ${c.message}`)
        .join('; ');
        
      throw new Error(`Startup health check failed: ${criticalIssues}`);
    }
    
    if (health.overall === 'degraded') {
      console.warn('⚠️ Starting with degraded performance - monitor closely');
    }
    
  } catch (error) {
    console.error('💥 STARTUP HEALTH CHECK FAILED:', error.message);
    
    // In production, this should fail the deployment
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 PRODUCTION DEPLOYMENT BLOCKED - Fix critical issues before deploying');
      throw error;
    } else {
      console.warn('⚠️ Development mode - continuing despite health check failures');
    }
  }
}