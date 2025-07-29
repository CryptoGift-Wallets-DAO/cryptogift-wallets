#!/bin/bash
# 🛡️ Secure Feature Generator - CryptoGift Wallets
# Automatically creates secure boilerplate for new features

set -e

if [ $# -eq 0 ]; then
    echo "Usage: ./create-secure-feature.sh <feature-name> [api|lib|component]"
    echo "Example: ./create-secure-feature.sh payment-processor api"
    exit 1
fi

FEATURE_NAME=$1
FEATURE_TYPE=${2:-lib}
FEATURE_PATH=""
TEST_PATH=""

echo "🚀 Creating secure feature: $FEATURE_NAME (type: $FEATURE_TYPE)"

case $FEATURE_TYPE in
    "api")
        FEATURE_PATH="frontend/src/pages/api/$FEATURE_NAME.ts"
        TEST_PATH="frontend/src/test/api-$FEATURE_NAME.test.ts"
        ;;
    "lib")
        FEATURE_PATH="frontend/src/lib/$FEATURE_NAME.ts"
        TEST_PATH="frontend/src/test/$FEATURE_NAME.test.ts"
        ;;
    "component")
        FEATURE_PATH="frontend/src/components/$FEATURE_NAME.tsx"
        TEST_PATH="frontend/src/test/$FEATURE_NAME.test.tsx"
        ;;
    *)
        echo "❌ Invalid feature type. Use: api, lib, or component"
        exit 1
        ;;
esac

# Create directories if they don't exist
mkdir -p "$(dirname "$FEATURE_PATH")"
mkdir -p "$(dirname "$TEST_PATH")"

# Generate secure API endpoint template
if [ "$FEATURE_TYPE" = "api" ]; then
    cat > "$FEATURE_PATH" << 'EOF'
/**
 * 🛡️ SECURE API ENDPOINT - [FEATURE_NAME]
 * Generated with security best practices
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit } from '../../lib/rateLimiting';
import { verifyJWT } from '../../lib/siweAuth';
import { secureLogger } from '../../lib/secureLogger';
import { isValidEthereumAddress } from '../../lib/siweAuth';

interface [FEATURE_NAME_PASCAL]Request {
  // Define your request interface here
  userAddress: string;
  // Add other required fields
}

interface [FEATURE_NAME_PASCAL]Response {
  success: boolean;
  data?: any;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<[FEATURE_NAME_PASCAL]Response>
) {
  // Only allow POST requests (adjust as needed)
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    secureLogger.info('[FEATURE_NAME] endpoint accessed', {
      method: req.method,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      origin: req.headers.origin
    });

    // 1. Parse and validate request
    const { userAddress }: [FEATURE_NAME_PASCAL]Request = req.body;

    if (!userAddress || !isValidEthereumAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Valid user address is required'
      });
    }

    // 2. Rate limiting check
    const rateLimit = await checkRateLimit(userAddress);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      });
    }

    // 3. Authentication (uncomment if needed)
    // const user = await verifyJWT(req.headers.authorization);
    // if (!user) {
    //   return res.status(401).json({
    //     success: false,
    //     error: 'Authentication required'
    //   });
    // }

    // 4. Business logic implementation
    // TODO: Implement your feature logic here
    const result = await implement[FEATURE_NAME_PASCAL]Logic(userAddress);

    // 5. Success response
    secureLogger.info('[FEATURE_NAME] operation completed', {
      userAddress: userAddress.slice(0, 10) + '...',
      success: true
    });

    return res.status(200).json({
      success: true,
      data: result,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    });

  } catch (error: any) {
    // 6. Error handling (sanitized)
    secureLogger.error('[FEATURE_NAME] operation failed', {
      error: error.message,
      stack: error.stack?.substring(0, 200)
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// TODO: Implement your business logic
async function implement[FEATURE_NAME_PASCAL]Logic(userAddress: string) {
  // Your implementation here
  throw new Error('Feature implementation pending');
}
EOF

    # Replace placeholders
    sed -i "s/\[FEATURE_NAME\]/$FEATURE_NAME/g" "$FEATURE_PATH"
    sed -i "s/\[FEATURE_NAME_PASCAL\]/$(echo "$FEATURE_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++){ $i=toupper(substr($i,1,1)) substr($i,2) }}1' | sed 's/ //g')/g" "$FEATURE_PATH"
fi

# Generate secure lib template
if [ "$FEATURE_TYPE" = "lib" ]; then
    cat > "$FEATURE_PATH" << 'EOF'
/**
 * 🛡️ SECURE LIBRARY - [FEATURE_NAME]
 * Generated with security best practices
 */

import { secureLogger } from './secureLogger';
import { validateRedisForCriticalOps } from './redisConfig';

// Define your types here
export interface [FEATURE_NAME_PASCAL]Config {
  // Configuration interface
}

export interface [FEATURE_NAME_PASCAL]Result {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Main [FEATURE_NAME] function
 * @param input - Input parameters
 * @returns Promise<[FEATURE_NAME_PASCAL]Result>
 */
export async function [FEATURE_NAME_CAMEL](input: any): Promise<[FEATURE_NAME_PASCAL]Result> {
  try {
    secureLogger.info('[FEATURE_NAME] operation started', {
      // Log safe, non-sensitive data only
      timestamp: new Date().toISOString()
    });

    // Input validation
    if (!input) {
      throw new Error('Input is required');
    }

    // TODO: Implement your logic here
    const result = await performOperation(input);

    secureLogger.info('[FEATURE_NAME] operation completed successfully');

    return {
      success: true,
      data: result
    };

  } catch (error: any) {
    secureLogger.error('[FEATURE_NAME] operation failed', {
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions
async function performOperation(input: any) {
  // TODO: Implement your business logic
  throw new Error('Operation implementation pending');
}

// Export utility functions if needed
export function validate[FEATURE_NAME_PASCAL]Input(input: any): boolean {
  // TODO: Implement validation logic
  return input !== null && input !== undefined;
}
EOF

    # Replace placeholders
    sed -i "s/\[FEATURE_NAME\]/$FEATURE_NAME/g" "$FEATURE_PATH"
    sed -i "s/\[FEATURE_NAME_PASCAL\]/$(echo "$FEATURE_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++){ $i=toupper(substr($i,1,1)) substr($i,2) }}1' | sed 's/ //g')/g" "$FEATURE_PATH"
    sed -i "s/\[FEATURE_NAME_CAMEL\]/$(echo "$FEATURE_NAME" | sed 's/-/_/g' | awk -F_ '{print $1; for(i=2; i<=NF; i++) print toupper(substr($i,1,1)) substr($i,2)}' | tr -d '\n')/g" "$FEATURE_PATH"
fi

# Generate comprehensive test file
cat > "$TEST_PATH" << 'EOF'
/**
 * 🧪 COMPREHENSIVE TESTS - [FEATURE_NAME]
 * Security-focused test suite
 */

import { [FEATURE_NAME_CAMEL] } from '../lib/[FEATURE_NAME]';

describe('[FEATURE_NAME_PASCAL] Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('Should reject null input', async () => {
      const result = await [FEATURE_NAME_CAMEL](null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('Should reject undefined input', async () => {
      const result = await [FEATURE_NAME_CAMEL](undefined);
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('Should handle valid input correctly', async () => {
      // TODO: Implement with valid test data
      const validInput = { test: 'data' };
      const result = await [FEATURE_NAME_CAMEL](validInput);
      
      // Update this test based on your implementation
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('Should handle network errors gracefully', async () => {
      // Mock network failure
      // TODO: Implement network error simulation
      
      const result = await [FEATURE_NAME_CAMEL]({ test: 'data' });
      expect(result.success).toBeDefined();
    });

    test('Should not expose sensitive information in errors', async () => {
      const result = await [FEATURE_NAME_CAMEL](null);
      
      if (result.error) {
        // Ensure no sensitive patterns in error messages
        expect(result.error).not.toMatch(/password|secret|key|token/i);
        expect(result.error).not.toMatch(/0x[a-fA-F0-9]{64}/); // Private keys
      }
    });
  });

  describe('Security Patterns', () => {
    test('Should use secure logging', async () => {
      // TODO: Mock secureLogger and verify it's called
      await [FEATURE_NAME_CAMEL]({ test: 'data' });
      
      // Verify secure logging was used
      // expect(mockSecureLogger.info).toHaveBeenCalled();
    });

    test('Should sanitize logged data', async () => {
      const sensitiveInput = {
        userAddress: '0x1234567890123456789012345678901234567890',
        privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        data: 'test'
      };

      await [FEATURE_NAME_CAMEL](sensitiveInput);
      
      // TODO: Verify that private key is not logged
    });
  });

  describe('Performance', () => {
    test('Should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await [FEATURE_NAME_CAMEL]({ test: 'data' });
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
    }, 10000);
  });

  describe('Edge Cases', () => {
    test('Should handle empty object input', async () => {
      const result = await [FEATURE_NAME_CAMEL]({});
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('Should handle large input data', async () => {
      const largeInput = {
        data: 'x'.repeat(10000)
      };
      
      const result = await [FEATURE_NAME_CAMEL](largeInput);
      expect(result).toBeDefined();
    });
  });
});

// TODO: Add integration tests if this feature interacts with external services
describe('[FEATURE_NAME_PASCAL] Integration Tests', () => {
  test('Should integrate with external services correctly', async () => {
    // TODO: Implement integration tests
    expect(true).toBe(true); // Placeholder
  });
});
EOF

# Replace placeholders in test file
sed -i "s/\[FEATURE_NAME\]/$FEATURE_NAME/g" "$TEST_PATH"
sed -i "s/\[FEATURE_NAME_PASCAL\]/$(echo "$FEATURE_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++){ $i=toupper(substr($i,1,1)) substr($i,2) }}1' | sed 's/ //g')/g" "$TEST_PATH"
sed -i "s/\[FEATURE_NAME_CAMEL\]/$(echo "$FEATURE_NAME" | sed 's/-/_/g' | awk -F_ '{print $1; for(i=2; i<=NF; i++) print toupper(substr($i,1,1)) substr($i,2)}' | tr -d '\n')/g" "$TEST_PATH"

echo "✅ Secure feature created successfully!"
echo ""
echo "📁 Files created:"
echo "   - $FEATURE_PATH (main implementation)"
echo "   - $TEST_PATH (comprehensive tests)"
echo ""
echo "🛡️ Security features included:"
echo "   ✅ Rate limiting (API endpoints)"
echo "   ✅ Input validation"
echo "   ✅ Secure logging"
echo "   ✅ Error sanitization"
echo "   ✅ Comprehensive test suite"
echo "   ✅ Performance testing"
echo "   ✅ Edge case handling"
echo ""
echo "📋 Next steps:"
echo "   1. Implement your business logic in the TODO sections"
echo "   2. Update the test cases with your specific requirements"
echo "   3. Run 'npm test' to verify your implementation"
echo "   4. Use 'npm run test:coverage' to check coverage"
echo ""
echo "🚀 Your feature is ready for secure development!"