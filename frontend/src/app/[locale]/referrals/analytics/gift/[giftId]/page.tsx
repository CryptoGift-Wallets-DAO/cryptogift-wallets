'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Gift, User, Clock, CheckCircle, Mail, Award, TrendingUp, Calendar, Hash, Wallet, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ThemeCard } from '../../../../../../components/ui/ThemeSystem';

// Helper function to generate CSV from gift data
function generateCSV(gift: CompleteGiftProfile): string {
  const rows = [];
  rows.push(['Field', 'Value']);
  rows.push(['Gift ID', gift.giftId]);
  rows.push(['Token ID', gift.tokenId]);
  rows.push(['Campaign ID', gift.campaignId || '']);
  rows.push(['Status', gift.status.current]);
  rows.push(['Creator Address', gift.creator.address]);
  rows.push(['Created At', gift.creator.createdAt]);

  if (gift.claim?.claimerWallet) {
    rows.push(['Claimer Wallet', gift.claim.claimerWallet]);
    rows.push(['Claimed At', gift.claim.claimedAt || '']);
  }

  if (gift.education) {
    rows.push(['Education Module', gift.education.moduleName || '']);
    rows.push(['Education Score', String(gift.education.score || 0)]);
    rows.push(['Education Passed', gift.education.passed ? 'Yes' : 'No']);
    rows.push(['Education Email', gift.education.email || '']);

    if (gift.education.questions) {
      rows.push(['Total Questions', String(gift.education.questions.length)]);
      rows.push(['Correct Answers', String(gift.education.questions.filter(q => q.isCorrect).length)]);
    }
  }

  rows.push(['Total Views', String(gift.analytics.totalViews)]);
  rows.push(['Unique Viewers', String(gift.analytics.uniqueViewers)]);
  rows.push(['Conversion Rate', gift.analytics.conversionRate.toFixed(2) + '%']);

  if (gift.value.amount) {
    rows.push(['Value USD', '$' + gift.value.amount.toFixed(2)]);
  }

  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

interface CompleteGiftProfile {
  // Core Identity
  giftId: string;
  tokenId: string;
  campaignId?: string;

  // Creation Info
  creator: {
    address: string;
    referrer?: string;
    createdAt: string;
    blockNumber?: string;
    txHash?: string;
    gasUsed?: string;
  };

  // Current Status
  status: {
    current: string;
    isInEscrow: boolean;
    isExpired: boolean;
    expiresAt?: string;
  };

  // CRITICAL FIX: Add direct claimer field for backward compatibility
  claimer?: string; // Wallet address of claimer (fallback when claim object not present)
  claimedAt?: string; // Timestamp when claimed (fallback)

  // Appointment Information (Calendly)
  appointment?: {
    scheduled: boolean;
    eventDate?: string;
    eventTime?: string;
    duration?: number;
    timezone?: string;
    meetingUrl?: string;
    inviteeName?: string;
    inviteeEmail?: string;
    createdAt?: string;
  };

  // Viewing History
  viewingHistory: Array<{
    timestamp: string;
    viewerAddress?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }>;

  // Education Tracking
  education?: {
    required: boolean;
    moduleId?: string;
    moduleName?: string;

    // Email tracking (hashed)
    email?: string;
    emailHash?: string;

    // Progress
    started: boolean;
    startedAt?: string;
    completed: boolean;
    completedAt?: string;

    // Results
    score?: number;
    passed?: boolean;
    totalTimeSpent?: number; // seconds

    // Question-by-question breakdown
    questions?: Array<{
      questionId: string;
      questionText: string;
      selectedAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      timeSpent: number; // seconds
      attemptNumber: number;
      timestamp: string;
    }>;

    // Additional metrics
    videoWatched?: boolean;
    videoWatchTime?: number;
    resourcesViewed?: string[];
  };

  // Claim Information
  claim?: {
    claimed: boolean;
    claimedAt?: string;
    claimerAddress?: string;
    claimerWallet?: string; // Full wallet address
    blockNumber?: string;
    txHash?: string;
    gasUsed?: string;

    // Password validation
    passwordAttempts?: number;
    passwordValidatedAt?: string;
  };

  // Value & Rewards
  value: {
    amount?: number;
    currency?: string;
    usdValue?: number;
    tokenAmount?: string;
    tokenSymbol?: string;
  };

  // Metadata
  metadata: {
    imageUrl?: string;
    imageCid?: string;
    description?: string;
    hasPassword: boolean;
    tbaAddress?: string; // Token Bound Account
    escrowAddress?: string;
  };

  // Complete Event History
  events: Array<{
    eventId: string;
    type: string;
    timestamp: string;
    txHash?: string;
    details?: any;
  }>;

  // Analytics Summary
  analytics: {
    totalViews: number;
    uniqueViewers: number;
    conversionRate: number;
    timeToClaimMinutes?: number;
    educationCompletionRate?: number;
    avgEducationScore?: number;
  };
}

export default function GiftDetailsPage() {
  const params = useParams();
  const giftId = params?.giftId as string;
  const [gift, setGift] = useState<CompleteGiftProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'education' | 'events' | 'technical'>('timeline');

  useEffect(() => {
    if (giftId) {
      fetchGiftDetails();
    }
  }, [giftId]);

  async function fetchGiftDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/gift-profile/${giftId}`);
      if (!response.ok) throw new Error('Failed to fetch gift details');

      const data = await response.json();

      // DEBUG: Log what API actually sends
      console.log('🔍 API RESPONSE DATA:', {
        fullResponse: data,
        profile: data.profile,
        claimer: data.profile?.claimer,
        claimObject: data.profile?.claim,
        education: data.profile?.education,
        appointment: data.profile?.appointment
      });

      setGift(data.profile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ThemeCard variant="warning" className="p-6">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p>{error || 'Gift not found'}</p>
        </ThemeCard>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: 'text-blue-600 dark:text-blue-400',
      viewed: 'text-yellow-600 dark:text-yellow-400',
      preClaimStarted: 'text-orange-600 dark:text-orange-400',
      educationCompleted: 'text-purple-600 dark:text-purple-400',
      claimed: 'text-green-600 dark:text-green-400',
      expired: 'text-red-600 dark:text-red-400',
      returned: 'text-gray-600 dark:text-gray-400'
    };
    return colors[status] || 'text-gray-600 dark:text-gray-400';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      created: 'Creado',
      viewed: 'Visto',
      preClaimStarted: 'Claim Iniciado',
      educationCompleted: 'Educación Completada',
      claimed: 'Reclamado',
      expired: 'Expirado',
      returned: 'Devuelto'
    };
    return labels[status] || status;
  };

  const formatAddress = (address?: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatFullAddress = (address?: string) => {
    if (!address) return 'Unknown';
    return address;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/referrals/analytics" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-7 h-7" />
            Perfil Completo del Regalo #{gift.tokenId}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gift ID: {gift.giftId} | Campaign: {gift.campaignId || 'default'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(gift.status.current)} bg-opacity-10 bg-current`}>
          {getStatusLabel(gift.status.current)}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'timeline'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Clock className="inline w-4 h-4 mr-2" />
          Timeline Completo
        </button>
        <button
          onClick={() => setActiveTab('education')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'education'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Award className="inline w-4 h-4 mr-2" />
          Educación & Scores
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'events'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Hash className="inline w-4 h-4 mr-2" />
          Historial de Eventos
        </button>
        <button
          onClick={() => setActiveTab('technical')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'technical'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <FileText className="inline w-4 h-4 mr-2" />
          Datos Técnicos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <ThemeCard variant="default" className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline Completo del Regalo
              </h2>

              <div className="relative pl-8">
                <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>

                {/* Created */}
                <div className="relative mb-6">
                  <div className="absolute -left-8 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-blue-100 dark:ring-blue-900"></div>
                  <div className="text-sm font-medium">🎁 Regalo Creado</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    📅 {new Date(gift.creator.createdAt).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    <br />
                    🕰️ {new Date(gift.creator.createdAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <div>Creador: <span className="font-mono">{formatFullAddress(gift.creator.address)}</span></div>
                    {gift.creator.referrer && (
                      <div>Referido por: <span className="font-mono">{formatAddress(gift.creator.referrer)}</span></div>
                    )}
                    {gift.creator.blockNumber && (
                      <div>Block: #{gift.creator.blockNumber}</div>
                    )}
                    {gift.creator.txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${gift.creator.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        TX: {formatAddress(gift.creator.txHash)}
                      </a>
                    )}
                  </div>
                </div>

                {/* Viewing History */}
                {gift.viewingHistory && gift.viewingHistory.length > 0 && (
                  <div className="relative mb-6">
                    <div className="absolute -left-8 w-4 h-4 bg-yellow-500 rounded-full ring-4 ring-yellow-100 dark:ring-yellow-900"></div>
                    <div className="text-sm font-medium">👁️ Historial de Vistas</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-2">
                      {gift.viewingHistory.map((view, idx) => (
                        <div key={idx} className="pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                          <div className="font-medium text-gray-600 dark:text-gray-400">
                            📅 {new Date(view.timestamp).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                            {' '}
                            🕰️ {new Date(view.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                          {view.viewerAddress && (
                            <div>Viewer: <span className="font-mono">{formatAddress(view.viewerAddress)}</span></div>
                          )}
                          {view.referrer && (
                            <div>Referrer: {view.referrer}</div>
                          )}
                        </div>
                      ))}
                      <div className="font-medium mt-1">
                        Total: {gift.analytics.totalViews} vistas, {gift.analytics.uniqueViewers} únicos
                      </div>
                    </div>
                  </div>
                )}

                {/* Education Started */}
                {gift.education?.startedAt && (
                  <div className="relative mb-6">
                    <div className="absolute -left-8 w-4 h-4 bg-orange-500 rounded-full ring-4 ring-orange-100 dark:ring-orange-900"></div>
                    <div className="text-sm font-medium">📚 Educación Iniciada</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      📅 {new Date(gift.education.startedAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <br />
                      🕰️ {new Date(gift.education.startedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Módulo: {gift.education.moduleName || 'Sales Masterclass'}
                    </div>
                  </div>
                )}

                {/* Education Completed */}
                {gift.education?.completedAt && (
                  <div className="relative mb-6">
                    <div className="absolute -left-8 w-4 h-4 bg-purple-500 rounded-full ring-4 ring-purple-100 dark:ring-purple-900"></div>
                    <div className="text-sm font-medium">🎓 Educación Completada</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      📅 {new Date(gift.education.completedAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <br />
                      🕰️ {new Date(gift.education.completedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div>Score Final: {gift.education.score}% {gift.education.passed ? '✅ Aprobado' : '❌ Reprobado'}</div>
                      <div>Tiempo Total: {Math.floor((gift.education.totalTimeSpent || 0) / 60)} minutos</div>
                    </div>
                  </div>
                )}

                {/* Claimed */}
                {gift.claim?.claimedAt && (
                  <div className="relative mb-6">
                    <div className="absolute -left-8 w-4 h-4 bg-green-500 rounded-full ring-4 ring-green-100 dark:ring-green-900"></div>
                    <div className="text-sm font-medium">🏆 Regalo Reclamado</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      📅 {new Date(gift.claim.claimedAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <br />
                      🕰️ {new Date(gift.claim.claimedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div>Reclamado por: <span className="font-mono">{formatFullAddress(gift.claim.claimerWallet || gift.claim.claimerAddress || 'Unknown')}</span></div>
                      {gift.claim.blockNumber && (
                        <div>Block: #{gift.claim.blockNumber}</div>
                      )}
                      {gift.claim.txHash && (
                        <a
                          href={`https://sepolia.basescan.org/tx/${gift.claim.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          TX: {formatAddress(gift.claim.txHash)}
                        </a>
                      )}
                      {gift.analytics.timeToClaimMinutes && (
                        <div>Tiempo total hasta claim: {Math.floor(gift.analytics.timeToClaimMinutes / 60)}h {gift.analytics.timeToClaimMinutes % 60}m</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expiration */}
                {gift.status.expiresAt && (
                  <div className="relative">
                    <div className={`absolute -left-8 w-4 h-4 ${gift.status.isExpired ? 'bg-red-500' : 'bg-gray-400'} rounded-full ring-4 ${gift.status.isExpired ? 'ring-red-100 dark:ring-red-900' : 'ring-gray-100 dark:ring-gray-900'}`}></div>
                    <div className="text-sm font-medium">{gift.status.isExpired ? '⏰ Expirado' : '⏳ Expira'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      📅 {new Date(gift.status.expiresAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <br />
                      🕰️ {new Date(gift.status.expiresAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ThemeCard>
          )}

          {/* Education Tab */}
          {activeTab === 'education' && gift.education && (
            <ThemeCard variant="default" className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Análisis Completo de Educación
              </h2>

              {/* Email Section */}
              {(gift.education.email || gift.education.emailHash) && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Información de Contacto
                  </h3>
                  <div className="space-y-1 text-sm">
                    {gift.education.email && (
                      <div>Email: <span className="font-mono">{gift.education.email}</span></div>
                    )}
                    {gift.education.emailHash && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">Hash SHA-256: <span className="font-mono">{gift.education.emailHash.slice(0, 16)}...</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Module Overview */}
              <div className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{gift.education.moduleName || 'Sales Masterclass'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Módulo ID: {gift.education.moduleId || '1'}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${gift.education.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {gift.education.score}%
                    </div>
                    <p className="text-xs">{gift.education.passed ? '✅ APROBADO' : '❌ REPROBADO'}</p>
                  </div>
                </div>

                {/* Time & Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Tiempo Total</div>
                    <div className="font-medium">{Math.floor((gift.education.totalTimeSpent || 0) / 60)}:{String((gift.education.totalTimeSpent || 0) % 60).padStart(2, '0')}</div>
                  </div>
                  {gift.education.questions && (
                    <>
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Preguntas</div>
                        <div className="font-medium">{gift.education.questions.length}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Correctas</div>
                        <div className="font-medium text-green-600 dark:text-green-400">{gift.education.questions.filter(q => q.isCorrect).length}</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Incorrectas</div>
                        <div className="font-medium text-red-600 dark:text-red-400">{gift.education.questions.filter(q => !q.isCorrect).length}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Engagement Metrics */}
                {(gift.education.videoWatched || gift.education.resourcesViewed) && (
                  <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">📊 Métricas de Engagement</h4>
                    <div className="space-y-1 text-xs">
                      {gift.education.videoWatched && (
                        <div>✅ Video visto ({gift.education.videoWatchTime ? `${Math.floor(gift.education.videoWatchTime / 60)}:${String(gift.education.videoWatchTime % 60).padStart(2, '0')}` : 'completo'})</div>
                      )}
                      {gift.education.resourcesViewed && gift.education.resourcesViewed.length > 0 && (
                        <div>📚 Recursos vistos: {gift.education.resourcesViewed.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Question-by-Question Breakdown */}
              {gift.education.questions && gift.education.questions.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Análisis Pregunta por Pregunta</h3>
                  <div className="space-y-3">
                    {gift.education.questions.map((question, idx) => (
                      <div
                        key={question.questionId}
                        className={`p-4 rounded-lg border-2 ${
                          question.isCorrect
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-lg ${question.isCorrect ? '✅' : '❌'}`}></span>
                              <span className="font-medium">Pregunta {idx + 1}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                question.isCorrect
                                  ? 'bg-green-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}>
                                {question.isCorrect ? 'CORRECTA' : 'INCORRECTA'}
                              </span>
                            </div>
                            <p className="text-sm mb-2">{question.questionText}</p>
                          </div>
                          <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                            <div>⏱️ {question.timeSpent}s</div>
                            {question.attemptNumber > 1 && (
                              <div>Intento #{question.attemptNumber}</div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-600 dark:text-gray-400 min-w-fit">Tu respuesta:</span>
                            <span className={`font-medium ${question.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {question.selectedAnswer}
                            </span>
                          </div>
                          {!question.isCorrect && (
                            <div className="flex items-start gap-2">
                              <span className="text-gray-600 dark:text-gray-400 min-w-fit">Respuesta correcta:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {question.correctAnswer}
                              </span>
                            </div>
                          )}
                        </div>

                        {question.timestamp && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            Respondida: {new Date(question.timestamp).toLocaleString('es-ES')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Performance Summary */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                    <h4 className="font-medium mb-2">📈 Resumen de Rendimiento</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Precisión</div>
                        <div className="font-bold text-lg">
                          {Math.round((gift.education.questions.filter(q => q.isCorrect).length / gift.education.questions.length) * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Tiempo Promedio</div>
                        <div className="font-bold text-lg">
                          {Math.round(gift.education.questions.reduce((acc, q) => acc + q.timeSpent, 0) / gift.education.questions.length)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Mejor Tiempo</div>
                        <div className="font-bold text-lg">
                          {Math.min(...gift.education.questions.map(q => q.timeSpent))}s
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Score Final</div>
                        <div className={`font-bold text-lg ${gift.education.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {gift.education.score}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ThemeCard>
          )}

          {/* Events History Tab */}
          {activeTab === 'events' && gift.events && gift.events.length > 0 && (
            <ThemeCard variant="default" className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Historial Completo de Eventos
              </h2>

              <div className="space-y-3">
                {gift.events.map((event) => (
                  <div key={event.eventId} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          event.type === 'GiftCreated' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          event.type === 'GiftViewed' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          event.type === 'GiftClaimed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          event.type === 'GiftExpired' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                          {event.type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleString('es-ES')}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-mono text-gray-700 dark:text-gray-300">
                        Event ID: {event.eventId}
                      </div>
                      {event.txHash && (
                        <div>
                          TX: <a
                            href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                          >
                            {formatAddress(event.txHash)}
                          </a>
                        </div>
                      )}
                      {event.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer hover:text-blue-500">Ver detalles</summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ThemeCard>
          )}

          {/* Technical Data Tab */}
          {activeTab === 'technical' && (
            <ThemeCard variant="default" className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Datos Técnicos Completos
              </h2>

              <div className="space-y-6">
                {/* CRITICAL USER REQUEST: Email + Wallet Addresses - PROMINENT DISPLAY */}
                <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    📋 Datos del Usuario
                  </h3>

                  <div className="space-y-4">
                    {/* Claimer Wallet Address - REQUESTED */}
                    {/* CRITICAL FIX: Use ALL possible data sources */}
                    {(() => {
                      const claimerWallet = gift.claim?.claimerWallet || gift.claim?.claimerAddress || gift.claimer || (gift as any).claimerWallet;
                      return claimerWallet ? (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="font-semibold text-green-700 dark:text-green-400">Wallet del Reclamador:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 rounded font-mono text-sm break-all">
                              {claimerWallet}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(claimerWallet);
                                alert('✅ Wallet copiada al portapapeles!');
                              }}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                              📋 Copiar
                            </button>
                          </div>
                          {(gift.claimedAt || gift.claim?.claimedAt) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Reclamado: {new Date(gift.claim?.claimedAt || gift.claimedAt!).toLocaleString('es-ES')}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {/* Email Address - REQUESTED */}
                    {/* CRITICAL FIX: Use ALL possible data sources */}
                    {(() => {
                      const email = gift.education?.email || (gift as any).email || (gift as any).emailPlain;
                      const emailHash = gift.education?.emailHash || (gift as any).emailHash;
                      return email ? (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-semibold text-blue-700 dark:text-blue-400">Email Verificado:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 rounded font-mono text-sm break-all">
                              {email}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(email);
                                alert('✅ Email copiado al portapapeles!');
                              }}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                              📋 Copiar
                            </button>
                          </div>
                          {emailHash && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Hash SHA-256: <code className="font-mono">{emailHash.slice(0, 24)}...</code>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {/* Calendar Booking Date - REQUESTED (now functional!) */}
                    {/* CRITICAL FIX: Use ALL possible data sources */}
                    {(() => {
                      const appointmentScheduled = gift.appointment?.scheduled || (gift as any).appointmentScheduled;
                      const eventDate = gift.appointment?.eventDate || (gift as any).appointmentDate;
                      const eventTime = gift.appointment?.eventTime || (gift as any).appointmentTime;
                      const duration = gift.appointment?.duration || (gift as any).appointmentDuration;
                      const timezone = gift.appointment?.timezone || (gift as any).appointmentTimezone;
                      const inviteeName = gift.appointment?.inviteeName || (gift as any).appointmentInviteeName;
                      const meetingUrl = gift.appointment?.meetingUrl || (gift as any).appointmentMeetingUrl;

                      return (appointmentScheduled || (eventDate && eventTime)) ? (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span className="font-semibold text-purple-700 dark:text-purple-400">Fecha de Cita Agendada:</span>
                          </div>
                          <div className="space-y-2">
                            {eventDate && eventTime && (
                              <div className="flex items-center gap-2">
                                <code className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 rounded font-mono text-sm">
                                  📅 {eventDate} a las {eventTime}
                                </code>
                              </div>
                            )}
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {duration && (
                                <div>⏱️ Duración: {duration} minutos</div>
                              )}
                              {timezone && (
                                <div>🌍 Zona horaria: {timezone}</div>
                              )}
                              {inviteeName && (
                                <div>👤 Invitado: {inviteeName}</div>
                              )}
                              {meetingUrl && (
                                <div>
                                  🔗 URL de reunión: <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">
                                    {meetingUrl.substring(0, 30)}...
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-gray-500" />
                            <span className="font-semibold text-gray-600 dark:text-gray-400">Fecha de Cita Agendada:</span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            ⏳ No se ha agendado ninguna cita todavía
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Blockchain Data */}
                <div>
                  <h3 className="font-medium mb-3">⛓️ Datos Blockchain</h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Token ID:</span>
                        <p className="font-mono">{gift.tokenId}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Gift ID:</span>
                        <p className="font-mono">{gift.giftId}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Campaign ID:</span>
                        <p className="font-mono">{gift.campaignId || 'default'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <p className={`font-medium ${getStatusColor(gift.status.current)}`}>
                          {getStatusLabel(gift.status.current)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Contract Addresses */}
                <div>
                  <h3 className="font-medium mb-3">📝 Smart Contracts</h3>
                  <div className="space-y-2 text-sm">
                    {gift.metadata.tbaAddress && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">TBA Address (ERC-6551):</span>
                        <p className="font-mono break-all">{gift.metadata.tbaAddress}</p>
                      </div>
                    )}
                    {gift.metadata.escrowAddress && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Escrow Contract:</span>
                        <p className="font-mono break-all">{gift.metadata.escrowAddress}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Is In Escrow:</span>
                      <p className={`font-medium ${gift.status.isInEscrow ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                        {gift.status.isInEscrow ? 'Yes (Not Claimed)' : 'No (Claimed)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                {(gift.creator.txHash || gift.claim?.txHash) && (
                  <div>
                    <h3 className="font-medium mb-3">💸 Transacciones</h3>
                    <div className="space-y-3">
                      {gift.creator.txHash && (
                        <div className="p-3 border rounded-lg">
                          <div className="text-sm font-medium mb-1">Create Transaction</div>
                          <a
                            href={`https://sepolia.basescan.org/tx/${gift.creator.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-blue-500 hover:underline break-all"
                          >
                            {gift.creator.txHash}
                          </a>
                          {gift.creator.gasUsed && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Gas Used: {gift.creator.gasUsed}</div>
                          )}
                        </div>
                      )}
                      {gift.claim?.txHash && (
                        <div className="p-3 border rounded-lg">
                          <div className="text-sm font-medium mb-1">Claim Transaction</div>
                          <a
                            href={`https://sepolia.basescan.org/tx/${gift.claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-blue-500 hover:underline break-all"
                          >
                            {gift.claim.txHash}
                          </a>
                          {gift.claim.gasUsed && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Gas Used: {gift.claim.gasUsed}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Value Information */}
                {gift.value && (gift.value.amount || gift.value.tokenAmount) && (
                  <div>
                    <h3 className="font-medium mb-3">💰 Valor del Regalo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {gift.value.amount && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Valor USD</div>
                          <div className="text-lg font-bold">${gift.value.amount.toFixed(2)}</div>
                        </div>
                      )}
                      {gift.value.tokenAmount && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Tokens</div>
                          <div className="text-lg font-bold">{gift.value.tokenAmount}</div>
                        </div>
                      )}
                      {gift.value.tokenSymbol && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Symbol</div>
                          <div className="text-lg font-bold">{gift.value.tokenSymbol}</div>
                        </div>
                      )}
                      {gift.value.currency && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Currency</div>
                          <div className="text-lg font-bold">{gift.value.currency}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <h3 className="font-medium mb-3">📋 Metadata</h3>
                  <div className="space-y-2 text-sm">
                    {gift.metadata.imageUrl && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Image URL:</span>
                        <a
                          href={gift.metadata.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {gift.metadata.imageUrl}
                        </a>
                      </div>
                    )}
                    {gift.metadata.imageCid && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">IPFS CID:</span>
                        <p className="font-mono">{gift.metadata.imageCid}</p>
                      </div>
                    )}
                    {gift.metadata.description && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Description:</span>
                        <p>{gift.metadata.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Has Password:</span>
                      <p className={`font-medium ${gift.metadata.hasPassword ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {gift.metadata.hasPassword ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {gift.claim?.passwordAttempts && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Password Attempts:</span>
                        <p>{gift.claim.passwordAttempts}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw JSON Export */}
                <details className="mt-6">
                  <summary className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 font-medium">📦 Ver JSON Completo</summary>
                  <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(gift, null, 2)}
                  </pre>
                </details>
              </div>
            </ThemeCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Overview */}
          <ThemeCard variant="highlighted" className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Resumen Ejecutivo
            </h2>

            <div className="space-y-4">
              {/* Status Badge */}
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className={`text-2xl font-bold ${getStatusColor(gift.status.current)}`}>
                  {getStatusLabel(gift.status.current)}
                </div>
                {gift.status.isInEscrow && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">En Escrow</div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-500">Vistas</div>
                  <div className="text-xl font-bold">{gift.analytics.totalViews}</div>
                  <div className="text-xs text-gray-400">{gift.analytics.uniqueViewers} únicos</div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-500">Conversión</div>
                  <div className="text-xl font-bold">{gift.analytics.conversionRate.toFixed(0)}%</div>
                  {gift.analytics.timeToClaimMinutes && (
                    <div className="text-xs text-gray-400">{Math.floor(gift.analytics.timeToClaimMinutes / 60)}h {gift.analytics.timeToClaimMinutes % 60}m</div>
                  )}
                </div>
              </div>

              {/* Education Score */}
              {gift.education && (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">🎓 Educación</div>
                  <div className="flex items-center justify-between">
                    <div className={`text-2xl font-bold ${gift.education.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {gift.education.score}%
                    </div>
                    <div className="text-xs">
                      {gift.education.passed ? '✅ APROBADO' : '❌ REPROBADO'}
                    </div>
                  </div>
                  {gift.education.questions && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {gift.education.questions.filter(q => q.isCorrect).length}/{gift.education.questions.length} correctas
                    </div>
                  )}
                </div>
              )}

              {/* Value */}
              {gift.value.amount && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg">
                  <div className="text-xs text-gray-500">Valor del Regalo</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${gift.value.amount.toFixed(2)}
                  </div>
                  {gift.value.currency && (
                    <div className="text-xs text-gray-400">{gift.value.currency}</div>
                  )}
                </div>
              )}
            </div>
          </ThemeCard>

          {/* Wallet Information */}
          <ThemeCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Información de Wallets
            </h2>

            <div className="space-y-3 text-xs">
              {/* CRITICAL FIX: ONLY SHOW CLAIMER WALLET, NOT CREATOR */}
              {/* User explicitly requested: "LA WALLET DEL CLAIMER, NADAMAS, LA DEL CREADOR NO LA NECESITAMOS PONER AHI" */}
              {(gift.claim?.claimerWallet || gift.claimer) && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-gray-600 dark:text-gray-400 mb-1">🏆 Reclamado por</div>
                  <div className="font-mono break-all text-green-600 dark:text-green-400">
                    {gift.claim?.claimerWallet || gift.claimer}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(gift.claim?.claimerWallet || gift.claimer!)}
                    className="mt-2 text-green-500 hover:text-green-600"
                  >
                    📋 Copiar dirección
                  </button>
                </div>
              )}

              {/* TBA Address */}
              {gift.metadata.tbaAddress && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-gray-600 dark:text-gray-400 mb-1">🔗 TBA (ERC-6551)</div>
                  <div className="font-mono break-all text-purple-600 dark:text-purple-400">
                    {gift.metadata.tbaAddress}
                  </div>
                </div>
              )}

              {/* Escrow Contract */}
              {gift.metadata.escrowAddress && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-gray-600 dark:text-gray-400 mb-1">🔒 Escrow</div>
                  <div className="font-mono break-all text-yellow-600 dark:text-yellow-400">
                    {gift.metadata.escrowAddress}
                  </div>
                </div>
              )}
            </div>
          </ThemeCard>

          {/* Contact Information */}
          {gift.education?.email && (
            <ThemeCard variant="default" className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Información de Contacto
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Email:</div>
                  <div className="font-medium">{gift.education.email}</div>
                </div>
                {gift.education.emailHash && (
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">SHA-256 Hash:</div>
                    <div className="font-mono text-xs break-all">{gift.education.emailHash}</div>
                  </div>
                )}
              </div>
            </ThemeCard>
          )}

          {/* Actions */}
          <ThemeCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Acciones Disponibles
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(gift, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `gift_${gift.giftId}_profile.json`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-colors"
              >
                💾 Exportar JSON Completo
              </button>

              <button
                onClick={() => {
                  // Generate CSV with all data
                  const csvContent = generateCSV(gift);
                  const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent);
                  const exportFileDefaultName = `gift_${gift.giftId}_data.csv`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm transition-colors"
              >
                📄 Exportar CSV
              </button>

              {gift.creator.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${gift.creator.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm text-center transition-colors"
                >
                  🔗 Ver Create TX
                </a>
              )}

              {gift.claim?.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${gift.claim.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm text-center transition-colors"
                >
                  🔗 Ver Claim TX
                </a>
              )}

              <a
                href={`https://sepolia.basescan.org/token/${gift.metadata.escrowAddress || '0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b'}?a=${gift.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm text-center transition-colors"
              >
                🔍 Ver en BaseScan
              </a>

              {gift.status.current === 'created' && !gift.status.isExpired && (
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/token/${gift.tokenId}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Link copiado al portapapeles!');
                  }}
                  className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm transition-colors"
                >
                  🔗 Copiar Link de Claim
                </button>
              )}
            </div>
          </ThemeCard>
        </div>
      </div>
    </div>
  );
}