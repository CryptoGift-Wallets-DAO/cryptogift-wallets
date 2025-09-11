"use client";

import React, { useState, useEffect } from 'react';

interface ReferralUser {
  id: string;
  walletSuffix: string; // Últimos 4 dígitos
  joinedAt: string;
  status: 'joined' | 'first_gift' | 'active' | 'power_user';
  totalSpent: number;
  giftsCreated: number;
  lastActivity: string;
  level: number;
  country: string;
  conversionTime?: number; // minutos hasta primera compra
}

interface ReferralsTrackingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  totalReferrals: number;
}

// Mock data - en producción vendría de WebSocket o API polling
const mockReferrals: ReferralUser[] = [
    {
      id: '1',
      walletSuffix: '7A3E',
      joinedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
      status: 'first_gift',
      totalSpent: 25,
      giftsCreated: 1,
      lastActivity: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      level: 1,
      country: 'MX',
      conversionTime: 3
    },
    {
      id: '2',
      walletSuffix: 'B2F1',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas ago
      status: 'active',
      totalSpent: 150,
      giftsCreated: 6,
      lastActivity: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      level: 2,
      country: 'CO',
      conversionTime: 45
    },
    {
      id: '3',
      walletSuffix: '9C4D',
      joinedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      status: 'joined',
      totalSpent: 0,
      giftsCreated: 0,
      lastActivity: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      level: 0,
      country: 'AR',
    },
];

export const ReferralsTrackingPanel: React.FC<ReferralsTrackingPanelProps> = ({
  isOpen,
  onClose,
  totalReferrals
}) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joinedAt');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);

  useEffect(() => {
    setReferrals(mockReferrals);
  }, []);

  // Simular actualizaciones en tiempo real
  useEffect(() => {
    if (!realTimeEnabled) return;
    
    const interval = setInterval(() => {
      // Simular nuevos referidos o actualizaciones
      const randomUpdate = Math.random();
      if (randomUpdate > 0.8) {
        // Nuevo referido
        const newReferral: ReferralUser = {
          id: Date.now().toString(),
          walletSuffix: Math.random().toString(16).slice(-4).toUpperCase(),
          joinedAt: new Date().toISOString(),
          status: 'joined',
          totalSpent: 0,
          giftsCreated: 0,
          lastActivity: new Date().toISOString(),
          level: 0,
          country: ['MX', 'CO', 'AR', 'PE', 'CL'][Math.floor(Math.random() * 5)]
        };
        setReferrals(prev => [newReferral, ...prev]);
      }
    }, 10000); // Cada 10 segundos

    return () => clearInterval(interval);
  }, [realTimeEnabled]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'joined': return '👋';
      case 'first_gift': return '🎁';
      case 'active': return '⚡';
      case 'power_user': return '💎';
      default: return '👤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'joined': return 'bg-gray-100 text-gray-700';
      case 'first_gift': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'power_user': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const filteredReferrals = referrals.filter(referral => {
    if (filter === 'all') return true;
    return referral.status === filter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">🌟 Red de Referidos - Tracking Live</h2>
              <p className="text-gray-600">
                Total: <span className="font-bold text-blue-600">{totalReferrals} referidos</span> 
                {realTimeEnabled && <span className="ml-2 text-green-500 animate-pulse">● LIVE</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid md:grid-cols-6 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredReferrals.filter(r => r.status === 'power_user').length}
              </div>
              <div className="text-xs text-green-700">Power Users</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredReferrals.filter(r => r.status === 'active').length}
              </div>
              <div className="text-xs text-blue-700">Activos</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredReferrals.filter(r => r.status === 'first_gift').length}
              </div>
              <div className="text-xs text-yellow-700">Convertidos</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">
                {filteredReferrals.filter(r => r.status === 'joined').length}
              </div>
              <div className="text-xs text-gray-700">Nuevos</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(filteredReferrals.filter(r => r.totalSpent > 0).length / filteredReferrals.length * 100)}%
              </div>
              <div className="text-xs text-purple-700">Conversión</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                ${filteredReferrals.reduce((sum, r) => sum + r.totalSpent, 0)}
              </div>
              <div className="text-xs text-red-700">Volumen Total</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={realTimeEnabled}
                  onChange={(e) => setRealTimeEnabled(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">🔴 Live Tracking</span>
              </label>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="all">Todos los referidos</option>
              <option value="joined">🟡 Solo registrados</option>
              <option value="first_gift">🔵 Primera compra</option>
              <option value="active">🟢 Activos</option>
              <option value="power_user">🟣 Power Users</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="joinedAt">Más recientes</option>
              <option value="totalSpent">Mayor gasto</option>
              <option value="giftsCreated">Más activos</option>
            </select>
          </div>

          {/* Referrals Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actividad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {referral.walletSuffix.slice(-2)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              ***{referral.walletSuffix}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              🌎 {referral.country} • Nivel {referral.level}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                          {getStatusIcon(referral.status)} {referral.status.replace('_', ' ')}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          💰 ${referral.totalSpent}
                        </div>
                        <div className="text-xs text-gray-500">
                          🎁 {referral.giftsCreated} regalos
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(referral.totalSpent / 100 * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {referral.conversionTime ? `${referral.conversionTime}m` : '-'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          Se unió hace {getTimeAgo(referral.joinedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Activo hace {getTimeAgo(referral.lastActivity)}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800 text-xs">
                            📊 Ver
                          </button>
                          <button className="text-green-600 hover:text-green-800 text-xs">
                            💬 Contactar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Activity Feed */}
          <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-3">📡 Feed de Actividad en Tiempo Real</h3>
            <div className="text-sm space-y-1 max-h-32 overflow-y-auto font-mono">
              <div className="text-yellow-400">[{new Date().toLocaleTimeString()}] 👋 Nuevo usuario ***7A3E se registró desde MX</div>
              <div className="text-green-400">[{new Date(Date.now() - 60000).toLocaleTimeString()}] 🎁 Usuario ***B2F1 creó su primer regalo ($25)</div>
              <div className="text-blue-400">[{new Date(Date.now() - 120000).toLocaleTimeString()}] ⚡ Usuario ***9C4D subió a nivel 2</div>
              <div className="text-purple-400">[{new Date(Date.now() - 180000).toLocaleTimeString()}] 💎 Usuario ***F5A2 alcanzó Power User status</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              📤 Invitar Más Amigos
            </button>
            <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              📊 Exportar Data
            </button>
            <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              🎯 Estrategias Personalizadas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};