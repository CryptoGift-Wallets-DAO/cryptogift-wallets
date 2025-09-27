'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Gift, User, Clock, CheckCircle, Mail, Award, TrendingUp, Calendar, Hash, Wallet, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ThemeCard } from '../../../../../../components/ui/ThemeSystem';

interface GiftDetails {
  giftId: string;
  tokenId: string;
  campaignId: string;
  creator: string;
  claimer?: string;
  status: 'created' | 'viewed' | 'preClaimStarted' | 'educationCompleted' | 'claimed' | 'expired';

  // Timeline
  createdAt: string;
  viewedAt?: string;
  preClaimStartedAt?: string;
  educationStartedAt?: string;
  educationCompletedAt?: string;
  claimedAt?: string;
  expiresAt: string;

  // Education data
  educationRequired: boolean;
  educationModules?: Array<{
    moduleId: number;
    moduleName: string;
    score: number;
    requiredScore: number;
    passed: boolean;
    completedAt: string;
    attempts: number;
    correctAnswers?: string[];
    incorrectAnswers?: string[];
  }>;
  totalEducationScore?: number;
  educationEmail?: string;

  // Transaction data
  createTxHash?: string;
  claimTxHash?: string;
  value?: number;

  // Metadata
  imageUrl?: string;
  description?: string;
  hasPassword: boolean;
  passwordValidated?: boolean;
  referrer?: string;
  tbaAddress?: string;

  // Analytics
  totalViews: number;
  uniqueViewers: number;
  conversionRate: number;
  timeToClaimMinutes?: number;
}

export default function GiftDetailsPage() {
  const params = useParams();
  const giftId = params?.giftId as string;
  const [gift, setGift] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (giftId) {
      fetchGiftDetails();
    }
  }, [giftId]);

  async function fetchGiftDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/gift-details/${giftId}`);
      if (!response.ok) throw new Error('Failed to fetch gift details');

      const data = await response.json();
      setGift(data.gift);
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

  const statusColors = {
    created: 'text-blue-500',
    viewed: 'text-yellow-500',
    preClaimStarted: 'text-orange-500',
    educationCompleted: 'text-purple-500',
    claimed: 'text-green-500',
    expired: 'text-red-500'
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      created: 'Creado',
      viewed: 'Visto',
      preClaimStarted: 'Claim Iniciado',
      educationCompleted: 'Educación Completada',
      claimed: 'Reclamado',
      expired: 'Expirado'
    };
    return labels[status] || status;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/referrals/analytics" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-7 h-7" />
            Detalles del Regalo #{gift.tokenId}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gift ID: {gift.giftId} | Campaign: {gift.campaignId}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[gift.status]} bg-opacity-10 bg-current`}>
          {getStatusLabel(gift.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <ThemeCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline del Regalo
            </h2>

            <div className="relative pl-8">
              <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-300 dark:bg-gray-600"></div>

              {/* Created */}
              <div className="relative mb-6">
                <div className="absolute -left-8 w-4 h-4 bg-blue-500 rounded-full"></div>
                <div className="text-sm font-medium">Regalo Creado</div>
                <div className="text-xs text-gray-500">{new Date(gift.createdAt).toLocaleString('es-ES')}</div>
                <div className="text-xs text-gray-400">Por: {gift.creator.slice(0, 10)}...</div>
              </div>

              {/* Viewed */}
              {gift.viewedAt && (
                <div className="relative mb-6">
                  <div className="absolute -left-8 w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <div className="text-sm font-medium">Primera Vista</div>
                  <div className="text-xs text-gray-500">{new Date(gift.viewedAt).toLocaleString('es-ES')}</div>
                  <div className="text-xs text-gray-400">{gift.totalViews} vistas totales, {gift.uniqueViewers} únicos</div>
                </div>
              )}

              {/* Pre-claim Started */}
              {gift.preClaimStartedAt && (
                <div className="relative mb-6">
                  <div className="absolute -left-8 w-4 h-4 bg-orange-500 rounded-full"></div>
                  <div className="text-sm font-medium">Proceso de Claim Iniciado</div>
                  <div className="text-xs text-gray-500">{new Date(gift.preClaimStartedAt).toLocaleString('es-ES')}</div>
                  {gift.passwordValidated && (
                    <div className="text-xs text-gray-400">✅ Contraseña validada</div>
                  )}
                </div>
              )}

              {/* Education Completed */}
              {gift.educationCompletedAt && (
                <div className="relative mb-6">
                  <div className="absolute -left-8 w-4 h-4 bg-purple-500 rounded-full"></div>
                  <div className="text-sm font-medium">Educación Completada</div>
                  <div className="text-xs text-gray-500">{new Date(gift.educationCompletedAt).toLocaleString('es-ES')}</div>
                  <div className="text-xs text-gray-400">Puntuación: {gift.totalEducationScore}%</div>
                </div>
              )}

              {/* Claimed */}
              {gift.claimedAt && (
                <div className="relative mb-6">
                  <div className="absolute -left-8 w-4 h-4 bg-green-500 rounded-full"></div>
                  <div className="text-sm font-medium">Regalo Reclamado</div>
                  <div className="text-xs text-gray-500">{new Date(gift.claimedAt).toLocaleString('es-ES')}</div>
                  <div className="text-xs text-gray-400">Por: {gift.claimer?.slice(0, 10)}...</div>
                  {gift.timeToClaimMinutes && (
                    <div className="text-xs text-gray-400">
                      Tiempo total: {Math.floor(gift.timeToClaimMinutes / 60)}h {gift.timeToClaimMinutes % 60}m
                    </div>
                  )}
                </div>
              )}

              {/* Expiration */}
              <div className="relative">
                <div className={`absolute -left-8 w-4 h-4 ${gift.status === 'expired' ? 'bg-red-500' : 'bg-gray-400'} rounded-full`}></div>
                <div className="text-sm font-medium">Expiración</div>
                <div className="text-xs text-gray-500">{new Date(gift.expiresAt).toLocaleString('es-ES')}</div>
              </div>
            </div>
          </ThemeCard>

          {/* Education Details */}
          {gift.educationRequired && gift.educationModules && (
            <ThemeCard variant="default" className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Resultados de Educación
              </h2>

              {gift.educationEmail && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Email proporcionado: {gift.educationEmail}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {gift.educationModules.map((module) => (
                  <div key={module.moduleId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{module.moduleName}</h3>
                        <p className="text-xs text-gray-500">
                          Completado: {new Date(module.completedAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${module.passed ? 'text-green-500' : 'text-red-500'}`}>
                          {module.score}%
                        </div>
                        <p className="text-xs text-gray-500">Mínimo: {module.requiredScore}%</p>
                      </div>
                    </div>

                    {module.attempts > 1 && (
                      <p className="text-xs text-gray-400">Intentos: {module.attempts}</p>
                    )}

                    {/* Correct/Incorrect Answers */}
                    {(module.correctAnswers || module.incorrectAnswers) && (
                      <div className="mt-3 pt-3 border-t">
                        {module.correctAnswers && module.correctAnswers.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">
                              ✅ Respuestas correctas ({module.correctAnswers.length}):
                            </p>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                              {module.correctAnswers.map((q, i) => (
                                <li key={i}>• {q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {module.incorrectAnswers && module.incorrectAnswers.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                              ❌ Respuestas incorrectas ({module.incorrectAnswers.length}):
                            </p>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                              {module.incorrectAnswers.map((q, i) => (
                                <li key={i}>• {q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Puntuación Total:</span>
                  <span className={`text-lg font-bold ${gift.totalEducationScore && gift.totalEducationScore >= 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {gift.totalEducationScore}%
                  </span>
                </div>
              </div>
            </ThemeCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <ThemeCard variant="highlighted" className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Estadísticas Rápidas
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Vistas totales</span>
                <span className="font-medium">{gift.totalViews}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Visitantes únicos</span>
                <span className="font-medium">{gift.uniqueViewers}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tasa de conversión</span>
                <span className="font-medium">{gift.conversionRate.toFixed(1)}%</span>
              </div>

              {gift.timeToClaimMinutes && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tiempo hasta claim</span>
                  <span className="font-medium">
                    {Math.floor(gift.timeToClaimMinutes / 60)}h {gift.timeToClaimMinutes % 60}m
                  </span>
                </div>
              )}

              {gift.value && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Valor</span>
                  <span className="font-medium">${gift.value.toFixed(2)}</span>
                </div>
              )}
            </div>
          </ThemeCard>

          {/* Technical Details */}
          <ThemeCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles Técnicos
            </h2>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-500">Token ID:</span>
                <p className="font-mono break-all">{gift.tokenId}</p>
              </div>

              <div>
                <span className="text-gray-500">Gift ID:</span>
                <p className="font-mono break-all">{gift.giftId}</p>
              </div>

              <div>
                <span className="text-gray-500">Campaign ID:</span>
                <p className="font-mono break-all">{gift.campaignId}</p>
              </div>

              {gift.creator && (
                <div>
                  <span className="text-gray-500">Creador:</span>
                  <p className="font-mono break-all">{gift.creator}</p>
                </div>
              )}

              {gift.claimer && (
                <div>
                  <span className="text-gray-500">Reclamado por:</span>
                  <p className="font-mono break-all">{gift.claimer}</p>
                </div>
              )}

              {gift.tbaAddress && (
                <div>
                  <span className="text-gray-500">TBA Address:</span>
                  <p className="font-mono break-all">{gift.tbaAddress}</p>
                </div>
              )}

              {gift.createTxHash && (
                <div>
                  <span className="text-gray-500">Create TX:</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${gift.createTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-500 hover:underline break-all"
                  >
                    {gift.createTxHash.slice(0, 20)}...
                  </a>
                </div>
              )}

              {gift.claimTxHash && (
                <div>
                  <span className="text-gray-500">Claim TX:</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${gift.claimTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-500 hover:underline break-all"
                  >
                    {gift.claimTxHash.slice(0, 20)}...
                  </a>
                </div>
              )}
            </div>
          </ThemeCard>

          {/* Actions */}
          <ThemeCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold mb-4">Acciones</h2>

            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                Exportar Datos (CSV)
              </button>

              <button className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
                Ver en Block Explorer
              </button>

              {gift.status === 'created' && (
                <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                  Compartir Link
                </button>
              )}
            </div>
          </ThemeCard>
        </div>
      </div>
    </div>
  );
}