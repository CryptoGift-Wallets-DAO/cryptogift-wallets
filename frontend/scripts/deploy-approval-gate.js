/**
 * DEPLOY SIMPLE APPROVAL GATE CONTRACT
 * Deploys the SimpleApprovalGate contract to Base Sepolia
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOY;
const APPROVER_ADDRESS = process.env.APPROVER_ADDRESS || '0x1dBa3F54F9Ef623B94398d96323b6A27F2a7b37B'; // Default to deployer

// Contract bytecode and ABI
const CONTRACT_PATH = path.join(__dirname, '../contracts/SimpleApprovalGate.sol');
const COMPILED_PATH = path.join(__dirname, '../contracts/compiled/SimpleApprovalGate.json');

async function deploySimpleApprovalGate() {
  console.log('🚀 Starting SimpleApprovalGate deployment to Base Sepolia...\n');

  if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY_DEPLOY environment variable is required');
    process.exit(1);
  }

  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('📍 Network: Base Sepolia');
    console.log('👤 Deployer address:', wallet.address);
    console.log('🔑 Approver address:', APPROVER_ADDRESS);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Deployer balance:', ethers.formatEther(balance), 'ETH\n');
    
    if (balance < ethers.parseEther('0.001')) {
      console.error('❌ Insufficient balance. Need at least 0.001 ETH for deployment');
      process.exit(1);
    }

    // Read compiled contract
    let contractData;
    if (fs.existsSync(COMPILED_PATH)) {
      console.log('📄 Loading compiled contract from:', COMPILED_PATH);
      contractData = JSON.parse(fs.readFileSync(COMPILED_PATH, 'utf8'));
    } else {
      console.log('⚠️ Compiled contract not found. Using inline bytecode...');
      // Simplified bytecode for SimpleApprovalGate
      // This would normally be compiled from Solidity
      contractData = {
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "_approver", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "constructor"
          },
          {
            "inputs": [
              {"internalType": "address", "name": "claimer", "type": "address"},
              {"internalType": "uint256", "name": "giftId", "type": "uint256"},
              {"internalType": "bytes", "name": "data", "type": "bytes"}
            ],
            "name": "check",
            "outputs": [
              {"internalType": "bool", "name": "ok", "type": "bool"},
              {"internalType": "string", "name": "reason", "type": "string"}
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "getRequirements",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "isActive",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "inputs": [
              {"internalType": "uint256", "name": "giftId", "type": "uint256"},
              {"internalType": "address", "name": "claimer", "type": "address"}
            ],
            "name": "grantApproval",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [
              {"internalType": "uint256", "name": "giftId", "type": "uint256"},
              {"internalType": "address", "name": "claimer", "type": "address"}
            ],
            "name": "isApproved",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "approver",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        // This is a placeholder - actual bytecode would be from solc compilation
        bytecode: "0x608060405234801561001057600080fd5b5060405161..." // Truncated for brevity
      };
    }

    // Deploy contract
    console.log('📝 Deploying SimpleApprovalGate contract...');
    const factory = new ethers.ContractFactory(
      contractData.abi,
      contractData.bytecode,
      wallet
    );
    
    const contract = await factory.deploy(APPROVER_ADDRESS);
    console.log('⏳ Transaction hash:', contract.deploymentTransaction().hash);
    console.log('⏳ Waiting for confirmation...');
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('📍 Contract address:', contractAddress);
    console.log('🔗 View on BaseScan: https://sepolia.basescan.org/address/' + contractAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: 'base-sepolia',
      chainId: 84532,
      contractAddress: contractAddress,
      approverAddress: APPROVER_ADDRESS,
      deployerAddress: wallet.address,
      deploymentTx: contract.deploymentTransaction().hash,
      deployedAt: new Date().toISOString(),
      abi: contractData.abi
    };
    
    const deploymentPath = path.join(__dirname, '../contracts/deployments/SimpleApprovalGate.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to:', deploymentPath);
    
    // Verify basic functionality
    console.log('\n🔍 Verifying contract functionality...');
    const deployedContract = new ethers.Contract(contractAddress, contractData.abi, wallet);
    
    const isActive = await deployedContract.isActive();
    console.log('✓ Gate is active:', isActive);
    
    const requirements = await deployedContract.getRequirements();
    console.log('✓ Requirements:', requirements);
    
    const approverAddr = await deployedContract.approver();
    console.log('✓ Approver confirmed:', approverAddr);
    
    console.log('\n🎉 Deployment complete and verified!');
    console.log('\nNext steps:');
    console.log('1. Update GATE_CONTRACT_ADDRESS in your .env file');
    console.log('2. Verify contract on BaseScan using the verification script');
    console.log('3. Test the gate integration with a test gift');
    
    return contractAddress;
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deploySimpleApprovalGate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deploySimpleApprovalGate };