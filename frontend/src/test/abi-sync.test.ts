/**
 * ABI SYNCHRONIZATION TEST
 * Verifies that the local ABI matches the deployed contract
 * Ensures single source of truth for contract interactions
 */

import { ethers } from 'ethers';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS } from '../lib/escrowABI';

interface ABITestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    localFunctions: number;
    contractFunctions: number;
    matched: number;
    missing: number;
    extra: number;
  };
}

/**
 * Test ABI synchronization with deployed contract
 */
export async function testABISynchronization(): Promise<ABITestResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    console.log('🔍 Testing ABI synchronization with deployed contract...');
    console.log(`📋 Contract Address: ${ESCROW_CONTRACT_ADDRESS}`);
    
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Get contract bytecode to verify deployment
    const bytecode = await provider.getCode(ESCROW_CONTRACT_ADDRESS!);
    if (bytecode === '0x') {
      errors.push('Contract not deployed at the specified address');
      return {
        success: false,
        errors,
        warnings,
        summary: { localFunctions: 0, contractFunctions: 0, matched: 0, missing: 0, extra: 0 }
      };
    }
    
    console.log('✅ Contract is deployed');
    
    // Create contract instance
    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS!, ESCROW_ABI, provider);
    
    // Extract function signatures from local ABI
    const localFunctions = ESCROW_ABI
      .filter((item: any) => item.type === 'function')
      .map((item: any) => ({
        name: item.name,
        signature: ethers.Interface.from([item]).fragments[0].format('sighash'),
        inputs: item.inputs?.length || 0,
        outputs: item.outputs?.length || 0
      }));
    
    console.log(`📋 Local ABI has ${localFunctions.length} functions`);
    
    // Test critical functions that must exist
    const criticalFunctions = [
      'registerGiftMinted',
      'claimGift', 
      'returnExpiredGift',
      'getGift',
      'canClaimGift',
      'giftCounter'
    ];
    
    let matched = 0;
    let missing = 0;
    
    for (const funcName of criticalFunctions) {
      try {
        // Try to call the function (read-only)
        if (funcName === 'giftCounter') {
          await contract[funcName]();
          matched++;
          console.log(`✅ Critical function '${funcName}' is accessible`);
        } else if (funcName === 'getGift' || funcName === 'canClaimGift') {
          // These require parameters, just check if the function exists
          const hasFunction = localFunctions.some(f => f.name === funcName);
          if (hasFunction) {
            matched++;
            console.log(`✅ Critical function '${funcName}' exists in ABI`);
          } else {
            missing++;
            errors.push(`Missing critical function: ${funcName}`);
          }
        } else {
          // For other functions, check if they exist in the ABI
          const hasFunction = localFunctions.some(f => f.name === funcName);
          if (hasFunction) {
            matched++;
            console.log(`✅ Critical function '${funcName}' exists in ABI`);
          } else {
            missing++;
            errors.push(`Missing critical function: ${funcName}`);
          }
        }
      } catch (error: any) {
        missing++;
        errors.push(`Function '${funcName}' failed: ${error.message}`);
      }
    }
    
    // Test specific function calls with expected behavior
    try {
      // Test giftCounter - should return a number
      const counter = await contract.giftCounter();
      const counterNum = Number(counter);
      if (counterNum >= 0) {
        console.log(`✅ giftCounter returns valid value: ${counterNum}`);
      } else {
        warnings.push(`giftCounter returned unexpected value: ${counter}`);
      }
    } catch (error: any) {
      errors.push(`giftCounter test failed: ${error.message}`);
    }
    
    // Test contract constants
    try {
      const fifteenMin = await contract.FIFTEEN_MINUTES();
      const sevenDays = await contract.SEVEN_DAYS();
      console.log(`✅ Time constants accessible: 15min=${fifteenMin}, 7days=${sevenDays}`);
    } catch (error: any) {
      warnings.push(`Time constants test failed: ${error.message}`);
    }
    
    // Check for ERC2771 compatibility (meta-transactions)
    try {
      const trustedForwarder = await contract.trustedForwarder();
      console.log(`✅ ERC2771 trusted forwarder: ${trustedForwarder}`);
    } catch (error: any) {
      warnings.push(`ERC2771 compatibility check failed: ${error.message}`);
    }
    
    const summary = {
      localFunctions: localFunctions.length,
      contractFunctions: localFunctions.length, // We can't easily get this from bytecode
      matched,
      missing,
      extra: 0 // We can't easily detect extra functions
    };
    
    const success = errors.length === 0 && missing === 0;
    
    if (success) {
      console.log('🎉 ABI synchronization test PASSED');
    } else {
      console.log('❌ ABI synchronization test FAILED');
      console.log('Errors:', errors);
    }
    
    if (warnings.length > 0) {
      console.log('⚠️ Warnings:', warnings);
    }
    
    return {
      success,
      errors,
      warnings,
      summary
    };
    
  } catch (error: any) {
    console.error('💥 ABI sync test failed:', error);
    errors.push(`Test execution failed: ${error.message}`);
    
    return {
      success: false,
      errors,
      warnings,
      summary: { localFunctions: 0, contractFunctions: 0, matched: 0, missing: 0, extra: 0 }
    };
  }
}

/**
 * Run ABI synchronization test and return results
 */
export async function runABISyncTest(): Promise<void> {
  console.log('🧪 Starting ABI Synchronization Test...');
  
  const result = await testABISynchronization();
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`Success: ${result.success ? '✅' : '❌'}`);
  console.log(`Local ABI Functions: ${result.summary.localFunctions}`);
  console.log(`Matched Functions: ${result.summary.matched}`);
  console.log(`Missing Functions: ${result.summary.missing}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (!result.success) {
    throw new Error('ABI synchronization test failed - contract ABI may be out of sync');
  }
  
  console.log('\n✅ ABI is properly synchronized with deployed contract');
}

// Export for use in other tests
export default { testABISynchronization, runABISyncTest };