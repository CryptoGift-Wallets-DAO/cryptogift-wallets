"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface BalanceTransaction {
  id: string;
  date: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  description: string;
  referredUser?: string;
  transactionHash?: string;
}

interface BalanceHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
}

export const BalanceHistoryPanel: React.FC<BalanceHistoryPanelProps> = ({
  isOpen,
  onClose,
  userAddress
}) => {
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'earning' | 'withdrawal'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const loadTransactionHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/balance-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          dateRange,
          filter
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading balance history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, dateRange]); // Dependencies: userAddress and dateRange

  useEffect(() => {
    if (isOpen && userAddress) {
      loadTransactionHistory();
    }
  }, [isOpen, loadTransactionHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return '💰';
      case 'withdrawal':
        return '💸';
      default:
        return '📊';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earning':
        return 'text-green-600';
      case 'withdrawal':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.type === filter
  );

  const totalEarnings = transactions
    .filter(tx => tx.type === 'earning')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalWithdrawals = transactions
    .filter(tx => tx.type === 'withdrawal')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">💰 Historial de Balance</h2>
              <p className="text-green-100 mt-1">Seguimiento completo de ingresos y retiros</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ${totalEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Ingresos</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                ${totalWithdrawals.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Retiros</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${(totalEarnings - totalWithdrawals).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Balance Neto</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('earning')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'earning' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilter('withdrawal')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'withdrawal' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Retiros
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDateRange('7d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '7d' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setDateRange('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '30d' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 días
              </button>
              <button
                onClick={() => setDateRange('90d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '90d' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                90 días
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === 'all' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todo
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600">No hay transacciones para mostrar</p>
              <p className="text-sm text-gray-500 mt-2">
                Las transacciones aparecerán aquí una vez que tengas actividad
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(transaction.date)}
                        </div>
                        {transaction.referredUser && (
                          <div className="text-xs text-blue-600 mt-1">
                            Referido: ...{transaction.referredUser.slice(-6)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'withdrawal' ? '-' : '+'}
                        ${transaction.amount.toFixed(2)}
                      </div>
                      {transaction.transactionHash && (
                        <a
                          href={`https://basescan.org/tx/${transaction.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Ver TX
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};