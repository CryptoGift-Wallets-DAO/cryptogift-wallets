#!/usr/bin/env node
/**
 * TEST SCRIPT: Test transaction log recovery for token 147
 */

import { ethers } from 'ethers';

async function testTokenRecovery() {
  console.log('🧪 Testing transaction log recovery for token 147...');
  
  const rpcUrl = 'https://sepolia.base.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contractAddress = '0xE9F316159a0830114252a96a6B7CA6efD874650F';
  const tokenId = '147';
  
  try {
    // Find the Transfer event for this token (from 0x0 to first owner)
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    const currentBlock = await provider.getBlockNumber();
    const searchFromBlock = Math.max(0, currentBlock - 10000); // Search last ~10k blocks
    
    console.log(`🔍 Searching Transfer events from block ${searchFromBlock} to ${currentBlock}`);
    
    const filter = {
      address: contractAddress,
      topics: [
        transferEventSignature,
        '0x0000000000000000000000000000000000000000000000000000000000000000', // from: zero address (mint)
        null, // to: any address
        ethers.zeroPadValue(`0x${BigInt(tokenId).toString(16)}`, 32) // tokenId
      ],
      fromBlock: searchFromBlock,
      toBlock: currentBlock
    };
    
    const logs = await provider.getLogs(filter);
    console.log(`📋 Found ${logs.length} Transfer events for token ${tokenId}`);
    
    if (logs.length === 0) {
      console.log('❌ No mint Transfer event found');
      return;
    }
    
    const mintLog = logs[0];
    console.log(`🔍 Mint transaction hash: ${mintLog.transactionHash}`);
    console.log(`🔍 Block number: ${mintLog.blockNumber}`);
    
    // Get the full transaction
    const tx = await provider.getTransaction(mintLog.transactionHash);
    if (!tx) {
      console.log('❌ Transaction not found');
      return;
    }
    
    console.log(`📋 Transaction to: ${tx.to}`);
    console.log(`📋 Transaction data length: ${tx.data.length}`);
    console.log(`📋 Transaction data: ${tx.data.substring(0, 100)}...`);
    
    // Try to decode the transaction data
    const mintToSelector = '0x449a52f8'; // mintTo(address,string)
    
    if (!tx.data.startsWith(mintToSelector)) {
      console.log(`⚠️ Transaction does not use mintTo function`);
      console.log(`🔍 Actual selector: ${tx.data.substring(0, 10)}`);
      
      // Try common selectors
      const selectors = {
        '0x449a52f8': 'mintTo(address,string)',
        '0xa0712d68': 'mint(uint256)',
        '0x40c10f19': 'mint(address,uint256)',
        '0x6a627842': 'mint(address)',
        // Add more as needed
      };
      
      const actualSelector = tx.data.substring(0, 10);
      console.log(`🔍 Possible function: ${selectors[actualSelector] || 'Unknown'}`);
      
    } else {
      console.log(`✅ Transaction uses mintTo function`);
      
      try {
        const iface = new ethers.Interface([
          'function mintTo(address to, string memory tokenURI)'
        ]);
        const decoded = iface.decodeFunctionData('mintTo', tx.data);
        const originalTokenURI = decoded[1];
        
        console.log(`🎯 FOUND original tokenURI: ${originalTokenURI}`);
        
        if (originalTokenURI.startsWith('ipfs://')) {
          console.log(`✅ Original tokenURI is IPFS!`);
          console.log(`🔗 IPFS CID: ${originalTokenURI.replace('ipfs://', '')}`);
          
          // Test if IPFS is accessible
          const testUrl = `https://ipfs.io/ipfs/${originalTokenURI.replace('ipfs://', '')}`;
          console.log(`🌐 Testing IPFS accessibility: ${testUrl}`);
          
          try {
            const response = await fetch(testUrl, { method: 'HEAD' });
            console.log(`📊 IPFS Status: ${response.status}`);
            if (response.ok) {
              console.log(`🎉 SUCCESS! IPFS metadata is accessible`);
              
              // Fetch the actual metadata
              const fullResponse = await fetch(testUrl);
              const metadata = await fullResponse.json();
              console.log(`📋 Metadata name: ${metadata.name}`);
              console.log(`🖼️ Image URL: ${metadata.image}`);
              console.log(`📝 Description: ${metadata.description?.substring(0, 100)}...`);
            }
          } catch (ipfsError) {
            console.log(`❌ IPFS Error: ${ipfsError.message}`);
          }
          
        } else {
          console.log(`⚠️ Original tokenURI is not IPFS: ${originalTokenURI}`);
        }
        
      } catch (decodeError) {
        console.log(`❌ Failed to decode: ${decodeError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTokenRecovery();