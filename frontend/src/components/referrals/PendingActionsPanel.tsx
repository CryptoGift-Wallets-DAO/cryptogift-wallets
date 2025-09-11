"use client";

import React, { useState, useEffect } from 'react';

interface PendingAction {
  id: string;
  type: 'follow_up' | 'reward_claim' | 'level_upgrade' | 'review_performance' | 'optimize_strategy';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  reward?: number;
  relatedUser?: string;
  actionUrl?: string;
  estimatedTime: number; // minutos
}

interface PendingActionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
}

// Mock data - en producción vendría de la API
const mockActions: PendingAction[] = [
    {
      id: '1',
      type: 'follow_up',
      title: 'Seguimiento a nuevos referidos',
      description: '3 usuarios se registraron hace más de 24h sin hacer su primera compra',
      priority: 'high',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reward: 15,
      relatedUser: '7A3E, B2F1, 9C4D',
      estimatedTime: 15
    },
    {
      id: '2',
      type: 'reward_claim',
      title: 'Reclamar bonus de nivel',
      description: 'Tienes $45 en bonos acumulados listos para retirar',
      priority: 'medium',
      reward: 45,
      estimatedTime: 5
    },
    {
      id: '3',
      type: 'level_upgrade',
      title: 'Oportunidad de upgrade',
      description: 'Solo necesitas 2 referidos más para alcanzar el nivel Elite',
      priority: 'medium',
      estimatedTime: 30
    },
    {
      id: '4',
      type: 'review_performance',
      title: 'Revisar métricas semanales',
      description: 'Analiza tu performance de esta semana y identifica oportunidades',
      priority: 'low',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedTime: 10
    },
    {
      id: '5',
      type: 'optimize_strategy',
      title: 'Optimizar horarios de invitación',
      description: 'Tus conversiones son 40% mejores los viernes por la noche',
      priority: 'medium',
      estimatedTime: 20
    }
];

export const PendingActionsPanel: React.FC<PendingActionsPanelProps> = ({
  isOpen,
  onClose,
  pendingCount
}) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [actions, setActions] = useState<PendingAction[]>([]);

  useEffect(() => {
    setActions(mockActions);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'follow_up': return '📞';
      case 'reward_claim': return '💰';
      case 'level_upgrade': return '⬆️';
      case 'review_performance': return '📊';
      case 'optimize_strategy': return '🎯';
      default: return '📋';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeUrgency = (deadline?: string) => {
    if (!deadline) return null;
    
    const now = new Date().getTime();
    const deadlineTime = new Date(deadline).getTime();
    const diffHours = Math.floor((deadlineTime - now) / (1000 * 60 * 60));
    
    if (diffHours < 24) return { text: `${diffHours}h restantes`, urgent: true };
    if (diffHours < 72) return { text: `${Math.floor(diffHours / 24)}d restantes`, urgent: false };
    return { text: `${Math.floor(diffHours / 24)}d restantes`, urgent: false };
  };

  const handleActionComplete = (actionId: string) => {
    setActions(prev => prev.filter(action => action.id !== actionId));
  };

  const filteredActions = actions.filter(action => {
    if (filter === 'all') return true;
    return action.priority === filter;
  });

  const totalRewards = actions.reduce((sum, action) => sum + (action.reward || 0), 0);
  const totalTime = actions.reduce((sum, action) => sum + action.estimatedTime, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">⏳ Acciones Pendientes</h2>
              <p className="text-gray-600">
                {pendingCount} tareas pendientes • Recompensas potenciales: <span className="font-bold text-green-600">${totalRewards}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 rounded-lg text-white">
              <div className="text-2xl font-bold">
                {actions.filter(a => a.priority === 'high').length}
              </div>
              <div className="text-sm opacity-90">Alta Prioridad</div>
              <div className="text-xs mt-1">🚨 Requiere atención inmediata</div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-lg text-white">
              <div className="text-2xl font-bold">
                {actions.filter(a => a.priority === 'medium').length}
              </div>
              <div className="text-sm opacity-90">Prioridad Media</div>
              <div className="text-xs mt-1">⚡ Importante para crecimiento</div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-lg text-white">
              <div className="text-2xl font-bold">${totalRewards}</div>
              <div className="text-sm opacity-90">Recompensas Totales</div>
              <div className="text-xs mt-1">💰 Al completar todas</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 rounded-lg text-white">
              <div className="text-2xl font-bold">{totalTime}m</div>
              <div className="text-sm opacity-90">Tiempo Estimado</div>
              <div className="text-xs mt-1">⏱️ Para completar todo</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">🔴 Alta prioridad</option>
              <option value="medium">🟡 Prioridad media</option>
              <option value="low">🟢 Prioridad baja</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="priority">Por prioridad</option>
              <option value="reward">Por recompensa</option>
              <option value="deadline">Por fecha límite</option>
              <option value="time">Por tiempo requerido</option>
            </select>

            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              ✅ Marcar Todo Completado
            </button>
          </div>

          {/* Actions List */}
          <div className="space-y-4">
            {filteredActions.map((action) => {
              const urgency = getTimeUrgency(action.deadline);
              
              return (
                <div
                  key={action.id}
                  className={`p-6 rounded-lg border-2 ${getPriorityColor(action.priority)} hover:shadow-lg transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-3xl">{getTypeIcon(action.type)}</div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{action.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(action.priority)}`}>
                            {action.priority.toUpperCase()}
                          </span>
                          {action.reward && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              +${action.reward}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-3">{action.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>⏱️ {action.estimatedTime} min</span>
                          {action.relatedUser && (
                            <span>👥 Usuarios: {action.relatedUser}</span>
                          )}
                          {urgency && (
                            <span className={urgency.urgent ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              ⏰ {urgency.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleActionComplete(action.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        ✅ Completar
                      </button>
                      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                        👀 Ver Detalles
                      </button>
                      <button className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                        ⏭️ Posponer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🚀 Acciones Rápidas</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <button className="p-4 bg-white rounded-lg border hover:shadow-md transition-all text-left">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium">Enviar mensajes de seguimiento</div>
                <div className="text-sm text-gray-600">A usuarios sin conversión</div>
              </button>
              
              <button className="p-4 bg-white rounded-lg border hover:shadow-md transition-all text-left">
                <div className="text-2xl mb-2">🎁</div>
                <div className="font-medium">Crear regalo promocional</div>
                <div className="text-sm text-gray-600">Para incentivar nuevos referidos</div>
              </button>
              
              <button className="p-4 bg-white rounded-lg border hover:shadow-md transition-all text-left">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">Generar reporte semanal</div>
                <div className="text-sm text-gray-600">Análisis completo de performance</div>
              </button>
            </div>
          </div>

          {/* Daily Goal Progress */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-gray-800 mb-3">🎯 Progreso del Día</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tareas completadas</span>
                  <span>3/8</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '37.5%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Recompensas obtenidas</span>
                  <span>$23/$68</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '33.8%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};