"use client";

import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BalanceAnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  totalBalance: string;
}

export const BalanceAnalyticsPanel: React.FC<BalanceAnalyticsPanelProps> = ({
  isOpen,
  onClose,
  totalBalance
}) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState({
    dailyEarnings: [],
    commissionBreakdown: [],
    projectedIncome: 0,
    conversionRate: 0,
    topPerformingReferrals: []
  });

  // Mock data - en producción vendría de la API
  const earningsData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Comisiones Ganadas (USDC)',
        data: [120, 190, 300, 500, 200, 300],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }
    ]
  };

  const commissionBreakdown = {
    labels: ['Referidos Directos', 'Nivel 2', 'Nivel 3', 'Bonos'],
    datasets: [
      {
        label: 'Distribución de Comisiones',
        data: [65, 25, 8, 2],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ]
      }
    ]
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">💰 Análisis de Balance</h2>
              <p className="text-gray-600">Balance Total: <span className="font-bold text-green-600">{totalBalance} USDC</span></p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="mb-6">
            <div className="flex gap-2">
              {['7d', '30d', '90d', '1y'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    timeRange === range 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs Row */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-lg text-white">
              <div className="text-2xl font-bold">$1,247</div>
              <div className="text-sm opacity-90">Ingresos este mes</div>
              <div className="text-xs mt-2 flex items-center">
                <span className="mr-1">↗️</span> +23% vs mes anterior
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-lg text-white">
              <div className="text-2xl font-bold">68%</div>
              <div className="text-sm opacity-90">Tasa de Conversión</div>
              <div className="text-xs mt-2 flex items-center">
                <span className="mr-1">📈</span> Arriba del promedio
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg text-white">
              <div className="text-2xl font-bold">$2,850</div>
              <div className="text-sm opacity-90">Proyección mensual</div>
              <div className="text-xs mt-2 flex items-center">
                <span className="mr-1">🎯</span> Al ritmo actual
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-lg text-white">
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm opacity-90">Niveles Activos</div>
              <div className="text-xs mt-2 flex items-center">
                <span className="mr-1">🌟</span> Elite Status
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">📈 Evolución de Ingresos</h3>
              <Line data={earningsData} options={{ responsive: true }} />
            </div>
            
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🥧 Distribución por Niveles</h3>
              <Bar data={commissionBreakdown} options={{ responsive: true }} />
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🚀 Optimización de Rendimiento</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm">Mejor día de la semana</span>
                  <span className="font-bold text-green-600">Viernes</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm">Hora pico de conversión</span>
                  <span className="font-bold text-blue-600">8-10 PM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="text-sm">Promedio por referido</span>
                  <span className="font-bold text-purple-600">$45.30</span>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">⚡ Acciones Recomendadas</h3>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="text-sm font-medium">Incrementar actividad</div>
                  <div className="text-xs text-gray-600">Invita 3 amigos más para desbloquear el siguiente nivel</div>
                </div>
                <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                  <div className="text-sm font-medium">Oportunidad detectada</div>
                  <div className="text-xs text-gray-600">Tus referidos son 2x más activos los viernes</div>
                </div>
                <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <div className="text-sm font-medium">Milestone próximo</div>
                  <div className="text-xs text-gray-600">Faltan $753 para nivel Premium</div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🏆 Logros Recientes</h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gold-50 rounded">
                  <span className="text-2xl mr-3">🥇</span>
                  <div>
                    <div className="text-sm font-medium">Top Performer</div>
                    <div className="text-xs text-gray-600">Top 10% este mes</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-silver-50 rounded">
                  <span className="text-2xl mr-3">🚀</span>
                  <div>
                    <div className="text-sm font-medium">Crecimiento Sostenido</div>
                    <div className="text-xs text-gray-600">6 meses consecutivos</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-bronze-50 rounded">
                  <span className="text-2xl mr-3">💎</span>
                  <div>
                    <div className="text-sm font-medium">Red Sólida</div>
                    <div className="text-xs text-gray-600">+50 referidos activos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              💳 Retirar Fondos
            </button>
            <button className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              📊 Exportar Reporte
            </button>
            <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              🎯 Optimizar Estrategia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};