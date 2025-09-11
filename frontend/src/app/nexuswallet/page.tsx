"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useActiveAccount } from 'thirdweb/react';

interface WalletAsset {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
  icon: string;
}

interface Transaction {
  id: string;
  type: 'received' | 'sent' | 'swap' | 'referral';
  amount: number;
  asset: string;
  timestamp: string;
  status: 'completed' | 'pending';
  from?: string;
  to?: string;
}

// Mock data - en producción vendría de la API
const mockAssets: WalletAsset[] = [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: 1247.50,
      value: 1247.50,
      change24h: 0.01,
      icon: '💵'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: 0.75,
      value: 1823.25,
      change24h: 2.45,
      icon: '⚡'
    },
    {
      symbol: 'CGW',
      name: 'CryptoGift Token',
      balance: 2500,
      value: 125.00,
      change24h: 15.8,
      icon: '🎁'
    }
];

const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'referral',
      amount: 25.50,
      asset: 'USDC',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'completed',
      from: 'Referral Commission'
    },
    {
      id: '2',
      type: 'swap',
      amount: 100,
      asset: 'USDC → ETH',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: 'completed'
    },
    {
      id: '3',
      type: 'received',
      amount: 50,
      asset: 'USDC',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      status: 'completed',
      from: 'Gift Claim'
    }
];

export default function NexusWalletPage() {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState('overview');
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [swapFrom, setSwapFrom] = useState('USDC');
  const [swapTo, setSwapTo] = useState('ETH');
  const [swapAmount, setSwapAmount] = useState('');

  useEffect(() => {
    setAssets(mockAssets);
    setTransactions(mockTransactions);
  }, []);

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalChange = assets.reduce((sum, asset) => sum + (asset.value * asset.change24h / 100), 0);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'received': return '📥';
      case 'sent': return '📤';
      case 'swap': return '🔄';
      case 'referral': return '🌟';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'received': return 'text-green-600';
      case 'sent': return 'text-red-600';
      case 'swap': return 'text-blue-600';
      case 'referral': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 
                     dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary 
                     flex items-center justify-center transition-all duration-500">
        <div className="text-center">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6
                        bg-gray-50 dark:bg-gray-800/50 
                        rounded-2xl shadow-lg border border-gray-200/30 dark:border-gray-700/30 
                        backdrop-blur-sm transition-all duration-300">
            <Image
              src="/NexusWallet-logo.png"
              alt="NexusWallet"
              width={88}
              height={88}
              className="object-contain drop-shadow-lg w-full h-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-4 transition-colors duration-300">Conecta tu Wallet</h1>
          <p className="text-text-secondary mb-8 transition-colors duration-300">
            Necesitas conectar tu wallet para acceder a NexusWallet Hub
          </p>
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-accent-gold dark:to-accent-silver 
                           text-white dark:text-bg-primary px-8 py-3 rounded-xl font-medium transition-all duration-300">
            🔗 Conectar Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 
                   dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-20 h-20 flex items-center justify-center 
                          bg-gray-50 dark:bg-gray-800/50 
                          rounded-2xl shadow-lg border border-gray-200/30 dark:border-gray-700/30 
                          backdrop-blur-sm transition-all duration-300">
              <Image
                src="/NexusWallet-logo.png"
                alt="NexusWallet"
                width={76}
                height={76}
                className="object-contain drop-shadow-lg w-full h-full"
              />
            </div>
            <h1 className="text-4xl font-bold text-text-primary transition-colors duration-300">
              NexusWallet Hub
            </h1>
          </div>
          <p className="text-xl text-text-secondary transition-colors duration-300">
            Tu centro financiero descentralizado con <span className="text-purple-600 dark:text-accent-gold font-bold transition-colors duration-300">exchange fee-free</span>
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 
                       dark:from-accent-gold dark:to-accent-silver rounded-2xl p-8 
                       text-white dark:text-bg-primary mb-8 transition-all duration-500">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-sm opacity-80">Valor Total del Portfolio</div>
              <div className="text-4xl font-bold">${totalValue.toLocaleString()}</div>
              <div className={`text-sm mt-2 ${totalChange >= 0 ? 'text-green-300 dark:text-green-400' : 'text-red-300 dark:text-red-400'} transition-colors duration-300`}>
                {totalChange >= 0 ? '↗️' : '↘️'} ${Math.abs(totalChange).toFixed(2)} (24h)
              </div>
            </div>
            
            <div>
              <div className="text-sm opacity-80">Ingresos por Referidos (Este Mes)</div>
              <div className="text-3xl font-bold">$456.75</div>
              <div className="text-sm text-green-300 dark:text-green-400 mt-2 transition-colors duration-300">↗️ +23% vs mes anterior</div>
            </div>
            
            <div>
              <div className="text-sm opacity-80">CryptoGift Tokens (CGW)</div>
              <div className="text-3xl font-bold">2,500 CGW</div>
              <div className="text-sm text-purple-200 dark:text-bg-secondary mt-2 transition-colors duration-300">🎁 Earned through platform usage</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', name: '📊 Overview', desc: 'Portfolio general' },
            { id: 'swap', name: '🔄 Fee-Free Swap', desc: 'Intercambio sin comisiones' },
            { id: 'earn', name: '💰 Earn', desc: 'Genera ingresos' },
            { id: 'send', name: '📤 Send', desc: 'Enviar fondos' },
            { id: 'history', name: '📜 History', desc: 'Historial completo' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500 dark:bg-accent-gold text-white dark:text-bg-primary shadow-lg'
                  : 'bg-bg-card text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              <div>{tab.name}</div>
              <div className="text-xs opacity-75">{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Assets */}
            <div className="lg:col-span-2">
              <div className="bg-bg-card rounded-2xl p-6 shadow-sm transition-colors duration-300">
                <h3 className="text-xl font-bold text-text-primary mb-6 transition-colors duration-300">💎 Tus Assets</h3>
                <div className="space-y-4">
                  {assets.map(asset => (
                    <div key={asset.symbol} className="flex items-center justify-between p-4 border border-border-primary 
                                                       rounded-xl hover:bg-bg-secondary transition-colors duration-300">
                      <div className="flex items-center">
                        <div className="text-2xl mr-4">{asset.icon}</div>
                        <div>
                          <div className="font-bold text-text-primary transition-colors duration-300">{asset.symbol}</div>
                          <div className="text-sm text-text-secondary transition-colors duration-300">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-text-primary transition-colors duration-300">{asset.balance.toLocaleString()}</div>
                        <div className="text-sm text-text-secondary transition-colors duration-300">${asset.value.toLocaleString()}</div>
                        <div className={`text-xs ${asset.change24h >= 0 ? 'text-green-600 dark:text-accent-gold' : 'text-red-600 dark:text-red-400'} transition-colors duration-300`}>
                          {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="bg-bg-card rounded-2xl p-6 shadow-sm transition-colors duration-300">
                <h3 className="text-xl font-bold text-text-primary mb-6 transition-colors duration-300">⚡ Acciones Rápidas</h3>
                <div className="space-y-4">
                  <button 
                    onClick={() => setActiveTab('swap')}
                    className="w-full p-4 bg-gradient-to-r from-blue-500 to-cyan-500 
                             dark:from-accent-gold dark:to-accent-silver text-white dark:text-bg-primary 
                             rounded-xl hover:opacity-90 transition-all duration-300"
                  >
                    <div className="font-bold">🔄 Fee-Free Swap</div>
                    <div className="text-sm opacity-90">Intercambio sin comisiones</div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('earn')}
                    className="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-500 
                             dark:from-accent-silver dark:to-accent-gold text-white dark:text-bg-primary 
                             rounded-xl hover:opacity-90 transition-all duration-300"
                  >
                    <div className="font-bold">💰 Stake & Earn</div>
                    <div className="text-sm opacity-90">Genera ingresos pasivos</div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('send')}
                    className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 
                             dark:from-accent-gold dark:to-accent-silver text-white dark:text-bg-primary 
                             rounded-xl hover:opacity-90 transition-all duration-300"
                  >
                    <div className="font-bold">📤 Send Instantly</div>
                    <div className="text-sm opacity-90">Transferencias gasless</div>
                  </button>
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-bg-card rounded-2xl p-6 shadow-sm mt-6 transition-colors duration-300">
                <h3 className="text-lg font-bold text-text-primary mb-4 transition-colors duration-300">🔐 Seguridad</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary transition-colors duration-300">Autenticación 2FA</span>
                    <span className="text-green-600 dark:text-accent-gold transition-colors duration-300">✅ Activa</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary transition-colors duration-300">Guardians Setup</span>
                    <span className="text-green-600 dark:text-accent-gold transition-colors duration-300">✅ 3/3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary transition-colors duration-300">Smart Contract Audit</span>
                    <span className="text-green-600 dark:text-accent-gold transition-colors duration-300">✅ OpenZeppelin</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'swap' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">🔄 Fee-Free Exchange</h3>
                <p className="text-gray-600">Intercambia tokens sin comisiones dentro del ecosistema CryptoGift</p>
                <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mt-4">
                  💚 0% Fees • Gasless • Instant
                </div>
              </div>

              <div className="space-y-6">
                {/* From */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">Desde</span>
                    <span className="text-sm text-gray-500">Balance: 1,247.50 USDC</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <select 
                      value={swapFrom} 
                      onChange={(e) => setSwapFrom(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <option value="USDC">💵 USDC</option>
                      <option value="ETH">⚡ ETH</option>
                      <option value="CGW">🎁 CGW</option>
                    </select>
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 text-2xl font-bold text-right border-0 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Swap Button */}
                <div className="text-center">
                  <button className="bg-purple-100 hover:bg-purple-200 text-purple-600 p-3 rounded-full transition-colors">
                    🔄
                  </button>
                </div>

                {/* To */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">Hacia</span>
                    <span className="text-sm text-gray-500">Balance: 0.75 ETH</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <select 
                      value={swapTo} 
                      onChange={(e) => setSwapTo(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <option value="ETH">⚡ ETH</option>
                      <option value="USDC">💵 USDC</option>
                      <option value="CGW">🎁 CGW</option>
                    </select>
                    <div className="flex-1 text-2xl font-bold text-right text-gray-400">
                      {swapAmount ? (parseFloat(swapAmount) * 0.00041).toFixed(6) : '0.00'}
                    </div>
                  </div>
                </div>

                {/* Swap Details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Precio</span>
                    <span>1 USDC = 0.00041 ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión de Red</span>
                    <span className="text-green-600">FREE 🎉</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión de Plataforma</span>
                    <span className="text-green-600">FREE 🎉</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total a Recibir</span>
                    <span>{swapAmount ? (parseFloat(swapAmount) * 0.00041).toFixed(6) : '0.00'} ETH</span>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity">
                  🚀 Swap Instantáneo
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'earn' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Stake CGW</h3>
              <p className="text-gray-600 mb-4">Haz stake de tus CGW tokens y gana recompensas</p>
              <div className="text-2xl font-bold text-green-600 mb-4">15% APY</div>
              <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-medium">
                Stake Ahora
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Referral Mining</h3>
              <p className="text-gray-600 mb-4">Gana tokens por cada referido activo</p>
              <div className="text-2xl font-bold text-purple-600 mb-4">50 CGW/día</div>
              <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium">
                Ver Detalles
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-4xl mb-4">🏦</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Liquidity Pool</h3>
              <p className="text-gray-600 mb-4">Provee liquidez y gana comisiones</p>
              <div className="text-2xl font-bold text-blue-600 mb-4">25% APY</div>
              <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-medium">
                Proveer Liquidez
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6">📜 Historial de Transacciones</h3>
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center">
                    <div className="text-2xl mr-4">{getTransactionIcon(tx.type)}</div>
                    <div>
                      <div className="font-medium text-gray-800">{tx.type.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(tx.timestamp).toLocaleDateString()} • {tx.from || 'Internal'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getTransactionColor(tx.type)}`}>
                      {tx.type === 'sent' ? '-' : '+'}{tx.amount} {tx.asset}
                    </div>
                    <div className="text-sm text-gray-500">{tx.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Stats */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 
                       dark:from-accent-gold dark:to-accent-silver rounded-2xl p-8 
                       text-white dark:text-bg-primary transition-all duration-500">
          <h3 className="text-2xl font-bold mb-6">🌐 Estadísticas de la Plataforma</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">$2.5M+</div>
              <div className="text-sm opacity-80">Volumen Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">15,000+</div>
              <div className="text-sm opacity-80">Usuarios Activos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">0%</div>
              <div className="text-sm opacity-80">Comisiones de Swap</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm opacity-80">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}