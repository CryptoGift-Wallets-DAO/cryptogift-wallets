'use client';

import { useState, useEffect } from 'react';
import { ThemeCard } from '../../../../components/ui/ThemeSystem';

export default function AnalyticsTestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch directly from production API
      const response = await fetch('https://cryptogift-wallets.vercel.app/api/analytics/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ThemeCard variant="warning" className="p-6">
          <p>Error: {error}</p>
        </ThemeCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Analytics Test - Datos Reales de Redis</h1>

      {data && data.success && (
        <>
          {/* Summary */}
          <ThemeCard variant="highlighted" className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📊 Resumen Global</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Regalos</p>
                <p className="text-2xl font-bold">{data.summary?.totalGifts || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reclamados</p>
                <p className="text-2xl font-bold text-green-500">{data.summary?.totalClaimed || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Vistos</p>
                <p className="text-2xl font-bold text-blue-500">{data.summary?.totalViewed || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Educación Completada</p>
                <p className="text-2xl font-bold text-purple-500">{data.summary?.totalEducationCompleted || 0}</p>
              </div>
            </div>
          </ThemeCard>

          {/* Campaigns */}
          <ThemeCard variant="default" className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Campañas ({data.totalCampaigns || 0})</h2>

            {data.stats && data.stats.map((campaign: any) => (
              <div key={campaign.campaignId} className="border-b pb-4 mb-4 last:border-0">
                <h3 className="font-medium text-lg">{campaign.campaignName}</h3>
                <p className="text-sm text-gray-600 mb-2">ID: {campaign.campaignId}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Creados:</span>
                    <span className="ml-2 font-medium">{campaign.status.created}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reclamados:</span>
                    <span className="ml-2 font-medium text-green-500">{campaign.status.claimed}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Vistos:</span>
                    <span className="ml-2 font-medium">{campaign.status.viewed}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tasa Conversión:</span>
                    <span className="ml-2 font-medium">{campaign.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>

                {campaign.topReferrers && campaign.topReferrers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Top Referrer:</p>
                    <p className="text-xs font-mono">{campaign.topReferrers[0].address}</p>
                  </div>
                )}
              </div>
            ))}
          </ThemeCard>

          {/* Raw Data */}
          <ThemeCard variant="default" className="p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Datos Raw (JSON)</h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </ThemeCard>

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Actualizar Datos
            </button>

            <a
              href="/referrals/analytics"
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Ver Dashboard Principal
            </a>
          </div>
        </>
      )}
    </div>
  );
}