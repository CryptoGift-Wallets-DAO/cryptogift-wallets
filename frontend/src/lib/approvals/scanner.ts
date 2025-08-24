/**
 * On-chain Approval Scanner
 * Paginated, chain-aware scanning for token approvals
 */

import { 
  createPublicClient, 
  http, 
  getContract,
  parseAbiItem,
  type Address,
  type PublicClient,
  type Log,
} from 'viem';
import { mainnet, sepolia, base, baseSepolia } from 'viem/chains';
import { getChainConfig } from './config';

// Event signatures
const APPROVAL_EVENTS = {
  // ERC-20 Approval
  ERC20_APPROVAL: parseAbiItem('event Approval(address indexed owner, address indexed spender, uint256 value)'),
  // ERC-721 Approval
  ERC721_APPROVAL: parseAbiItem('event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)'),
  // ERC-721/1155 ApprovalForAll
  APPROVAL_FOR_ALL: parseAbiItem('event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'),
};

// Token ABIs for verification
const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
] as const;

const ERC721_ABI = [
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
] as const;

const ERC1155_ABI = [
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function uri(uint256 tokenId) view returns (string)',
] as const;

export interface TokenApproval {
  // Common fields
  token: Address;
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
  tokenName?: string;
  tokenSymbol?: string;
  spender: Address;
  owner: Address;
  
  // Type-specific fields
  allowance?: bigint; // ERC-20
  tokenId?: bigint; // ERC-721 individual
  isOperator?: boolean; // ERC-721/1155 operator
  
  // Metadata
  blockNumber: bigint;
  transactionHash: string;
  timestamp?: number;
  verified: boolean; // Current on-chain state verified
}

export interface ScanProgress {
  chainId: number;
  owner: Address;
  fromBlock: bigint;
  toBlock: bigint;
  currentBlock: bigint;
  totalBlocks: bigint;
  scannedBlocks: bigint;
  foundApprovals: number;
  errors: number;
}

export class ApprovalScanner {
  private client: PublicClient;
  private chainId: number;
  private maxBlockRange: number;
  private confirmations: number;
  private abortController?: AbortController;

  constructor(chainId: number) {
    this.chainId = chainId;
    const config = getChainConfig(chainId);
    this.maxBlockRange = config.rpcLimits.maxBlockRange;
    this.confirmations = 12; // Default confirmations
    
    // Create chain-specific client
    const chain = this.getChain(chainId);
    this.client = createPublicClient({
      chain,
      transport: http(),
    }) as PublicClient;
  }

  private getChain(chainId: number) {
    switch (chainId) {
      case 1: return mainnet;
      case 11155111: return sepolia;
      case 8453: return base;
      case 84532: return baseSepolia;
      default: throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  /**
   * Scan for all approvals for a given owner
   */
  async scanApprovals(
    owner: Address,
    options: {
      fromBlock?: bigint;
      toBlock?: bigint;
      onProgress?: (progress: ScanProgress) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<TokenApproval[]> {
    const currentBlock = await this.client.getBlockNumber();
    const safeBlock = currentBlock - BigInt(this.confirmations);
    
    const config = getChainConfig(this.chainId);
    const fromBlock = options.fromBlock || BigInt(config.startBlock || 0);
    const toBlock = options.toBlock || safeBlock;
    
    const approvals: TokenApproval[] = [];
    const processedPairs = new Set<string>(); // Track unique token-spender pairs
    
    // Paginate through blocks
    let currentFromBlock = fromBlock;
    while (currentFromBlock < toBlock) {
      // Check for abort signal
      if (options.signal?.aborted) {
        throw new Error('Scan aborted');
      }
      
      const currentToBlock = currentFromBlock + BigInt(this.maxBlockRange) > toBlock
        ? toBlock
        : currentFromBlock + BigInt(this.maxBlockRange);
      
      // Report progress
      if (options.onProgress) {
        options.onProgress({
          chainId: this.chainId,
          owner,
          fromBlock,
          toBlock,
          currentBlock: currentFromBlock,
          totalBlocks: toBlock - fromBlock,
          scannedBlocks: currentFromBlock - fromBlock,
          foundApprovals: approvals.length,
          errors: 0,
        });
      }
      
      try {
        // Scan for ERC-20 approvals
        const erc20Logs = await this.scanERC20Approvals(
          owner,
          currentFromBlock,
          currentToBlock
        );
        
        // Scan for ERC-721/1155 approvals
        const nftLogs = await this.scanNFTApprovals(
          owner,
          currentFromBlock,
          currentToBlock
        );
        
        // Process and verify each approval
        for (const log of [...erc20Logs, ...nftLogs]) {
          const approval = await this.processApprovalLog(log, owner);
          if (approval && approval.verified) {
            const key = `${approval.token}-${approval.spender}-${approval.tokenId || ''}`;
            if (!processedPairs.has(key)) {
              processedPairs.add(key);
              approvals.push(approval);
            }
          }
        }
        
      } catch (error) {
        console.error(`Error scanning blocks ${currentFromBlock}-${currentToBlock}:`, error);
        // Implement exponential backoff on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      currentFromBlock = currentToBlock + BigInt(1);
    }
    
    return approvals;
  }

  /**
   * Scan for ERC-20 approvals
   */
  private async scanERC20Approvals(
    owner: Address,
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<Log[]> {
    try {
      const logs = await this.client.getLogs({
        address: undefined, // All tokens
        event: APPROVAL_EVENTS.ERC20_APPROVAL,
        args: {
          owner,
        },
        fromBlock,
        toBlock,
      });
      
      return logs as Log[];
    } catch (error) {
      console.error('Error scanning ERC-20 approvals:', error);
      return [];
    }
  }

  /**
   * Scan for NFT approvals (ERC-721/1155)
   */
  private async scanNFTApprovals(
    owner: Address,
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<Log[]> {
    try {
      const logs = await this.client.getLogs({
        address: undefined, // All tokens
        event: APPROVAL_EVENTS.APPROVAL_FOR_ALL,
        args: {
          owner,
        },
        fromBlock,
        toBlock,
      });
      
      return logs as Log[];
    } catch (error) {
      console.error('Error scanning NFT approvals:', error);
      return [];
    }
  }

  /**
   * Process and verify an approval log
   */
  private async processApprovalLog(
    log: Log,
    owner: Address
  ): Promise<TokenApproval | null> {
    try {
      // Cast to any to access topics which might not be in type definition
      const logWithTopics = log as any;
      const { address: token, data, blockNumber, transactionHash } = log;
      const topics = logWithTopics.topics || [];
      
      // Determine token type and extract data
      if (topics[0] === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925') {
        // ERC-20 or ERC-721 Approval event
        return await this.processERC20Or721Approval(
          token as Address,
          log,
          owner
        );
      } else if (topics[0] === '0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31') {
        // ApprovalForAll event
        return await this.processApprovalForAll(
          token as Address,
          log,
          owner
        );
      }
      
      return null;
    } catch (error) {
      console.error('Error processing approval log:', error);
      return null;
    }
  }

  /**
   * Process ERC-20 or ERC-721 approval
   */
  private async processERC20Or721Approval(
    token: Address,
    log: Log,
    owner: Address
  ): Promise<TokenApproval | null> {
    const logWithTopics = log as any;
    const spender = (logWithTopics.topics?.[2] || logWithTopics.args?.spender) as Address;
    
    // Try ERC-20 first
    try {
      const contract = getContract({
        address: token,
        abi: ERC20_ABI,
        client: this.client as any,
      });
      
      const [allowance, symbol, name] = await Promise.all([
        (contract as any).read.allowance([owner, spender]),
        (contract as any).read.symbol().catch(() => 'UNKNOWN'),
        (contract as any).read.name().catch(() => 'Unknown Token'),
      ]);
      
      // Only include if allowance > 0
      if (allowance > BigInt(0)) {
        return {
          token,
          tokenType: 'ERC20',
          tokenName: name as string,
          tokenSymbol: symbol as string,
          spender,
          owner,
          allowance: allowance as bigint,
          blockNumber: log.blockNumber!,
          transactionHash: log.transactionHash!,
          verified: true,
        };
      }
    } catch (error) {
      // Not ERC-20, try ERC-721
      try {
        const tokenId = logWithTopics.topics?.[3] ? BigInt(logWithTopics.topics[3]) : undefined;
        if (tokenId !== undefined) {
          const contract = getContract({
            address: token,
            abi: ERC721_ABI,
            client: this.client as any,
          });
          
          const approved = await (contract as any).read.getApproved([tokenId]);
          
          if (approved === spender) {
            const [symbol, name] = await Promise.all([
              (contract as any).read.symbol().catch(() => 'NFT'),
              (contract as any).read.name().catch(() => 'Unknown NFT'),
            ]);
            
            return {
              token,
              tokenType: 'ERC721',
              tokenName: name as string,
              tokenSymbol: symbol as string,
              spender,
              owner,
              tokenId,
              blockNumber: log.blockNumber!,
              transactionHash: log.transactionHash!,
              verified: true,
            };
          }
        }
      } catch (error) {
        // Not ERC-721 either
      }
    }
    
    return null;
  }

  /**
   * Process ApprovalForAll event
   */
  private async processApprovalForAll(
    token: Address,
    log: Log,
    owner: Address
  ): Promise<TokenApproval | null> {
    const logWithTopics = log as any;
    const operator = (logWithTopics.topics?.[2] || logWithTopics.args?.operator) as Address;
    
    // Try ERC-721
    try {
      const contract = getContract({
        address: token,
        abi: ERC721_ABI,
        client: this.client as any,
      });
      
      const isApproved = await (contract as any).read.isApprovedForAll([owner, operator]);
      
      if (isApproved) {
        const [symbol, name] = await Promise.all([
          (contract as any).read.symbol().catch(() => 'NFT'),
          (contract as any).read.name().catch(() => 'Unknown NFT'),
        ]);
        
        return {
          token,
          tokenType: 'ERC721',
          tokenName: name as string,
          tokenSymbol: symbol as string,
          spender: operator,
          owner,
          isOperator: true,
          blockNumber: log.blockNumber!,
          transactionHash: log.transactionHash!,
          verified: true,
        };
      }
    } catch (error) {
      // Try ERC-1155
      try {
        const contract = getContract({
          address: token,
          abi: ERC1155_ABI,
          client: this.client as any,
        });
        
        const isApproved = await (contract as any).read.isApprovedForAll([owner, operator]);
        
        if (isApproved) {
          return {
            token,
            tokenType: 'ERC1155',
            tokenName: 'ERC-1155 Token',
            tokenSymbol: 'ERC1155',
            spender: operator,
            owner,
            isOperator: true,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
            verified: true,
          };
        }
      } catch (error) {
        // Not ERC-1155 either
      }
    }
    
    return null;
  }

  /**
   * Cancel ongoing scan
   */
  abort() {
    this.abortController?.abort();
  }
}