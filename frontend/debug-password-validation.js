#!/usr/bin/env node

/**
 * DEBUG SCRIPT: Password Validation Issue
 * Diagnostica el problema de "Invalid password" en el sistema de educación
 */

const { ethers } = require('ethers');

// Simulamos los mismos datos que el frontend está enviando
function generateSalt() {
  return ethers.hexlify(ethers.randomBytes(32));
}

function generatePasswordHash(password, salt, giftId, contractAddress, chainId = 84532) {
  console.log('🔍 HASH GENERATION INPUTS:');
  console.log('  Password:', password);
  console.log('  Salt:', salt);
  console.log('  GiftId:', giftId, 'Type:', typeof giftId);
  console.log('  Contract:', contractAddress);
  console.log('  ChainId:', chainId);
  
  // Use solidityPackedKeccak256 to replicate abi.encodePacked exactly
  const hash = ethers.solidityPackedKeccak256(
    ['string', 'bytes32', 'uint256', 'address', 'uint256'],
    [password, salt, BigInt(giftId), contractAddress, BigInt(chainId)]
  );
  
  console.log('  Generated Hash:', hash);
  return hash;
}

// Test con datos del token 185 (del log)
console.log('🧪 TESTING PASSWORD HASH GENERATION FOR TOKEN 185');
console.log('================================================');

const testPassword = 'test123456'; // contraseña de prueba
const testSalt = generateSalt();
const testGiftId = 213; // Del log: "MAPPING MEMORY CACHE HIT: tokenId 184 → giftId 213"
const contractAddress = '0x46175CfC233500DA803841DEef7f2816e7A129E0'; // ESCROW_CONTRACT_ADDRESS
const chainId = 84532;

console.log('\n📝 TEST 1: Standard hash generation');
const hash1 = generatePasswordHash(testPassword, testSalt, testGiftId, contractAddress, chainId);

console.log('\n📝 TEST 2: Con giftId como string');
const hash2 = generatePasswordHash(testPassword, testSalt, testGiftId.toString(), contractAddress, chainId);

console.log('\n📝 TEST 3: Con diferentes tipos de giftId');
const hash3 = generatePasswordHash(testPassword, testSalt, BigInt(testGiftId), contractAddress, chainId);

console.log('\n🎯 RESULTS COMPARISON:');
console.log('Hash1 (number):', hash1);
console.log('Hash2 (string):', hash2);
console.log('Hash3 (BigInt):', hash3);
console.log('All equal?', hash1 === hash2 && hash2 === hash3);

console.log('\n🔍 SOLIDITY EQUIVALENT:');
console.log('keccak256(abi.encodePacked(password, salt, giftId, address(this), block.chainid))');
console.log('Where:');
console.log('  password =', testPassword);
console.log('  salt =', testSalt);
console.log('  giftId =', testGiftId);
console.log('  address(this) =', contractAddress);
console.log('  block.chainid =', chainId);

console.log('\n📋 NEXT STEPS:');
console.log('1. Verificar que el giftId correcto se está pasando al backend');
console.log('2. Verificar que el salt es el mismo en frontend y backend');
console.log('3. Verificar que el contractAddress es correcto');
console.log('4. Revisar logs del backend para ver exactamente qué datos recibe');