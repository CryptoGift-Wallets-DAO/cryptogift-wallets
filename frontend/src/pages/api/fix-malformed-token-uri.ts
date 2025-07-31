import { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { baseSepolia } from 'thirdweb/chains';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔧 FIX MALFORMED TOKEN URI API STARTED ===========================================');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🔧 Method:', req.method);
  console.log('📋 Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractAddress, tokenId, action = 'preview' } = req.body;

    if (!contractAddress || !tokenId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: contractAddress and tokenId' 
      });
    }

    // Initialize ThirdWeb client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    // Get contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress,
    });

    // Read current tokenURI
    console.log('🔍 Reading current tokenURI for token:', tokenId);
    const currentTokenURI = await readContract({
      contract: nftContract,
      method: "function tokenURI(uint256 tokenId) view returns (string)",
      params: [BigInt(tokenId)],
    });
    console.log('📄 Current tokenURI:', currentTokenURI);

    // Check if it's malformed (has double prefix)
    const isMalformed = currentTokenURI.includes('jipfs://ipfs://') || 
                       currentTokenURI.includes('ipfs://ipfs://');

    if (!isMalformed) {
      return res.status(200).json({
        success: true,
        message: 'Token URI is already correct',
        currentTokenURI,
        needsFix: false
      });
    }

    // Extract correct CID by removing malformed prefix
    let correctedTokenURI = currentTokenURI;
    if (currentTokenURI.startsWith('jipfs://ipfs://')) {
      correctedTokenURI = currentTokenURI.replace('jipfs://ipfs://', 'ipfs://');
    } else if (currentTokenURI.startsWith('ipfs://ipfs://')) {
      correctedTokenURI = currentTokenURI.replace('ipfs://ipfs://', 'ipfs://');
    }

    console.log('✨ Corrected tokenURI would be:', correctedTokenURI);

    // If preview mode, just return the analysis
    if (action === 'preview') {
      return res.status(200).json({
        success: true,
        message: 'Preview: Token URI correction needed',
        currentTokenURI,
        correctedTokenURI,
        needsFix: true,
        malformationType: currentTokenURI.startsWith('jipfs://') ? 'jipfs_prefix' : 'double_ipfs',
        action: 'preview'
      });
    }

    // If fix mode, execute the correction
    if (action === 'fix') {
      console.log('🔧 EXECUTING TOKEN URI FIX...');

      // Prepare admin account
      const adminPrivateKey = process.env.WALLET_PRIVATE_KEY;
      if (!adminPrivateKey) {
        throw new Error('Admin private key not configured');
      }

      const adminAccount = privateKeyToAccount({
        client,
        privateKey: adminPrivateKey
      });

      console.log('👤 Admin account address:', adminAccount.address);

      // Prepare updateTokenURI call
      const updateTokenURITx = prepareContractCall({
        contract: nftContract,
        method: "function updateTokenURI(uint256 tokenId, string memory newTokenURI)",
        params: [BigInt(tokenId), correctedTokenURI]
      });

      console.log('📝 Prepared updateTokenURI transaction');

      // Execute transaction
      const txResult = await sendTransaction({
        transaction: updateTokenURITx,
        account: adminAccount
      });

      console.log('📨 Transaction sent:', txResult.transactionHash);

      // Wait for confirmation
      const receipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: txResult.transactionHash
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      console.log('✅ TOKEN URI FIXED SUCCESSFULLY!');
      console.log('🔗 Transaction hash:', txResult.transactionHash);
      console.log('📋 Block number:', receipt.blockNumber);

      // Verify the fix by reading the updated tokenURI
      const updatedTokenURI = await readContract({
        contract: nftContract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(tokenId)],
      });
      
      return res.status(200).json({
        success: true,
        message: 'Token URI successfully corrected',
        previousTokenURI: currentTokenURI,
        updatedTokenURI,
        transactionHash: txResult.transactionHash,
        blockNumber: receipt.blockNumber?.toString(),
        action: 'fix',
        verified: updatedTokenURI === correctedTokenURI
      });
    }

    return res.status(400).json({
      error: 'Invalid action. Use "preview" or "fix"'
    });

  } catch (error) {
    console.error('❌ Fix malformed token URI error:', error);
    return res.status(500).json({
      error: 'Failed to fix malformed token URI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}