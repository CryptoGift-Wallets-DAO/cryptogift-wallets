#!/usr/bin/env node

/**
 * DEEP DEBUG SCRIPT: Password Validation Issue - Token 186
 * Protocolo v2: Análisis exhaustivo para llegar al fondo del problema
 */

const { ethers } = require('ethers');

// DATOS DEL PROBLEMA REAL
const PROBLEM_TOKEN_ID = '186';
const TEST_PASSWORD = 'test123456'; // Usuario debe proporcionar la contraseña real que está usando

console.log('🔍 DEEP ANALYSIS: Token 186 Password Validation Failure');
console.log('================================================');

async function testGiftIdMapping() {
  console.log('\n📋 STEP 1: Gift ID Mapping Verification');
  console.log('-------------------------------------------');
  
  try {
    // Simular la búsqueda de giftId que hace el backend
    console.log(`🔍 Looking up giftId for tokenId: ${PROBLEM_TOKEN_ID}`);
    
    // CRITICAL: Esta función debería encontrar el giftId correcto
    // Si falla aquí, el problema es el mapeo, no el hash
    
    // Simular mapeo manual basado en el patrón típico
    // En el sistema real, el giftId suele ser diferente al tokenId
    console.log('⚠️ MAPPING TEST: Probando diferentes giftId candidates...');
    
    const candidates = [
      parseInt(PROBLEM_TOKEN_ID), // Mismo número
      parseInt(PROBLEM_TOKEN_ID) + 1, // +1 offset común
      parseInt(PROBLEM_TOKEN_ID) - 1, // -1 offset
      parseInt(PROBLEM_TOKEN_ID) + 100, // Offset grande
      parseInt(PROBLEM_TOKEN_ID) - 50   // Offset negativo
    ];
    
    candidates.forEach(candidate => {
      console.log(`🎯 Testing giftId candidate: ${candidate}`);
    });
    
    return candidates[0]; // Retornar el primero para testing
    
  } catch (error) {
    console.error('❌ Gift ID mapping failed:', error);
    return null;
  }
}

function testHashGeneration(password, salt, giftId) {
  console.log('\n🔐 STEP 2: Hash Generation Testing');
  console.log('----------------------------------');
  
  const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0'; // ESCROW_CONTRACT_ADDRESS
  const CHAIN_ID = 84532;
  
  console.log('📊 INPUT PARAMETERS:');
  console.log(`  Password: "${password}"`);
  console.log(`  Password length: ${password.length}`);
  console.log(`  Salt: ${salt}`);
  console.log(`  GiftId: ${giftId} (type: ${typeof giftId})`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}`);
  console.log(`  ChainId: ${CHAIN_ID}`);
  
  try {
    // EXACT replication of backend hash generation
    const hash = ethers.solidityPackedKeccak256(
      ['string', 'bytes32', 'uint256', 'address', 'uint256'],
      [password, salt, BigInt(giftId), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
    );
    
    console.log('\n✅ HASH GENERATED:');
    console.log(`  Result: ${hash}`);
    console.log(`  Length: ${hash.length}`);
    
    return hash;
    
  } catch (error) {
    console.error('❌ Hash generation failed:', error);
    return null;
  }
}

function testSaltGeneration() {
  console.log('\n🧂 STEP 3: Salt Generation Testing');
  console.log('-----------------------------------');
  
  // Test multiple salt generation to see consistency
  const salts = [];
  
  for (let i = 0; i < 3; i++) {
    const salt = ethers.hexlify(ethers.randomBytes(32));
    salts.push(salt);
    console.log(`Salt ${i + 1}: ${salt}`);
  }
  
  // Test if different salts produce different hashes (they should)
  console.log('\n🔄 SALT VARIATION TEST:');
  
  const testPassword = 'testpass';
  const testGiftId = 186;
  const CONTRACT_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
  const CHAIN_ID = 84532;
  
  salts.forEach((salt, index) => {
    const hash = ethers.solidityPackedKeccak256(
      ['string', 'bytes32', 'uint256', 'address', 'uint256'],
      [testPassword, salt, BigInt(testGiftId), CONTRACT_ADDRESS, BigInt(CHAIN_ID)]
    );
    console.log(`Hash with salt ${index + 1}: ${hash.slice(0, 20)}...`);
  });
  
  return salts[0]; // Return first salt for testing
}

async function runCompleteAnalysis() {
  console.log('🚀 STARTING COMPLETE PASSWORD VALIDATION ANALYSIS');
  console.log('=' .repeat(60));
  
  // Step 1: Gift ID mapping
  const giftId = await testGiftIdMapping();
  if (!giftId) {
    console.error('💥 CRITICAL: Cannot proceed without giftId');
    return;
  }
  
  // Step 2: Salt generation  
  const salt = testSaltGeneration();
  
  // Step 3: Hash generation with different password scenarios
  console.log('\n🎯 STEP 4: Password Scenario Testing');
  console.log('------------------------------------');
  
  const passwordScenarios = [
    TEST_PASSWORD,
    TEST_PASSWORD.trim(),
    TEST_PASSWORD.toLowerCase(),
    TEST_PASSWORD.toUpperCase(),
    'wrongpassword' // Control test
  ];
  
  passwordScenarios.forEach((pwd, index) => {
    console.log(`\n🧪 SCENARIO ${index + 1}: "${pwd}"`);
    const hash = testHashGeneration(pwd, salt, giftId);
    if (hash) {
      console.log(`   Generated: ${hash.slice(0, 20)}...${hash.slice(-10)}`);
    }
  });
  
  // Step 4: Debug the exact flow
  console.log('\n🔬 STEP 5: Backend Flow Simulation');
  console.log('-----------------------------------');
  
  console.log('❓ QUESTIONS TO INVESTIGATE:');
  console.log('1. ¿El giftId se está mapeando correctamente del tokenId 186?');
  console.log('2. ¿El salt que genera el frontend es el que usa el backend?');
  console.log('3. ¿La contraseña tiene caracteres especiales o espacios?');
  console.log('4. ¿El passwordHash almacenado en el contract es correcto?');
  console.log('5. ¿El error IPFS está interfiriendo con la lectura del gift?');
  
  console.log('\n🚨 CRITICAL DEBUGGING RECOMMENDATIONS:');
  console.log('1. Agregar más logging en el backend para capturar TODOS los valores');
  console.log('2. Verificar que el debug logging esté llegando a los logs de producción');
  console.log('3. Probar con diferentes contraseñas para aislar el problema');
  console.log('4. Verificar el passwordHash directamente del smart contract');
  
  console.log('\n📊 ANALYSIS COMPLETE');
}

// Execute the analysis
runCompleteAnalysis().catch(console.error);