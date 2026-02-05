/**
 * DAO Profile Card Component
 *
 * Displays user's DAO profile in the navbar with avatar, name, tier, and CGC balance.
 * Provides unified identity across DAO and Wallets platforms.
 *
 * Made by mbxarts.com The Moon in a Box property
 *
 * Co-Author: Godez22
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useDisconnect, useActiveWallet as useThirdwebWallet } from 'thirdweb/react';
import { useActiveWallet } from '../hooks/useActiveWallet';
import { useDAOProfile } from '../hooks/useDAOProfile';
import { clearAuth } from '../lib/siweClient';
import {
  User,
  LogOut,
  ExternalLink,
  ChevronDown,
  Wallet,
  Trophy,
  Coins,
  Settings,
  Loader2,
} from 'lucide-react';

// =====================================================
// CONSTANTS
// =====================================================

const DAO_APP_URL = process.env.NEXT_PUBLIC_DAO_URL || 'https://mbxarts.com';

// Tier badge colors
const TIER_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  Diamond: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  Platinum: { bg: 'bg-slate-300/20', text: 'text-slate-300', border: 'border-slate-400/30' },
  Gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  Silver: { bg: 'bg-gray-400/20', text: 'text-gray-300', border: 'border-gray-400/30' },
  Bronze: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  Starter: { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

// =====================================================
// PROPS
// =====================================================

interface DAOProfileCardProps {
  className?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const DAOProfileCard: React.FC<DAOProfileCardProps> = ({ className = '' }) => {
  const { account, currentWalletAddress } = useActiveWallet();
  const { profile, isLoading, hasProfile, createProfile } = useDAOProfile(currentWalletAddress);
  const thirdwebWallet = useThirdwebWallet();
  const { disconnect } = useDisconnect();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Complete logout: disconnect wallet + clear SIWE auth
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      clearAuth();

      if (thirdwebWallet) {
        disconnect(thirdwebWallet);
      }

      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('thirdweb') ||
            key.includes('walletconnect') ||
            key.includes('siwe') ||
            key.includes('auth') ||
            key.includes('dao_profile')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
      }

      setShowDropdown(false);
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * Create DAO profile if none exists
   */
  const handleCreateProfile = async () => {
    setIsCreatingProfile(true);
    try {
      await createProfile();
    } finally {
      setIsCreatingProfile(false);
    }
  };

  if (!account || !currentWalletAddress) {
    return null;
  }

  // Short address display
  const shortAddress = `${currentWalletAddress.slice(0, 6)}...${currentWalletAddress.slice(-4)}`;

  // Get tier styling
  const tierStyle = profile?.tier ? TIER_BADGES[profile.tier] : TIER_BADGES.Starter;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          bg-gradient-to-r from-purple-500/10 to-pink-500/10
          hover:from-purple-500/20 hover:to-pink-500/20
          border border-purple-500/20 hover:border-purple-500/40
          transition-all duration-200 group
        `}
      >
        {/* Avatar */}
        <div className="relative">
          {profile?.avatar_url ? (
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-500/30">
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || 'Profile'}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center ring-2 ring-purple-500/30">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-primary" />
        </div>

        {/* Name & Address (Desktop) */}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-text-primary leading-tight">
            {profile?.display_name || profile?.username || shortAddress}
          </span>
          {profile?.tier && (
            <span className={`text-xs font-medium ${tierStyle.text}`}>
              {profile.tier} Tier
            </span>
          )}
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${
            showDropdown ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          className={`
            absolute right-0 top-full mt-2 w-72
            bg-bg-secondary/95 backdrop-blur-xl
            border border-border-primary rounded-xl
            shadow-2xl shadow-purple-500/10
            z-50 overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
        >
          {/* Profile Header */}
          <div className="p-4 border-b border-border-primary bg-gradient-to-r from-purple-500/5 to-pink-500/5">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {profile?.avatar_url ? (
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/30">
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name || 'Profile'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center ring-2 ring-purple-500/30">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary truncate">
                  {profile?.display_name || profile?.username || 'Anonymous'}
                </p>
                <p className="text-xs text-text-muted font-mono">{shortAddress}</p>
                {profile?.tier && (
                  <span
                    className={`
                      inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}
                    `}
                  >
                    <Trophy className="w-3 h-3" />
                    {profile.tier}
                  </span>
                )}
              </div>
            </div>

            {/* CGC Balance */}
            {hasProfile && profile?.total_cgc_earned !== undefined && profile.total_cgc_earned > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    CGC Earned
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {profile.total_cgc_earned.toLocaleString()} CGC
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* Create Profile (if no profile) */}
            {!hasProfile && !isLoading && (
              <button
                onClick={handleCreateProfile}
                disabled={isCreatingProfile}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-text-secondary hover:text-text-primary hover:bg-purple-500/10 transition-colors"
              >
                {isCreatingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                ) : (
                  <User className="w-4 h-4 text-purple-400" />
                )}
                <span className="text-sm">Create DAO Profile</span>
              </button>
            )}

            {/* View Profile on DAO */}
            <a
              href={`${DAO_APP_URL}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-text-secondary hover:text-text-primary hover:bg-purple-500/10 transition-colors group"
            >
              <User className="w-4 h-4 text-purple-400" />
              <span className="text-sm flex-1">My DAO Profile</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* DAO Dashboard */}
            <a
              href={DAO_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-text-secondary hover:text-text-primary hover:bg-purple-500/10 transition-colors group"
            >
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="text-sm flex-1">DAO Dashboard</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Wallet Info */}
            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-mono">{shortAddress}</span>
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-border-primary" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span className="text-sm">Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DAOProfileCard;
