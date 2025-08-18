/**
 * COMPILE SIMPLE APPROVAL GATE CONTRACT
 * Compiles the SimpleApprovalGate contract using solc
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');

function compileSolidityContract() {
  console.log('📝 Compiling SimpleApprovalGate contract...\n');

  // Read contract source
  const contractPath = path.join(__dirname, '../contracts/SimpleApprovalGate.sol');
  const igatePath = path.join(__dirname, '../contracts/IGate.sol');
  
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Contract file not found:', contractPath);
    process.exit(1);
  }
  
  const contractSource = fs.readFileSync(contractPath, 'utf8');
  const igateSource = fs.readFileSync(igatePath, 'utf8');

  // Prepare input for solc
  const input = {
    language: 'Solidity',
    sources: {
      'SimpleApprovalGate.sol': {
        content: contractSource
      },
      'IGate.sol': {
        content: igateSource
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers']
        }
      }
    }
  };

  // Compile
  console.log('⚙️ Compiling with solc...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for errors
  if (output.errors) {
    let hasErrors = false;
    output.errors.forEach(error => {
      if (error.severity === 'error') {
        console.error('❌ Compilation error:', error.formattedMessage);
        hasErrors = true;
      } else {
        console.warn('⚠️ Warning:', error.formattedMessage);
      }
    });
    
    if (hasErrors) {
      process.exit(1);
    }
  }

  // Extract contract data
  const contract = output.contracts['SimpleApprovalGate.sol']['SimpleApprovalGate'];
  
  if (!contract) {
    console.error('❌ Contract not found in compilation output');
    process.exit(1);
  }

  const compiledContract = {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
    deployedBytecode: contract.evm.deployedBytecode.object,
    methodIdentifiers: contract.evm.methodIdentifiers,
    compiler: {
      version: solc.version()
    }
  };

  // Save compiled contract
  const outputDir = path.join(__dirname, '../contracts/compiled');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'SimpleApprovalGate.json');
  fs.writeFileSync(outputPath, JSON.stringify(compiledContract, null, 2));
  
  console.log('✅ Contract compiled successfully!');
  console.log('📁 Output saved to:', outputPath);
  console.log('\nContract details:');
  console.log('  - Bytecode length:', compiledContract.bytecode.length);
  console.log('  - ABI methods:', compiledContract.abi.filter(a => a.type === 'function').length);
  console.log('  - Compiler version:', compiledContract.compiler.version);
  
  return compiledContract;
}

// Run compilation if called directly
if (require.main === module) {
  try {
    const compiled = compileSolidityContract();
    console.log('\n🎉 Compilation complete!');
    console.log('Next step: Run deploy-approval-gate.js');
    process.exit(0);
  } catch (error) {
    console.error('💥 Compilation failed:', error);
    process.exit(1);
  }
}

module.exports = { compileSolidityContract };