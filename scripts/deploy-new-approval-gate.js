/**
 * DEPLOY NEW SIMPLE APPROVAL GATE WITH CORRECT APPROVER
 * 
 * This script deploys a new SimpleApprovalGate contract with an approver
 * that matches your configured APPROVER_PRIVATE_KEY.
 * 
 * The current contract at 0x3FEb03368cbF0970D4f29561dA200342D788eD6B
 * has approver 0x1dBa3F54F9ef623b94398D96323B6a27F2A7b37B which we don't have the key for.
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

const { ethers } = require('ethers');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: './frontend/.env.local' });

const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || '71DY3Z3JZAYQZ36A545INRE3U5UDTKQQMP';

async function deployNewApprovalGate() {
  console.log('🚀 DEPLOYING NEW SIMPLE APPROVAL GATE WITH CORRECT APPROVER\n');
  
  // 1. Determine which approver to use
  let approverAddress;
  let deployerPrivateKey;
  
  if (process.env.APPROVER_PRIVATE_KEY) {
    try {
      const approverWallet = new ethers.Wallet(process.env.APPROVER_PRIVATE_KEY);
      approverAddress = approverWallet.address;
      console.log('✅ Using APPROVER_PRIVATE_KEY address as approver:', approverAddress);
    } catch (error) {
      console.error('❌ Invalid APPROVER_PRIVATE_KEY:', error.message);
      return;
    }
  } else {
    console.error('❌ APPROVER_PRIVATE_KEY not set. Setting default approver...');
    // Use a default address that we control
    approverAddress = '0x75e32B5BA0817fEF917f21902EC5a84005d00943';
    console.log('ℹ️  Using default approver address:', approverAddress);
  }
  
  // 2. Get deployer key
  if (process.env.PRIVATE_KEY_DEPLOY) {
    deployerPrivateKey = process.env.PRIVATE_KEY_DEPLOY;
    const deployerWallet = new ethers.Wallet(deployerPrivateKey);
    console.log('✅ Using PRIVATE_KEY_DEPLOY for deployment');
    console.log('   Deployer address:', deployerWallet.address);
  } else {
    console.error('❌ PRIVATE_KEY_DEPLOY not set. Cannot deploy.');
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT CONFIGURATION:');
  console.log('Approver Address:', approverAddress);
  console.log('RPC URL:', RPC_URL);
  console.log('Chain: Base Sepolia (84532)');
  console.log('='.repeat(60) + '\n');
  
  // 3. Create temporary deployment script
  const deployScript = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleApprovalGate.sol";

contract DeployNewApprovalGate is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
        address approver = address(${approverAddress});
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleApprovalGate gate = new SimpleApprovalGate(approver);
        
        console.log("NEW SimpleApprovalGate deployed at:", address(gate));
        console.log("Approver address:", approver);
        console.log("Chain ID:", block.chainid);
        
        vm.stopBroadcast();
    }
}
`;
  
  // 4. Write the deployment script
  const scriptPath = path.join(__dirname, '..', 'script', 'DeployNewApprovalGate.s.sol');
  await fs.writeFile(scriptPath, deployScript);
  console.log('✅ Created deployment script at:', scriptPath);
  
  // 5. Run forge deployment
  console.log('\n🔨 Running Forge deployment...\n');
  
  const forgeCommand = `PRIVATE_KEY_DEPLOY=${deployerPrivateKey} ETHERSCAN_KEY=${ETHERSCAN_KEY} ~/.foundry/bin/forge script script/DeployNewApprovalGate.s.sol --rpc-url "${RPC_URL}" --broadcast --verify --etherscan-api-key ${ETHERSCAN_KEY} --chain-id 84532 -vvv`;
  
  try {
    const { stdout, stderr } = await execAsync(forgeCommand, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PRIVATE_KEY_DEPLOY: deployerPrivateKey }
    });
    
    console.log(stdout);
    if (stderr) console.error('Warnings:', stderr);
    
    // Extract the deployed address from output
    const addressMatch = stdout.match(/NEW SimpleApprovalGate deployed at:\s+(0x[a-fA-F0-9]{40})/);
    if (addressMatch) {
      const newContractAddress = addressMatch[1];
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ DEPLOYMENT SUCCESSFUL!');
      console.log('='.repeat(60));
      console.log('\n📋 NEXT STEPS:');
      console.log('\n1. Update your environment variables in Vercel:');
      console.log('   SIMPLE_APPROVAL_GATE_ADDRESS=' + newContractAddress);
      console.log('   NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS=' + newContractAddress);
      console.log('   APPROVER_PRIVATE_KEY=' + (process.env.APPROVER_PRIVATE_KEY || '<your_approver_private_key>'));
      console.log('\n2. Update frontend/.env.local with the same values');
      console.log('\n3. Redeploy your application');
      console.log('\n4. Test with a new gift that has education requirements');
      console.log('\n✨ The education bypass system should now work correctly!');
      console.log('='.repeat(60));
      
      // Create update script
      const updateEnvScript = `
# Update environment variables for new SimpleApprovalGate

# Add to frontend/.env.local:
SIMPLE_APPROVAL_GATE_ADDRESS=${newContractAddress}
NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS=${newContractAddress}

# Verified approver for this contract:
# ${approverAddress}
`;
      
      await fs.writeFile('UPDATE_ENV_VARS.txt', updateEnvScript);
      console.log('\n📄 Environment update script saved to: UPDATE_ENV_VARS.txt');
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. Foundry is installed (run: curl -L https://foundry.paradigm.xyz | bash)');
    console.error('2. You have enough ETH on Base Sepolia');
    console.error('3. Your private keys are valid');
  }
}

// Run the deployment
deployNewApprovalGate().catch(console.error);