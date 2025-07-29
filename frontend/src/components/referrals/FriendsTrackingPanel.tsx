"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface ReferredFriend {
  id: string;
  joinDate: string;
  userIdentifier: string; // Últimos dígitos de wallet o email
  status: 'registered' | 'activated' | 'active';
  totalGifts: number;
  totalSpent: number;
  lastActivity: string;
  source?: string; // WhatsApp, Twitter, etc.
  earningsGenerated: number;
  giftHistory: {
    id: string;
    date: string;
    amount: number;
    tokenId?: string;
  }[];
}

interface FriendsTrackingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
}

export const FriendsTrackingPanel: React.FC<FriendsTrackingPanelProps> = ({
  isOpen,
  onClose,
  userAddress
}) => {
  const [friends, setFriends] = useState<ReferredFriend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'registered' | 'activated' | 'active'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'earnings' | 'activity'>('date');

  const loadFriendsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/friends-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          filter,
          sortBy
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, filter, sortBy]); // Dependencies: userAddress, filter, sortBy

  useEffect(() => {
    if (isOpen && userAddress) {
      loadFriendsData();
    }
  }, [isOpen, loadFriendsData]);

  // Real-time updates every 30 seconds
  useEffect(() => {
    if (isOpen && loadFriendsData) {
      const interval = setInterval(() => {
        loadFriendsData();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen, loadFriendsData]);

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
      case 'registered':
        return 'bg-yellow-100 text-yellow-800';
      case 'activated':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'registered':
        return 'Registrado';
      case 'activated':
        return 'Activado';
      case 'active':
        return 'Activo';
      default:
        return 'Desconocido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return '👤';
      case 'activated':
        return '🎁';
      case 'active':
        return '🌟';
      default:
        return '❓';
    }
  };

  const filteredFriends = friends.filter(friend => 
    filter === 'all' || friend.status === filter
  );

  const totalFriends = friends.length;
  const activatedFriends = friends.filter(f => f.status === 'activated' || f.status === 'active').length;
  const totalEarnings = friends.reduce((sum, f) => sum + f.earningsGenerated, 0);
  const conversionRate = totalFriends > 0 ? (activatedFriends / totalFriends) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">👥 Tracking de Usuarios Invitados</h2>
              <p className="text-purple-100 mt-1">Seguimiento en tiempo real de tus referidos</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadFriendsData}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-lg transition-all duration-200 group ${
                  isLoading 
                    ? 'opacity-75 cursor-not-allowed' 
                    : 'hover:bg-opacity-30'
                }`}
                title="Actualizar datos en tiempo real"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {totalFriends}
              </div>
              <div className="text-sm text-gray-600">Total Invitados</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {activatedFriends}
              </div>
              <div className="text-sm text-gray-600">Activados</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {conversionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Conversión</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${totalEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Generado</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos ({totalFriends})
              </button>
              <button
                onClick={() => setFilter('registered')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'registered' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Registrados
              </button>
              <button
                onClick={() => setFilter('activated')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'activated' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Activados
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'active' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Activos
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
                Fecha
              </button>
              <button
                onClick={() => setSortBy('earnings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'earnings' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ganancias
              </button>
              <button
                onClick={() => setSortBy('activity')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'activity' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Actividad
              </button>
            </div>

          </div>
        </div>

        {/* Friends List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos de referidos...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-600">No hay referidos para mostrar</p>
              <p className="text-sm text-gray-500 mt-2">
                Comparte tu link de referido para ver a tus amigos aquí
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {getStatusIcon(friend.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900">
                            {friend.userIdentifier}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(friend.status)}`}>
                            {getStatusText(friend.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>Registrado: {formatDate(friend.joinDate)}</div>
                          <div>Última actividad: {formatDate(friend.lastActivity)}</div>
                          {friend.source && (
                            <div>Fuente: {friend.source}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${friend.earningsGenerated.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {friend.totalGifts} regalos
                      </div>
                      <div className="text-sm text-gray-500">
                        ${friend.totalSpent.toFixed(2)} gastado
                      </div>
                    </div>
                  </div>
                  
                  {/* Gift History */}
                  {friend.giftHistory && friend.giftHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-600 mb-2">Historial de regalos:</div>
                      <div className="space-y-1">
                        {friend.giftHistory.slice(0, 3).map((gift) => (
                          <div key={gift.id} className="flex justify-between text-xs text-gray-500">
                            <span>{formatDate(gift.date)}</span>
                            <span>${gift.amount.toFixed(2)}</span>
                            {gift.tokenId && <span>NFT #{gift.tokenId}</span>}
                          </div>
                        ))}
                        {friend.giftHistory.length > 3 && (
                          <div className="text-xs text-blue-600 text-center">
                            +{friend.giftHistory.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-center text-sm text-gray-600">
            🔄 Actualización automática cada 30 segundos • 
            🔐 Datos anonimizados para proteger la privacidad
          </div>
        </div>
      </div>
    </div>
  );
};