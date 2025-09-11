/**
 * VERIFY SIMPLE APPROVAL GATE CONTRACT ON BASESCAN
 * Verifies the deployed SimpleApprovalGate contract on BaseScan
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASESCAN_API_KEY = process.env.ETHERSCAN_KEY || process.env.BASESCAN_API_KEY;
const BASESCAN_API_URL = 'https://api-sepolia.basescan.org/api';

async function verifyContract() {
  console.log('🔍 Starting contract verification on BaseScan...\n');

  if (!BASESCAN_API_KEY) {
    console.error('❌ ETHERSCAN_KEY or BASESCAN_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    // Load deployment info
    const deploymentPath = path.join(__dirname, '../contracts/deployments/SimpleApprovalGate.json');
    if (!fs.existsSync(deploymentPath)) {
      console.error('❌ Deployment info not found. Please deploy the contract first.');
      process.exit(1);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const { contractAddress, approverAddress } = deploymentInfo;

    console.log('📍 Contract address:', contractAddress);
    console.log('🔑 Approver address:', approverAddress);

    // Read Solidity source code
    const sourcePath = path.join(__dirname, '../contracts/SimpleApprovalGate.sol');
    const igateSourcePath = path.join(__dirname, '../contracts/IGate.sol');
    
    let sourceCode = '';
    if (fs.existsSync(sourcePath)) {
      sourceCode = fs.readFileSync(sourcePath, 'utf8');
    } else {
      console.log('⚠️ Source file not found. Using inline source code...');
      // Simplified source for verification
      sourceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGate {
    function check(address claimer, uint256 giftId, bytes calldata data) 
        external view returns (bool ok, string memory reason);
    function getRequirements() external view returns (string memory);
    function isActive() external view returns (bool);
}

contract SimpleApprovalGate is IGate {
    mapping(bytes32 => bool) public approvals;
    mapping(address => uint8) public educationLevel;
    address public immutable approver;
    
    event ApprovalGranted(uint256 indexed giftId, address indexed claimer, uint256 timestamp);
    
    modifier onlyApprover() {
        require(msg.sender == approver, "Not approver");
        _;
    }
    
    constructor(address _approver) {
        require(_approver != address(0), "Invalid approver");
        approver = _approver;
    }
    
    function check(address claimer, uint256 giftId, bytes calldata data) 
        external view override returns (bool ok, string memory reason) {
        bytes32 approvalKey = keccak256(abi.encodePacked(giftId, claimer));
        if (approvals[approvalKey]) {
            return (true, "0");
        }
        return (false, "1");
    }
    
    function getRequirements() external pure override returns (string memory) {
        return '{"v":1,"m":[1,2]}';
    }
    
    function isActive() external pure override returns (bool) {
        return true;
    }
    
    function grantApproval(uint256 giftId, address claimer) external onlyApprover {
        bytes32 key = keccak256(abi.encodePacked(giftId, claimer));
        approvals[key] = true;
        emit ApprovalGranted(giftId, claimer, block.timestamp);
    }
    
    function isApproved(uint256 giftId, address claimer) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(giftId, claimer));
        return approvals[key];
    }
}`;
    }

    // Prepare verification request
    const verificationData = {
      apikey: BASESCAN_API_KEY,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: sourceCode,
      codeformat: 'solidity-single-file',
      contractname: 'SimpleApprovalGate',
      compilerversion: 'v0.8.20+commit.a1b79de6', // Update based on your compiler
      optimizationUsed: 1,
      runs: 200,
      constructorArguements: approverAddress.slice(2).padStart(64, '0'), // Remove 0x and pad
      licenseType: 3 // MIT License
    };

    console.log('\n📤 Submitting verification request...');
    const response = await axios.post(BASESCAN_API_URL, null, {
      params: verificationData
    });

    if (response.data.status === '1') {
      const guid = response.data.result;
      console.log('✅ Verification request submitted successfully!');
      console.log('🔖 GUID:', guid);
      
      // Check verification status
      console.log('\n⏳ Checking verification status...');
      let verified = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!verified && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await axios.get(BASESCAN_API_URL, {
          params: {
            apikey: BASESCAN_API_KEY,
            module: 'contract',
            action: 'checkverifystatus',
            guid: guid
          }
        });
        
        if (statusResponse.data.status === '1') {
          verified = true;
          console.log('\n🎉 CONTRACT VERIFIED SUCCESSFULLY!');
          console.log('🔗 View on BaseScan: https://sepolia.basescan.org/address/' + contractAddress + '#code');
          
          // Update deployment info
          deploymentInfo.verified = true;
          deploymentInfo.verifiedAt = new Date().toISOString();
          deploymentInfo.verificationGuid = guid;
          fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
          console.log('💾 Deployment info updated with verification status');
        } else if (statusResponse.data.result === 'Pending in queue') {
          process.stdout.write('.');
        } else if (statusResponse.data.result.includes('Fail')) {
          console.error('\n❌ Verification failed:', statusResponse.data.result);
          break;
        }
      }
      
      if (!verified && attempts >= maxAttempts) {
        console.log('\n⚠️ Verification is taking longer than expected.');
        console.log('Please check the status manually with GUID:', guid);
      }
      
    } else {
      console.error('❌ Verification request failed:', response.data.result);
    }
    
  } catch (error) {
    console.error('\n❌ Verification error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyContract()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { verifyContract };