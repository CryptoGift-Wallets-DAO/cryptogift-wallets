"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface PendingReward {
  id: string;
  date: string;
  amount: number;
  referredUser: string;
  referredUserDisplay: string;
  giftAmount: number;
  giftTokenId?: string;
  estimatedCompletionDate: string;
  reason: string;
  dayCategory: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'older';
}

interface PendingRewardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
}

export const PendingRewardsPanel: React.FC<PendingRewardsPanelProps> = ({
  isOpen,
  onClose,
  userAddress
}) => {
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const loadPendingRewards = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/pending-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          dateFilter,
          sortBy
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRewards(data.pendingRewards || []);
      }
    } catch (error) {
      console.error('Error loading pending rewards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, dateFilter, sortBy]); // Dependencies: userAddress, dateFilter, sortBy

  useEffect(() => {
    if (isOpen && userAddress) {
      loadPendingRewards();
    }
  }, [isOpen, loadPendingRewards]);

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

  const getDayCategory = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else if (date >= startOfWeek) {
      return 'Esta semana';
    } else if (date >= startOfMonth) {
      return 'Este mes';
    } else {
      return 'Anterior';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Hoy':
        return 'text-green-600 bg-green-50';
      case 'Ayer':
        return 'text-blue-600 bg-blue-50';
      case 'Esta semana':
        return 'text-purple-600 bg-purple-50';
      case 'Este mes':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'blockchain_confirmation':
        return '🔗';
      case 'payment_processing':
        return '💳';
      case 'fraud_review':
        return '🛡️';
      case 'manual_review':
        return '👀';
      default:
        return '⏳';
    }
  };

  const groupedRewards = pendingRewards.reduce((groups: Record<string, PendingReward[]>, reward) => {
    const category = getDayCategory(reward.date);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(reward);
    return groups;
  }, {});

  const totalPending = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);
  const todayCount = pendingRewards.filter(r => getDayCategory(r.date) === 'Hoy').length;
  const yesterdayCount = pendingRewards.filter(r => getDayCategory(r.date) === 'Ayer').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">⏳ Recompensas Pendientes</h2>
              <p className="text-yellow-100 mt-1">Seguimiento detallado de tus comisiones en proceso</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadPendingRewards}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-lg transition-all duration-200 group ${
                  isLoading 
                    ? 'opacity-75 cursor-not-allowed' 
                    : 'hover:bg-opacity-30'
                }`}
                title="Actualizar recompensas pendientes"
              >
                <div className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : 'group-hover:animate-spin'}`}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4V2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.09 0 9.29-3.83 9.88-8.72-.01-.08-.01-.16-.01-.24 0-.55-.45-1-1-1s-1 .45-1 1c0 .06 0 .12.01.18C19.42 17.94 16.01 20 12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8z"/>
                    <path d="M12 4l2 2-2 2"/>
                  </svg>
                </div>
                <span className="text-sm">{isLoading ? 'Cargando...' : 'Actualizar'}</span>
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                ${totalPending.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Pendiente</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {todayCount}
              </div>
              <div className="text-sm text-gray-600">Hoy</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {yesterdayCount}
              </div>
              <div className="text-sm text-gray-600">Ayer</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'all' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'today' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'yesterday' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ayer
              </button>
              <button
                onClick={() => setDateFilter('this_week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'this_week' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Esta semana
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('date')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'date' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Por fecha
              </button>
              <button
                onClick={() => setSortBy('amount')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'amount' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Por monto
              </button>
            </div>
          </div>
        </div>

        {/* Pending Rewards List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando recompensas pendientes...</p>
            </div>
          ) : Object.keys(groupedRewards).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-gray-600">¡No tienes recompensas pendientes!</p>
              <p className="text-sm text-gray-500 mt-2">
                Todas tus comisiones están completadas
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRewards).map(([category, rewards]) => (
                <div key={category}>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${getCategoryColor(category)}`}>
                    {category} ({rewards.length})
                  </div>
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {getReasonIcon(reward.reason)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Comisión pendiente
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(reward.date)}
                              </div>
                              <div className="text-xs text-blue-600 mt-1">
                                Referido: {reward.referredUserDisplay}
                              </div>
                              <div className="text-xs text-gray-500">
                                Regalo: ${reward.giftAmount.toFixed(2)}
                                {reward.giftTokenId && ` • NFT #${reward.giftTokenId}`}
                              </div>
                              <div className="text-xs text-orange-600 mt-1">
                                Estimado: {formatDate(reward.estimatedCompletionDate)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-yellow-600 text-lg">
                              ${reward.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {reward.reason === 'blockchain_confirmation' && 'Confirmación blockchain'}
                              {reward.reason === 'payment_processing' && 'Procesando pago'}
                              {reward.reason === 'fraud_review' && 'Revisión de seguridad'}
                              {reward.reason === 'manual_review' && 'Revisión manual'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-center text-sm text-gray-600">
            ⏱️ Las recompensas se procesan automáticamente cada 24 horas
          </div>
        </div>
      </div>
    </div>
  );
};