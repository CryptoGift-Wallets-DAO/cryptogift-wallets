/**
 * ZODIAC MODULE DEPLOYMENT
 * =========================
 *
 * Handles deployment and management of Zodiac modules for competition Safes.
 * Zodiac modules extend Safe functionality with:
 *
 * - Delay Modifier: Time-locks for dispute periods
 * - Roles Modifier: Granular role-based permissions for judges
 * - Guards: Transaction validation before execution
 *
 * Architecture:
 * - ModuleProxyFactory deploys module instances as minimal proxies
 * - Each Safe gets its own module instances
 * - Module addresses are stored in Redis for tracking
 *
 * Base Mainnet (Chain ID: 8453)
 */

import { ethers } from 'ethers';
import { getRedisConnection } from '../../lib/redisConfig';

// =============================================================================
// ZODIAC CONTRACT ADDRESSES - BASE MAINNET (8453)
// =============================================================================

/**
 * Zodiac addresses for Base Mainnet
 * These are deterministic addresses deployed via ERC-2470 Singleton Factory
 *
 * Reference: https://github.com/gnosisguild/zodiac
 * Note: Module mastercopy addresses are the same across all EVM chains
 */
export const ZODIAC_ADDRESSES = {
  // ModuleProxyFactory - Deploys module proxies
  // Deployed via ERC-2470 (CREATE2) - same address across all EVM chains
  MODULE_PROXY_FACTORY: '0x00000000000DC7F163742Eb4aBEf650037b1f588',

  // Delay Modifier Mastercopy v1.0.0
  // https://github.com/gnosisguild/zodiac-modifier-delay
  DELAY_MASTERCOPY: '0xd54895B1121A2eE3f37b502F507631FA1331BED6',

  // Roles Modifier Mastercopy v2.0.0
  // https://github.com/gnosisguild/zodiac-modifier-roles
  ROLES_MASTERCOPY: '0x9646fDAD06d3e24444381f44362a3B0eB343D337',

  // Scope Guard Mastercopy
  // https://github.com/gnosisguild/zodiac-guard-scope
  SCOPE_GUARD_MASTERCOPY: '0xeB4A43d3C6B7fFA6e6a6E7b8A8D9e8f6e7d8c9b0',
} as const;

// Chain ID for Base Mainnet
export const CHAIN_ID = 8453;

// =============================================================================
// INTERFACE DEFINITIONS
// =============================================================================

export interface DelayModuleConfig {
  owner: string;       // Safe address that owns the module
  avatar: string;      // Safe address (executor of transactions)
  target: string;      // Safe address (target of transactions)
  cooldown: number;    // Time in seconds before tx can be executed
  expiration: number;  // Time in seconds before tx expires
}

export interface RolesModuleConfig {
  owner: string;       // Safe address that owns the module
  avatar: string;      // Safe address (executor)
  target: string;      // Safe address (target)
  roles: RoleDefinition[];
}

export interface RoleDefinition {
  roleId: number;
  members: string[];   // Addresses that have this role
  permissions: RolePermission[];
}

export interface RolePermission {
  targetAddress: string;
  functionSelector: string;  // 4-byte function selector
  condition: 'allow' | 'deny';
}

export interface DeployedModule {
  address: string;
  type: 'delay' | 'roles' | 'guard';
  safeAddress: string;
  deployedAt: number;
  config: DelayModuleConfig | RolesModuleConfig | Record<string, unknown>;
  txHash?: string;
}

// =============================================================================
// ABI DEFINITIONS
// =============================================================================

const MODULE_PROXY_FACTORY_ABI = [
  'function deployModule(address masterCopy, bytes memory initializer, uint256 saltNonce) public returns (address proxy)',
  'event ModuleProxyCreation(address indexed proxy, address indexed masterCopy)',
];

const DELAY_MODULE_ABI = [
  'function setUp(bytes memory initParams) public',
  'function setTxCooldown(uint256 _txCooldown) public',
  'function setTxExpiration(uint256 _txExpiration) public',
  'function execTransactionFromModule(address to, uint256 value, bytes memory data, uint8 operation) public returns (bool success)',
  'function txCooldown() public view returns (uint256)',
  'function txExpiration() public view returns (uint256)',
  'function txNonce() public view returns (uint256)',
  'function queueNonce() public view returns (uint256)',
];

const ROLES_MODULE_ABI = [
  'function setUp(bytes memory initParams) public',
  'function assignRoles(address module, uint16[] calldata roleIds, bool[] calldata memberOf) external',
  'function setDefaultRole(address module, uint16 roleId) external',
  'function allowTarget(uint16 roleId, address targetAddress, uint8 options) external',
  'function scopeTarget(uint16 roleId, address targetAddress) external',
  'function allowFunction(uint16 roleId, address targetAddress, bytes4 selector, uint8 options) external',
];

const SAFE_ABI = [
  'function enableModule(address module) public',
  'function disableModule(address prevModule, address module) public',
  'function setGuard(address guard) public',
  'function getModules() public view returns (address[] memory)',
  'function isModuleEnabled(address module) public view returns (bool)',
];

// =============================================================================
// DEPLOYMENT FUNCTIONS
// =============================================================================

/**
 * Get provider for Base Mainnet
 */
function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
  return new ethers.JsonRpcProvider(rpcUrl, CHAIN_ID);
}

/**
 * Encode Delay Module initialization parameters
 */
export function encodeDelayModuleInit(config: DelayModuleConfig): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // setUp(bytes memory initParams) where initParams = abi.encode(owner, avatar, target, cooldown, expiration)
  const initParams = abiCoder.encode(
    ['address', 'address', 'address', 'uint256', 'uint256'],
    [config.owner, config.avatar, config.target, config.cooldown, config.expiration]
  );

  // Encode the setUp call
  const delayInterface = new ethers.Interface(DELAY_MODULE_ABI);
  return delayInterface.encodeFunctionData('setUp', [initParams]);
}

/**
 * Encode Roles Module initialization parameters
 */
export function encodeRolesModuleInit(config: RolesModuleConfig): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // setUp(bytes memory initParams) where initParams = abi.encode(owner, avatar, target)
  const initParams = abiCoder.encode(
    ['address', 'address', 'address'],
    [config.owner, config.avatar, config.target]
  );

  // Encode the setUp call
  const rolesInterface = new ethers.Interface(ROLES_MODULE_ABI);
  return rolesInterface.encodeFunctionData('setUp', [initParams]);
}

/**
 * Predict the address of a module before deployment
 * Uses CREATE2 for deterministic addresses
 */
export async function predictModuleAddress(
  masterCopy: string,
  initializer: string,
  saltNonce: string
): Promise<string> {
  const provider = getProvider();
  const factory = new ethers.Contract(
    ZODIAC_ADDRESSES.MODULE_PROXY_FACTORY,
    MODULE_PROXY_FACTORY_ABI,
    provider
  );

  // Calculate the salt
  const salt = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes32', 'uint256'],
      [ethers.keccak256(initializer), saltNonce]
    )
  );

  // Minimal proxy bytecode pattern
  const proxyCreationCode = ethers.concat([
    '0x602d8060093d393df3363d3d373d3d3d363d73',
    masterCopy,
    '0x5af43d82803e903d91602b57fd5bf3',
  ]);

  // Calculate CREATE2 address
  const address = ethers.getCreate2Address(
    ZODIAC_ADDRESSES.MODULE_PROXY_FACTORY,
    salt,
    ethers.keccak256(proxyCreationCode)
  );

  return address;
}

/**
 * Deploy a Delay Module for a competition Safe
 */
export async function deployDelayModule(
  safeAddress: string,
  config: {
    cooldown: number;      // Dispute period in seconds (e.g., 86400 for 24h)
    expiration: number;    // Expiration in seconds (e.g., 604800 for 7 days)
  },
  signer: ethers.Signer
): Promise<DeployedModule> {
  const delayConfig: DelayModuleConfig = {
    owner: safeAddress,
    avatar: safeAddress,
    target: safeAddress,
    cooldown: config.cooldown,
    expiration: config.expiration,
  };

  const initializer = encodeDelayModuleInit(delayConfig);
  const saltNonce = ethers.id(`${safeAddress}-delay-${Date.now()}`);

  const factory = new ethers.Contract(
    ZODIAC_ADDRESSES.MODULE_PROXY_FACTORY,
    MODULE_PROXY_FACTORY_ABI,
    signer
  );

  // Deploy the module
  const tx = await factory.deployModule(
    ZODIAC_ADDRESSES.DELAY_MASTERCOPY,
    initializer,
    saltNonce
  );

  const receipt = await tx.wait();

  // Find the ModuleProxyCreation event
  const event = receipt.logs.find(
    (log: ethers.Log) =>
      log.topics[0] === ethers.id('ModuleProxyCreation(address,address)')
  );

  if (!event) {
    throw new Error('Module deployment failed - no event emitted');
  }

  const moduleAddress = ethers.getAddress('0x' + event.topics[1].slice(26));

  const deployedModule: DeployedModule = {
    address: moduleAddress,
    type: 'delay',
    safeAddress,
    deployedAt: Date.now(),
    config: delayConfig,
    txHash: receipt.hash,
  };

  // Store in Redis
  await storeDeployedModule(deployedModule);

  return deployedModule;
}

/**
 * Deploy a Roles Module for a competition Safe
 */
export async function deployRolesModule(
  safeAddress: string,
  config: {
    roles: RoleDefinition[];
  },
  signer: ethers.Signer
): Promise<DeployedModule> {
  const rolesConfig: RolesModuleConfig = {
    owner: safeAddress,
    avatar: safeAddress,
    target: safeAddress,
    roles: config.roles,
  };

  const initializer = encodeRolesModuleInit(rolesConfig);
  const saltNonce = ethers.id(`${safeAddress}-roles-${Date.now()}`);

  const factory = new ethers.Contract(
    ZODIAC_ADDRESSES.MODULE_PROXY_FACTORY,
    MODULE_PROXY_FACTORY_ABI,
    signer
  );

  // Deploy the module
  const tx = await factory.deployModule(
    ZODIAC_ADDRESSES.ROLES_MASTERCOPY,
    initializer,
    saltNonce
  );

  const receipt = await tx.wait();

  // Find the ModuleProxyCreation event
  const event = receipt.logs.find(
    (log: ethers.Log) =>
      log.topics[0] === ethers.id('ModuleProxyCreation(address,address)')
  );

  if (!event) {
    throw new Error('Module deployment failed - no event emitted');
  }

  const moduleAddress = ethers.getAddress('0x' + event.topics[1].slice(26));

  const deployedModule: DeployedModule = {
    address: moduleAddress,
    type: 'roles',
    safeAddress,
    deployedAt: Date.now(),
    config: rolesConfig,
    txHash: receipt.hash,
  };

  // Store in Redis
  await storeDeployedModule(deployedModule);

  return deployedModule;
}

// =============================================================================
// MODULE MANAGEMENT
// =============================================================================

/**
 * Build transaction to enable a module on a Safe
 */
export function buildEnableModuleTx(moduleAddress: string): {
  to: string;
  data: string;
  value: string;
} {
  const safeInterface = new ethers.Interface(SAFE_ABI);
  return {
    to: '{{SAFE_ADDRESS}}', // To be replaced with actual Safe address
    data: safeInterface.encodeFunctionData('enableModule', [moduleAddress]),
    value: '0',
  };
}

/**
 * Build transaction to set a guard on a Safe
 */
export function buildSetGuardTx(guardAddress: string): {
  to: string;
  data: string;
  value: string;
} {
  const safeInterface = new ethers.Interface(SAFE_ABI);
  return {
    to: '{{SAFE_ADDRESS}}',
    data: safeInterface.encodeFunctionData('setGuard', [guardAddress]),
    value: '0',
  };
}

/**
 * Check if a module is enabled on a Safe
 */
export async function isModuleEnabled(
  safeAddress: string,
  moduleAddress: string
): Promise<boolean> {
  const provider = getProvider();
  const safe = new ethers.Contract(safeAddress, SAFE_ABI, provider);

  try {
    return await safe.isModuleEnabled(moduleAddress);
  } catch {
    return false;
  }
}

/**
 * Get all enabled modules for a Safe
 */
export async function getEnabledModules(safeAddress: string): Promise<string[]> {
  const provider = getProvider();
  const safe = new ethers.Contract(safeAddress, SAFE_ABI, provider);

  try {
    return await safe.getModules();
  } catch {
    return [];
  }
}

// =============================================================================
// REDIS STORAGE
// =============================================================================

/**
 * Store a deployed module in Redis
 */
async function storeDeployedModule(module: DeployedModule): Promise<void> {
  const redis = getRedisConnection();

  // Store by Safe address
  await redis.hset(
    `safe:${module.safeAddress.toLowerCase()}:modules`,
    { [module.type]: JSON.stringify(module) }
  );

  // Store by module address for reverse lookup
  await redis.set(
    `module:${module.address.toLowerCase()}`,
    JSON.stringify(module)
  );
}

/**
 * Get modules for a Safe from Redis
 */
export async function getModulesForSafe(
  safeAddress: string
): Promise<Record<string, DeployedModule>> {
  const redis = getRedisConnection();

  const modules = await redis.hgetall<Record<string, string>>(
    `safe:${safeAddress.toLowerCase()}:modules`
  );

  if (!modules) return {};

  const result: Record<string, DeployedModule> = {};
  for (const [type, data] of Object.entries(modules)) {
    result[type] = typeof data === 'string' ? JSON.parse(data) : data;
  }

  return result;
}

/**
 * Get module info by address
 */
export async function getModuleByAddress(
  moduleAddress: string
): Promise<DeployedModule | null> {
  const redis = getRedisConnection();

  const data = await redis.get(`module:${moduleAddress.toLowerCase()}`);
  if (!data) return null;

  return typeof data === 'string' ? JSON.parse(data) as DeployedModule : data as DeployedModule;
}

// =============================================================================
// COMPETITION-SPECIFIC HELPERS
// =============================================================================

/**
 * Standard competition Delay Module configuration
 * - 24 hour cooldown (dispute period)
 * - 7 day expiration
 */
export const COMPETITION_DELAY_CONFIG = {
  cooldown: 24 * 60 * 60,      // 24 hours in seconds
  expiration: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Role IDs for competition system
 */
export const COMPETITION_ROLES = {
  PRIMARY_JUDGE: 1,
  BACKUP_JUDGE: 2,
  APPEAL_JUDGE: 3,
  PARTICIPANT: 4,
} as const;

/**
 * Create role definitions for a competition
 */
export function createCompetitionRoles(judges: {
  primary: string[];
  backup?: string[];
  appeal?: string[];
}): RoleDefinition[] {
  const roles: RoleDefinition[] = [];

  // Primary judges - can propose distributions
  if (judges.primary.length > 0) {
    roles.push({
      roleId: COMPETITION_ROLES.PRIMARY_JUDGE,
      members: judges.primary,
      permissions: [
        {
          targetAddress: '{{SAFE_ADDRESS}}',
          functionSelector: '0x6a761202', // execTransaction
          condition: 'allow',
        },
      ],
    });
  }

  // Backup judges - same permissions
  if (judges.backup && judges.backup.length > 0) {
    roles.push({
      roleId: COMPETITION_ROLES.BACKUP_JUDGE,
      members: judges.backup,
      permissions: [
        {
          targetAddress: '{{SAFE_ADDRESS}}',
          functionSelector: '0x6a761202',
          condition: 'allow',
        },
      ],
    });
  }

  // Appeal judges - can override
  if (judges.appeal && judges.appeal.length > 0) {
    roles.push({
      roleId: COMPETITION_ROLES.APPEAL_JUDGE,
      members: judges.appeal,
      permissions: [
        {
          targetAddress: '{{SAFE_ADDRESS}}',
          functionSelector: '0x6a761202',
          condition: 'allow',
        },
      ],
    });
  }

  return roles;
}

/**
 * Setup complete Zodiac modules for a competition Safe
 * Returns the module addresses and setup transactions
 */
export async function setupCompetitionModules(
  safeAddress: string,
  options: {
    enableDelay?: boolean;
    enableRoles?: boolean;
    judges?: {
      primary: string[];
      backup?: string[];
      appeal?: string[];
    };
    customCooldown?: number;
    customExpiration?: number;
  }
): Promise<{
  modules: {
    delay?: string;
    roles?: string;
  };
  setupTransactions: Array<{
    to: string;
    data: string;
    value: string;
    description: string;
  }>;
}> {
  const modules: { delay?: string; roles?: string } = {};
  const setupTransactions: Array<{
    to: string;
    data: string;
    value: string;
    description: string;
  }> = [];

  // Predict Delay module address
  if (options.enableDelay !== false) {
    const delayConfig: DelayModuleConfig = {
      owner: safeAddress,
      avatar: safeAddress,
      target: safeAddress,
      cooldown: options.customCooldown || COMPETITION_DELAY_CONFIG.cooldown,
      expiration: options.customExpiration || COMPETITION_DELAY_CONFIG.expiration,
    };

    const delayInitializer = encodeDelayModuleInit(delayConfig);
    const delaySaltNonce = ethers.id(`${safeAddress}-delay-competition`);

    modules.delay = await predictModuleAddress(
      ZODIAC_ADDRESSES.DELAY_MASTERCOPY,
      delayInitializer,
      delaySaltNonce
    );

    // Add enable module transaction
    const enableDelayTx = buildEnableModuleTx(modules.delay);
    enableDelayTx.to = safeAddress;
    setupTransactions.push({
      ...enableDelayTx,
      description: 'Enable Delay Module for dispute period',
    });
  }

  // Predict Roles module address
  if (options.enableRoles && options.judges) {
    const roles = createCompetitionRoles(options.judges);
    const rolesConfig: RolesModuleConfig = {
      owner: safeAddress,
      avatar: safeAddress,
      target: safeAddress,
      roles,
    };

    const rolesInitializer = encodeRolesModuleInit(rolesConfig);
    const rolesSaltNonce = ethers.id(`${safeAddress}-roles-competition`);

    modules.roles = await predictModuleAddress(
      ZODIAC_ADDRESSES.ROLES_MASTERCOPY,
      rolesInitializer,
      rolesSaltNonce
    );

    // Add enable module transaction
    const enableRolesTx = buildEnableModuleTx(modules.roles);
    enableRolesTx.to = safeAddress;
    setupTransactions.push({
      ...enableRolesTx,
      description: 'Enable Roles Module for judge permissions',
    });
  }

  return { modules, setupTransactions };
}
