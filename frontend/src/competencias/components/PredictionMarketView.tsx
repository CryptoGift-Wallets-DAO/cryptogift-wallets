/**
 * PREDICTION MARKET VIEW
 * Interactive UI for Prediction Markets with CPMM Visualization
 *
 * Features:
 * - Real-time probability display
 * - Bet placement interface
 * - CPMM pool visualization
 * - Position management
 * - Price impact calculator
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Info,
  Calculator,
  RefreshCw,
  ExternalLink,
  BarChart2,
  Loader2,
  CheckCircle,
  History,
} from 'lucide-react';
import {
  Competition,
  ManifoldBet,
  CPMMState,
} from '../types';
import {
  calculateShares,
  calculateNewProbability,
  calculatePayout,
  getCPMMState,
} from '../lib/manifoldClient';

// =============================================================================
// TYPES
// =============================================================================

export interface PredictionMarketViewProps {
  competition: Competition;
  userBets?: ManifoldBet[];
  userBalance?: number;
  onPlaceBet?: (outcome: 'YES' | 'NO', amount: number) => Promise<void>;
  onSellShares?: (outcome: 'YES' | 'NO', shares: number) => Promise<void>;
  className?: string;
}

interface BetSlipProps {
  outcome: 'YES' | 'NO';
  amount: number;
  shares: number;
  avgPrice: number;
  newProbability: number;
  onAmountChange: (amount: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatProbability(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

function formatCurrency(amount: number, currency: string = 'ETH'): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${currency}`;
  }
  return `${amount.toFixed(2)} ${currency}`;
}

function getProbabilityColor(prob: number): string {
  if (prob >= 0.7) return 'text-green-500';
  if (prob >= 0.5) return 'text-blue-500';
  if (prob >= 0.3) return 'text-yellow-500';
  return 'text-red-500';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Probability Display with Animation
 */
const ProbabilityDisplay: React.FC<{
  probability: number;
  change?: number;
  question?: string;
}> = ({ probability, change, question }) => {
  const colorClass = getProbabilityColor(probability);

  return (
    <div className="text-center">
      {question && (
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {question}
        </h3>
      )}

      <motion.div
        key={probability}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`text-6xl font-bold ${colorClass}`}
      >
        {formatProbability(probability)}
      </motion.div>

      {change !== undefined && change !== 0 && (
        <div className={`
          flex items-center justify-center gap-1 mt-2 text-sm
          ${change > 0 ? 'text-green-500' : 'text-red-500'}
        `}>
          {change > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}% últimas 24h
        </div>
      )}

      <p className="text-gray-500 dark:text-gray-400 mt-2">
        Probabilidad de SÍ
      </p>
    </div>
  );
};

/**
 * CPMM Pool Visualization
 */
const PoolVisualization: React.FC<{
  pool: { yesPool: number; noPool: number };
  totalLiquidity: number;
}> = ({ pool, totalLiquidity }) => {
  const yesPercentage = (pool.yesPool / (pool.yesPool + pool.noPool)) * 100;
  const noPercentage = 100 - yesPercentage;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Pool Composition</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {formatCurrency(totalLiquidity)} Total
        </span>
      </div>

      <div className="relative h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400"
          initial={{ width: 0 }}
          animate={{ width: `${yesPercentage}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-500 to-red-400"
          initial={{ width: 0 }}
          animate={{ width: `${noPercentage}%` }}
          transition={{ duration: 0.5 }}
        />

        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white">
          <span>SÍ {yesPercentage.toFixed(0)}%</span>
          <span>NO {noPercentage.toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="text-xs text-green-600 dark:text-green-400">Pool SÍ</div>
          <div className="font-bold text-green-700 dark:text-green-300">
            {formatCurrency(pool.yesPool)}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div className="text-xs text-red-600 dark:text-red-400">Pool NO</div>
          <div className="font-bold text-red-700 dark:text-red-300">
            {formatCurrency(pool.noPool)}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Bet Button
 */
const BetButton: React.FC<{
  outcome: 'YES' | 'NO';
  probability: number;
  payout: number;
  onClick: () => void;
  disabled?: boolean;
}> = ({ outcome, probability, payout, onClick, disabled }) => {
  const isYes = outcome === 'YES';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 p-4 rounded-xl font-medium transition-all
        ${isYes
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
          : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
        }
        text-white hover:shadow-lg hover:scale-[1.02]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
      `}
    >
      <div className="text-2xl font-bold">
        {isYes ? 'SÍ' : 'NO'}
      </div>
      <div className="text-sm opacity-90">
        {formatProbability(isYes ? probability : 1 - probability)}
      </div>
      <div className="text-xs opacity-75 mt-1">
        Pago: {payout.toFixed(2)}x
      </div>
    </button>
  );
};

/**
 * Bet Slip (Order Form)
 */
const BetSlip: React.FC<BetSlipProps> = ({
  outcome,
  amount,
  shares,
  avgPrice,
  newProbability,
  onAmountChange,
  onConfirm,
  onCancel,
  loading,
  error,
}) => {
  const isYes = outcome === 'YES';
  const colorClass = isYes ? 'green' : 'red';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        p-4 rounded-xl border-2
        ${isYes
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
        }
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className={`font-bold text-${colorClass}-700 dark:text-${colorClass}-400`}>
          Apuesta {outcome}
        </h4>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cantidad (ETH)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={e => onAmountChange(parseFloat(e.target.value) || 0)}
            min={0.001}
            step={0.01}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            {[0.01, 0.1, 1].map(preset => (
              <button
                key={preset}
                onClick={() => onAmountChange(preset)}
                className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700
                  text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Order preview */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Shares</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {shares.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Precio promedio</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatProbability(avgPrice)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Nueva probabilidad</span>
          <span className={`font-medium ${getProbabilityColor(newProbability)}`}>
            {formatProbability(newProbability)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-500">Pago potencial</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {(shares * 1).toFixed(2)} ETH
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={loading || amount <= 0}
        className={`
          w-full py-3 rounded-xl font-medium text-white
          ${isYes
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
          }
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Confirmar Apuesta
          </>
        )}
      </button>
    </motion.div>
  );
};

/**
 * User Position Card
 */
const UserPositionCard: React.FC<{
  bets: ManifoldBet[];
  currentProbability: number;
  onSell?: (outcome: 'YES' | 'NO', shares: number) => void;
}> = ({ bets, currentProbability, onSell }) => {
  const positions = useMemo(() => {
    const yesShares = bets
      .filter(b => b.outcome === 'YES')
      .reduce((sum, b) => sum + b.shares, 0);
    const noShares = bets
      .filter(b => b.outcome === 'NO')
      .reduce((sum, b) => sum + b.shares, 0);
    const yesValue = yesShares * currentProbability;
    const noValue = noShares * (1 - currentProbability);
    const totalInvested = bets.reduce((sum, b) => sum + b.amount, 0);
    const totalValue = yesValue + noValue;
    const pnl = totalValue - totalInvested;

    return {
      yesShares,
      noShares,
      yesValue,
      noValue,
      totalInvested,
      totalValue,
      pnl,
      pnlPercentage: totalInvested > 0 ? (pnl / totalInvested) * 100 : 0,
    };
  }, [bets, currentProbability]);

  if (bets.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <BarChart2 className="w-4 h-4" />
        Tu Posición
      </h4>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {positions.yesShares > 0 && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="text-xs text-green-600 dark:text-green-400">Shares SÍ</div>
            <div className="font-bold text-green-700 dark:text-green-300">
              {positions.yesShares.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ {formatCurrency(positions.yesValue)}
            </div>
            {onSell && (
              <button
                onClick={() => onSell('YES', positions.yesShares)}
                className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium"
              >
                Vender
              </button>
            )}
          </div>
        )}

        {positions.noShares > 0 && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="text-xs text-red-600 dark:text-red-400">Shares NO</div>
            <div className="font-bold text-red-700 dark:text-red-300">
              {positions.noShares.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ {formatCurrency(positions.noValue)}
            </div>
            {onSell && (
              <button
                onClick={() => onSell('NO', positions.noShares)}
                className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Vender
              </button>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Invertido</span>
          <span className="text-gray-900 dark:text-white">
            {formatCurrency(positions.totalInvested)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Valor actual</span>
          <span className="text-gray-900 dark:text-white">
            {formatCurrency(positions.totalValue)}
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-gray-500">P&L</span>
          <span className={positions.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
            {positions.pnl >= 0 ? '+' : ''}{formatCurrency(positions.pnl)}
            ({positions.pnlPercentage >= 0 ? '+' : ''}{positions.pnlPercentage.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PredictionMarketView: React.FC<PredictionMarketViewProps> = ({
  competition,
  userBets = [],
  userBalance = 0,
  onPlaceBet,
  onSellShares,
  className = '',
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO' | null>(null);
  const [betAmount, setBetAmount] = useState(0.1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get market state
  const marketState = useMemo(() => {
    if (!competition.market?.pool) {
      return {
        probability: competition.market?.probability || 0.5,
        yesPool: 100,
        noPool: 100,
        k: 10000,
      };
    }

    return getCPMMState({
      YES: competition.market.pool.yesPool,
      NO: competition.market.pool.noPool
    });
  }, [competition.market]);

  // Calculate bet preview
  const betPreview = useMemo(() => {
    if (!selectedOutcome || betAmount <= 0) return null;

    const shares = calculateShares(
      betAmount,
      selectedOutcome,
      { YES: marketState.yesPool, NO: marketState.noPool },
      marketState.probability
    );

    const newProbability = calculateNewProbability(
      betAmount,
      selectedOutcome,
      { YES: marketState.yesPool, NO: marketState.noPool },
      marketState.probability
    );

    const avgPrice = betAmount / shares;

    return {
      shares,
      newProbability,
      avgPrice,
    };
  }, [selectedOutcome, betAmount, marketState]);

  // Handle bet placement
  const handlePlaceBet = useCallback(async () => {
    if (!selectedOutcome || !onPlaceBet || betAmount <= 0) return;

    setLoading(true);
    setError(null);

    try {
      await onPlaceBet(selectedOutcome, betAmount);
      setSelectedOutcome(null);
      setBetAmount(0.1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la apuesta');
    } finally {
      setLoading(false);
    }
  }, [selectedOutcome, betAmount, onPlaceBet]);

  // Calculate payouts
  const yesPayout = 1 / marketState.probability;
  const noPayout = 1 / (1 - marketState.probability);

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-2xl
      border border-gray-200 dark:border-gray-700
      overflow-hidden
      ${className}
    `}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Mercado de Predicción
          </h3>

          {competition.market?.manifoldId && (
            <a
              href={`https://manifold.markets/${competition.market.manifoldId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              Ver en Manifold
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="p-5 space-y-6">
        {/* Probability display */}
        <ProbabilityDisplay
          probability={marketState.probability}
          question={competition.title}
        />

        {/* Pool visualization */}
        <PoolVisualization
          pool={{
            yesPool: marketState.yesPool,
            noPool: marketState.noPool,
          }}
          totalLiquidity={marketState.yesPool + marketState.noPool}
        />

        {/* Bet buttons */}
        {!selectedOutcome && onPlaceBet && (
          <div className="flex gap-3">
            <BetButton
              outcome="YES"
              probability={marketState.probability}
              payout={yesPayout}
              onClick={() => setSelectedOutcome('YES')}
              disabled={competition.status !== 'active'}
            />
            <BetButton
              outcome="NO"
              probability={marketState.probability}
              payout={noPayout}
              onClick={() => setSelectedOutcome('NO')}
              disabled={competition.status !== 'active'}
            />
          </div>
        )}

        {/* Bet slip */}
        <AnimatePresence>
          {selectedOutcome && betPreview && (
            <BetSlip
              outcome={selectedOutcome}
              amount={betAmount}
              shares={betPreview.shares}
              avgPrice={betPreview.avgPrice}
              newProbability={betPreview.newProbability}
              onAmountChange={setBetAmount}
              onConfirm={handlePlaceBet}
              onCancel={() => setSelectedOutcome(null)}
              loading={loading}
              error={error || undefined}
            />
          )}
        </AnimatePresence>

        {/* User position */}
        <UserPositionCard
          bets={userBets}
          currentProbability={marketState.probability}
          onSell={onSellShares ? (outcome, shares) => onSellShares(outcome, shares) : undefined}
        />

        {/* Status message */}
        {competition.status !== 'active' && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20
            text-yellow-700 dark:text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {competition.status === 'resolving'
              ? 'Este mercado está en proceso de resolución.'
              : competition.status === 'completed'
                ? 'Este mercado ya ha sido resuelto.'
                : 'Este mercado no está activo.'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            CPMM: k = {marketState.k.toFixed(0)}
          </span>
          {userBalance > 0 && (
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              Balance: {formatCurrency(userBalance)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionMarketView;
