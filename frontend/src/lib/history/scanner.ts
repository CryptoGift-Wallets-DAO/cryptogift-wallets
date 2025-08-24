/**
 * Transaction History Scanner
 * DIY on-chain transaction scanner with multi-source aggregation
 */

import { createPublicClient, http, type PublicClient, type Hash, parseAbiItem, decodeEventLog } from 'viem';
import { mainnet, sepolia, base, baseSepolia } from 'viem/chains';
import { 
  UnifiedTransaction, 
  TransactionType, 
  TransactionStatus,
  getHistoryConfig,
} from './config';

// Chain configurations with user's RPC
const CHAIN_CONFIGS = {
  1: { chain: mainnet, rpc: 'https://eth-mainnet.g.alchemy.com/v2/demo' },
  11155111: { chain: sepolia, rpc: 'https://eth-sepolia.g.alchemy.com/v2/demo' },
  8453: { chain: base, rpc: 'https://mainnet.base.org' },
  84532: { 
    chain: baseSepolia, 
    rpc: process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e',
  },
};

// Event signatures
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const TRANSFER_SINGLE_EVENT = parseAbiItem('event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)');
const TRANSFER_BATCH_EVENT = parseAbiItem('event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)');

export class TransactionScanner {
  private clients: Map<number, PublicClient> = new Map();
  private cache: Map<string, UnifiedTransaction[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  
  constructor() {
    // Initialize clients for each chain
    Object.entries(CHAIN_CONFIGS).forEach(([chainId, config]) => {
      const client = createPublicClient({
        chain: config.chain,
        transport: http(config.rpc),
      });
      this.clients.set(parseInt(chainId), client);
    });
  }
  
  /**
   * Get client for chain
   */
  private getClient(chainId: number): PublicClient | null {
    return this.clients.get(chainId) || null;
  }
  
  /**
   * Get cache key
   */
  private getCacheKey(address: string, chainId: number, fromBlock: number, toBlock: number): string {
    return `${address}-${chainId}-${fromBlock}-${toBlock}`;
  }
  
  /**
   * Check cache validity
   */
  private isCacheValid(key: string): boolean {
    const config = getHistoryConfig();
    if (!config.cacheEnabled) return false;
    
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    
    const age = Date.now() - timestamp;
    return age < config.cacheTTL * 1000;
  }
  
  /**
   * Get transactions for address
   */
  async getTransactions(
    address: string,
    chainId: number,
    fromBlock?: number,
    toBlock?: number,
  ): Promise<UnifiedTransaction[]> {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`Chain ${chainId} not supported`);
    }
    
    const config = getHistoryConfig();
    
    // Get block range
    const currentBlock = Number(await client.getBlockNumber());
    const to = toBlock || currentBlock;
    const from = fromBlock || Math.max(0, to - config.maxBlockRange);
    
    // Check cache
    const cacheKey = this.getCacheKey(address, chainId, from, to);
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const transactions: UnifiedTransaction[] = [];
    
    // Get native transactions
    const nativeTxs = await this.getNativeTransactions(client, address, from, to);
    transactions.push(...nativeTxs);
    
    // Get token transfers if enabled
    if (config.includeTokenTransfers) {
      const tokenTxs = await this.getTokenTransfers(client, address, from, to);
      transactions.push(...tokenTxs);
    }
    
    // Get NFT transfers if enabled
    if (config.includeNFTTransfers) {
      const nftTxs = await this.getNFTTransfers(client, address, from, to);
      transactions.push(...nftTxs);
    }
    
    // Sort by block number and dedupe
    const sorted = this.dedupeAndSort(transactions);
    
    // Update cache
    this.cache.set(cacheKey, sorted);
    this.cacheTimestamps.set(cacheKey, Date.now());
    
    return sorted;
  }
  
  /**
   * Get native transactions
   */
  private async getNativeTransactions(
    client: PublicClient,
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<UnifiedTransaction[]> {
    const transactions: UnifiedTransaction[] = [];
    
    // Get all blocks in range (paginated)
    const batchSize = 100;
    for (let i = fromBlock; i <= toBlock; i += batchSize) {
      const end = Math.min(i + batchSize - 1, toBlock);
      
      try {
        // Get blocks with transactions
        const blocks = await Promise.all(
          Array.from({ length: end - i + 1 }, (_, idx) => 
            client.getBlock({ 
              blockNumber: BigInt(i + idx),
              includeTransactions: true,
            }).catch(() => null)
          )
        );
        
        // Process each block
        for (const block of blocks) {
          if (!block) continue;
          
          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue;
            
            // Check if address is involved
            if (
              tx.from?.toLowerCase() === address.toLowerCase() ||
              tx.to?.toLowerCase() === address.toLowerCase()
            ) {
              // Get receipt for status
              const receipt = await client.getTransactionReceipt({ hash: tx.hash });
              
              transactions.push({
                hash: tx.hash,
                type: TransactionType.NATIVE,
                status: receipt.status === 'success' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                blockNumber: Number(block.number),
                timestamp: Number(block.timestamp),
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: tx.gasPrice?.toString() || '0',
                nonce: tx.nonce,
                input: tx.input,
                methodId: tx.input.slice(0, 10),
              });
            }
          }
        }
      } catch (error) {
        console.error(`Failed to scan blocks ${i}-${end}:`, error);
      }
    }
    
    return transactions;
  }
  
  /**
   * Get ERC20 token transfers
   */
  private async getTokenTransfers(
    client: PublicClient,
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<UnifiedTransaction[]> {
    const transactions: UnifiedTransaction[] = [];
    
    try {
      // Get Transfer events where address is from or to
      const logs = await client.getLogs({
        event: TRANSFER_EVENT,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        args: {
          from: address as `0x${string}`,
        },
      });
      
      const logsTo = await client.getLogs({
        event: TRANSFER_EVENT,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        args: {
          to: address as `0x${string}`,
        },
      });
      
      // Combine and process logs
      const allLogs = [...logs, ...logsTo];
      
      for (const log of allLogs) {
        if (!log.args.from || !log.args.to || !log.args.value) continue;
        
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        
        transactions.push({
          hash: log.transactionHash,
          type: TransactionType.ERC20,
          status: TransactionStatus.SUCCESS,
          from: log.args.from,
          to: log.args.to,
          value: '0',
          tokenAddress: log.address,
          tokenAmount: log.args.value.toString(),
          blockNumber: Number(log.blockNumber),
          timestamp: Number(block.timestamp),
          gasUsed: '0', // Would need receipt
          gasPrice: '0',
          nonce: 0,
          input: '0x',
        });
      }
    } catch (error) {
      console.error('Failed to get token transfers:', error);
    }
    
    return transactions;
  }
  
  /**
   * Get NFT transfers (ERC721 and ERC1155)
   */
  private async getNFTTransfers(
    client: PublicClient,
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<UnifiedTransaction[]> {
    const transactions: UnifiedTransaction[] = [];
    
    try {
      // Get ERC721 Transfer events
      const nftLogs = await client.getLogs({
        event: TRANSFER_EVENT,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        args: {
          from: address as `0x${string}`,
        },
      });
      
      const nftLogsTo = await client.getLogs({
        event: TRANSFER_EVENT,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        args: {
          to: address as `0x${string}`,
        },
      });
      
      // Process NFT transfers (check if value looks like token ID)
      for (const log of [...nftLogs, ...nftLogsTo]) {
        if (!log.args.from || !log.args.to || !log.args.value) continue;
        
        // Simple heuristic: if value is small, likely NFT token ID
        const value = log.args.value;
        if (value < 1000000n) {
          const block = await client.getBlock({ blockNumber: log.blockNumber });
          
          transactions.push({
            hash: log.transactionHash,
            type: TransactionType.ERC721,
            status: TransactionStatus.SUCCESS,
            from: log.args.from,
            to: log.args.to,
            value: '0',
            tokenAddress: log.address,
            tokenId: value.toString(),
            blockNumber: Number(log.blockNumber),
            timestamp: Number(block.timestamp),
            gasUsed: '0',
            gasPrice: '0',
            nonce: 0,
            input: '0x',
          });
        }
      }
    } catch (error) {
      console.error('Failed to get NFT transfers:', error);
    }
    
    return transactions;
  }
  
  /**
   * Dedupe and sort transactions
   */
  private dedupeAndSort(transactions: UnifiedTransaction[]): UnifiedTransaction[] {
    // Dedupe by hash
    const seen = new Set<string>();
    const deduped = transactions.filter(tx => {
      if (seen.has(tx.hash)) return false;
      seen.add(tx.hash);
      return true;
    });
    
    // Sort by block number (newest first)
    return deduped.sort((a, b) => b.blockNumber - a.blockNumber);
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}