/**
 * 🔗 MBXarts Integration Hub (Wallets)
 *
 * Central export point for cross-service integrations.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// Configuration
export * from './config';

// API Client
export * from './api-client';

// Service Clients
export { daoService, DAOServiceClient } from './dao-service';
export type {
  UserProfile,
  ProfileUpdateRequest,
  ReferralCode,
  ReferralStats,
  ReferralNetwork,
  Task,
  CGCStats,
} from './dao-service';
