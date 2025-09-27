'use client';

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { ThemeCard } from '../../../../components/ui/ThemeSystem';
import { useNotifications } from '../../../../components/ui/NotificationSystem';
import { Download, Activity, BarChart2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ImportHistoricalDataPage() {
  const t = useTranslations('analytics');
  const account = useActiveAccount();
  const { showNotification } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [walletFilter, setWalletFilter] = useState('');
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<any>(null);

  async function importHistoricalData() {
    if (loading) return;

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/analytics/import-historical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletFilter || undefined,
          limit: limit
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        showNotification({
          type: 'success',
          title: 'Importación completada',
          message: `Se importaron ${data.summary.imported} eventos históricos`
        });
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showNotification({
        type: 'error',
        title: 'Error en importación',
        message: error.message || 'No se pudieron importar los datos'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <ThemeCard variant="default" className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold">Importar Datos Históricos</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Importa regalos existentes en la blockchain al sistema de analytics
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Wallet Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Wallet Address (opcional)
              </label>
              <input
                type="text"
                value={walletFilter}
                onChange={(e) => setWalletFilter(e.target.value)}
                placeholder="0x... (dejar vacío para importar todos)"
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Filtra por wallet creadora o deja vacío para todos los regalos
              </p>
            </div>

            {/* Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Número de eventos a importar
              </label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Importará los últimos N eventos (máximo 100)
              </p>
            </div>

            {/* Quick Fill Buttons */}
            <div>
              <p className="text-sm font-medium mb-2">Acciones rápidas:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setWalletFilter(account?.address || '')}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  disabled={!account}
                >
                  Mi wallet
                </button>
                <button
                  onClick={() => setLimit(5)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Últimos 5
                </button>
                <button
                  onClick={() => setLimit(20)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Últimos 20
                </button>
              </div>
            </div>

            {/* Import Button */}
            <button
              onClick={importHistoricalData}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading ? (
                <>
                  <Activity className="w-5 h-5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Importar Datos Históricos
                </>
              )}
            </button>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Nota importante:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Solo importa eventos de los últimos 1000 bloques por defecto</li>
                    <li>• Los eventos ya importados se omitirán automáticamente</li>
                    <li>• Los datos históricos tendrán timestamps aproximados</li>
                    <li>• No se importarán datos educacionales (solo creación/claim)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Results */}
            {results && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  ✅ Importación Completada
                </h3>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                  <p>• Eventos encontrados: {results.summary.eventsFound}</p>
                  <p>• Eventos procesados: {results.summary.eventsProcessed}</p>
                  <p>• Importados: {results.summary.imported}</p>
                  <p>• Omitidos (duplicados): {results.summary.skipped}</p>
                  <p>• Errores: {results.summary.errors}</p>
                  <p>• Campañas creadas: {results.summary.campaignsCreated}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                  <a
                    href="/referrals/analytics"
                    className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    <BarChart2 className="w-4 h-4" />
                    Ver Analytics Dashboard
                  </a>
                </div>
              </div>
            )}
          </div>
        </ThemeCard>
      </div>
    </div>
  );
}