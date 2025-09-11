"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface EarningRecord {
  id: string;
  date: string;
  amount: number;
  referredUser: string;
  referredUserDisplay: string;
  giftAmount: number;
  giftTokenId?: string;
  transactionHash?: string;
  status: 'completed' | 'pending';
}

interface EarningsHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
}

export const EarningsHistoryPanel: React.FC<EarningsHistoryPanelProps> = ({
  isOpen,
  onClose,
  userAddress
}) => {
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const loadEarningsHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/earnings-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          dateRange,
          sortBy
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEarnings(data.earnings || []);
      }
    } catch (error) {
      console.error('Error loading earnings history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, dateRange, sortBy]); // Dependencies: userAddress, dateRange, sortBy

  useEffect(() => {
    if (isOpen && userAddress) {
      loadEarningsHistory();
    }
  }, [isOpen, loadEarningsHistory]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'pending':
        return 'Pendiente';
      default:
        return 'Desconocido';
    }
  };

  const totalEarnings = earnings
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingEarnings = earnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);

  const averageEarning = earnings.length > 0 ? totalEarnings / earnings.length : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">💎 Historial de Ganancias</h2>
              <p className="text-blue-100 mt-1">Seguimiento detallado de todas tus comisiones</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${totalEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Ganado</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                ${pendingEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Pendiente</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ${averageEarning.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Promedio por Referido</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {earnings.length}
              </div>
              <div className="text-sm text-gray-600">Total Comisiones</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <span className="text-sm text-gray-600 self-center">Período:</span>
              <button
                onClick={() => setDateRange('7d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '7d' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setDateRange('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '30d' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 días
              </button>
              <button
                onClick={() => setDateRange('90d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '90d' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                90 días
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todo
              </button>
            </div>

            <div className="flex gap-2">
              <span className="text-sm text-gray-600 self-center">Ordenar:</span>
              <button
                onClick={() => setSortBy('date')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'date' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Fecha
              </button>
              <button
                onClick={() => setSortBy('amount')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'amount' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Monto
              </button>
            </div>
          </div>
        </div>

        {/* Earnings List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando historial de ganancias...</p>
            </div>
          ) : earnings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💎</div>
              <p className="text-gray-600">No hay ganancias para mostrar</p>
              <p className="text-sm text-gray-500 mt-2">
                Tus comisiones aparecerán aquí cuando tus referidos creen regalos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.map((earning) => (
                <div
                  key={earning.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">💰</div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Comisión por referido
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(earning.date)}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Referido: {earning.referredUserDisplay}
                        </div>
                        <div className="text-xs text-gray-500">
                          Regalo de ${earning.giftAmount.toFixed(2)} USDC
                          {earning.giftTokenId && ` • NFT #${earning.giftTokenId}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 text-lg">
                        +${earning.amount.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(earning.status)}`}>
                          {getStatusText(earning.status)}
                        </span>
                      </div>
                      {earning.transactionHash && (
                        <a
                          href={`https://basescan.org/tx/${earning.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1 block"
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

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-center text-sm text-gray-600">
            💡 Ganas el 20% de las ganancias generadas por tus referidos (hasta 30-40% según desempeño)
          </div>
        </div>
      </div>
    </div>
  );
};