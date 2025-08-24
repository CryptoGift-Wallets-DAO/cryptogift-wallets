/**
 * Input Validation & Sanitization
 * OWASP compliant validation rules
 */

import { z } from 'zod';

// Ethereum address validation
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform(val => val.toLowerCase());

// Transaction hash validation
export const transactionHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

// Chain ID validation
export const chainIdSchema = z
  .number()
  .int()
  .positive()
  .refine(
    val => [1, 5, 10, 137, 8453, 84532, 11155111].includes(val),
    'Unsupported chain ID'
  );

// Amount validation (ETH/token amounts)
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Invalid amount format')
  .refine(val => parseFloat(val) > 0, 'Amount must be positive')
  .refine(val => parseFloat(val) <= 1000000, 'Amount too large');

// Token symbol validation
export const tokenSymbolSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[A-Z0-9]+$/, 'Invalid token symbol');

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    val => {
      const url = new URL(val);
      return ['http:', 'https:', 'ipfs:'].includes(url.protocol);
    },
    'Invalid protocol'
  );

// IPFS CID validation
export const ipfsCidSchema = z
  .string()
  .regex(
    /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|B[A-Z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48}|F[0-9A-F]{50})$/,
    'Invalid IPFS CID'
  );

// Signature validation
export const signatureSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature');

// Nonce validation
export const nonceSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9]+$/, 'Invalid nonce');

// API key validation
export const apiKeySchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format');

// Bridge request validation
export const bridgeRequestSchema = z.object({
  fromChain: chainIdSchema,
  toChain: chainIdSchema,
  fromToken: tokenSymbolSchema,
  toToken: tokenSymbolSchema,
  amount: amountSchema,
  fromAddress: ethereumAddressSchema,
  toAddress: ethereumAddressSchema.optional(),
  slippage: z.number().min(0).max(0.1).optional(), // Max 10% slippage
});

// On-ramp request validation
export const onrampRequestSchema = z.object({
  amount: z.number().min(20).max(5000), // USD limits
  crypto: z.enum(['ETH', 'USDC', 'USDT']),
  fiatCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  walletAddress: ethereumAddressSchema,
  network: z.enum(['ethereum', 'base', 'polygon', 'arbitrum']),
});

// Session key request validation
export const sessionKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration: z.number().min(3600).max(86400), // 1-24 hours
  maxValue: z.string().regex(/^\d+$/), // Wei amount
  allowedSelectors: z.array(
    z.string().regex(/^0x[a-fA-F0-9]{8}$/)
  ).min(1).max(10),
});

// Recovery request validation
export const recoveryRequestSchema = z.object({
  newOwner: ethereumAddressSchema,
  guardianAddress: ethereumAddressSchema,
  signature: signatureSchema.optional(),
});

/**
 * Sanitize user input for display
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize file uploads
 */
export const fileUploadSchema = z.object({
  name: z.string().max(255),
  type: z.enum([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ]),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
});

/**
 * Rate limit key validation
 */
export function validateRateLimitKey(key: string): boolean {
  return /^[a-zA-Z0-9:._-]+$/.test(key) && key.length <= 255;
}

/**
 * Validate pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().regex(/^[a-zA-Z_]+$/).optional(),
});

/**
 * Validate search query
 */
export const searchQuerySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9\s.,_-]+$/, 'Invalid search query')
  .transform(val => sanitizeHtml(val));

/**
 * Idempotency key validation
 */
export const idempotencyKeySchema = z
  .string()
  .uuid('Invalid idempotency key');

/**
 * CSP violation report validation
 */
export const cspReportSchema = z.object({
  'csp-report': z.object({
    'document-uri': z.string().url(),
    'violated-directive': z.string(),
    'effective-directive': z.string(),
    'original-policy': z.string(),
    'blocked-uri': z.string().optional(),
    'status-code': z.number().optional(),
    'referrer': z.string().optional(),
    'script-sample': z.string().optional(),
    'line-number': z.number().optional(),
    'column-number': z.number().optional(),
  }),
});

/**
 * Validate environment variables
 */
export function validateEnvVars(): void {
  const required = [
    'NEXT_PUBLIC_TW_CLIENT_ID',
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_RPC_URL',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate format
  if (process.env.NEXT_PUBLIC_CHAIN_ID) {
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID);
    if (isNaN(chainId) || chainId <= 0) {
      throw new Error('Invalid NEXT_PUBLIC_CHAIN_ID');
    }
  }
  
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_RPC_URL);
    } catch {
      throw new Error('Invalid NEXT_PUBLIC_RPC_URL');
    }
  }
}

/**
 * Create validated API handler
 */
export function createValidatedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Parse request body
      const body = await req.json();
      
      // Validate
      const validated = schema.parse(body);
      
      // Call handler with validated data
      return await handler(validated, req);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: 'Validation error',
            details: error.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw error;
    }
  };
}