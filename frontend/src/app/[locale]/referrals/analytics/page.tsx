'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useActiveAccount } from 'thirdweb/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Import Recharts components directly (no dynamic import due to TypeScript issues)
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  Treemap, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Gift, Users, DollarSign, Clock, 
  Eye, GraduationCap, CheckCircle, XCircle, RotateCcw,
  Download, Filter, Calendar, RefreshCw, Activity,
  ArrowUp, ArrowDown, BarChart2, PieChartIcon
} from 'lucide-react';
import { DashboardGlassHeader } from '@/components/ui/GlassPanelHeader';
import { ThemeCard, ThemeSection } from '@/components/ui/ThemeSystem';
import { useNotifications } from '@/components/ui/NotificationSystem';
import type { CampaignStats, GiftStatus, TimeSeriesPoint } from '@/lib/giftAnalytics';

// ============================================================================
// MOCK DATA - Replace with real API calls
// ============================================================================

// Mock data removed - data now fetched from Redis API

// ============================================================================
// TYPES
// ============================================================================

interface FilterState {
  campaignIds: string[];
  dateRange: { from: Date | null; to: Date | null };
  status: keyof GiftStatus | 'all';
  groupBy: 'day' | 'week' | 'month';
}

interface ChartView {
  type: 'area' | 'bar' | 'line' | 'pie' | 'radial' | 'funnel';
  metric: 'conversion' | 'volume' | 'status' | 'referrers';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GiftAnalyticsPage() {
  const t = useTranslations('analytics');
  const format = useFormatter();
  const account = useActiveAccount();
  const { showNotification } = useNotifications();
  
  // State
  const [loading, setLoading] = useState(true); // Start with loading true to fetch initial data
  const [stats, setStats] = useState<CampaignStats[]>([]); // Initialize with empty array
  const [filter, setFilter] = useState<FilterState>({
    campaignIds: [],
    dateRange: { from: null, to: null },
    status: 'all',
    groupBy: 'day'
  });
  const [chartView, setChartView] = useState<ChartView>({
    type: 'area',
    metric: 'conversion'
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [kpis, setKpis] = useState({
    totalGifts: 0,
    claimedGifts: 0,
    conversionRate: 0,
    activeUsers: 0,
    totalValue: 0
  });
  
  // Calculate aggregated metrics
  const metrics = useMemo(() => {
    const totals = stats.reduce((acc, campaign) => ({
      created: acc.created + campaign.status.created,
      viewed: acc.viewed + campaign.status.viewed,
      preClaimStarted: acc.preClaimStarted + campaign.status.preClaimStarted,
      educationCompleted: acc.educationCompleted + campaign.status.educationCompleted,
      claimed: acc.claimed + campaign.status.claimed,
      expired: acc.expired + campaign.status.expired,
      returned: acc.returned + campaign.status.returned,
      value: acc.value + campaign.totalValue
    }), {
      created: 0,
      viewed: 0,
      preClaimStarted: 0,
      educationCompleted: 0,
      claimed: 0,
      expired: 0,
      returned: 0,
      value: 0
    });
    
    const conversionRate = totals.created > 0 
      ? (totals.claimed / totals.created) * 100 
      : 0;
    
    const viewRate = totals.created > 0
      ? (totals.viewed / totals.created) * 100
      : 0;
    
    const educationRate = totals.preClaimStarted > 0
      ? (totals.educationCompleted / totals.preClaimStarted) * 100
      : 0;
    
    return {
      totals,
      conversionRate,
      viewRate,
      educationRate
    };
  }, [stats]);
  
  // Prepare chart data with translations
  const funnelData = [
    { stage: t('stages.created'), value: metrics.totals.created, fill: '#3b82f6' },
    { stage: t('stages.viewed'), value: metrics.totals.viewed, fill: '#10b981' },
    { stage: t('stages.preClaim'), value: metrics.totals.preClaimStarted, fill: '#f59e0b' },
    { stage: t('stages.education'), value: metrics.totals.educationCompleted, fill: '#8b5cf6' },
    { stage: t('stages.claimed'), value: metrics.totals.claimed, fill: '#06b6d4' }
  ];
  
  const statusPieData = [
    { name: t('stages.claimed'), value: metrics.totals.claimed, fill: '#10b981' },
    { name: t('stages.inProgress'), value: metrics.totals.educationCompleted, fill: '#3b82f6' },
    { name: t('stages.expired'), value: metrics.totals.expired, fill: '#ef4444' },
    { name: t('stages.returned'), value: metrics.totals.returned, fill: '#f59e0b' },
    { name: t('stages.pending'), value: metrics.totals.created - metrics.totals.claimed - metrics.totals.expired - metrics.totals.returned, fill: '#6b7280' }
  ];
  
  // Generate time series with formatted dates
  const timeSeries: TimeSeriesPoint[] = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => {
      const timestamp = now - (6 - i) * 24 * 60 * 60 * 1000;
      return {
        timestamp,
        value: Math.floor(Math.random() * 20) + 15 + i * 3,
        label: format.dateTime(new Date(timestamp), { 
          month: 'short', 
          day: 'numeric' 
        })
      };
    });
  }, [format]);
  
  // Fetch data
  useEffect(() => {
    fetchAnalytics();
  }, [filter]);
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);
  
  async function fetchAnalytics(silent = false) {
    if (!silent) setLoading(true);

    try {
      // Fetch real data from API
      const response = await fetch('/api/analytics/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignIds: filter.campaignIds,
          from: filter.dateRange.from?.toISOString(),
          to: filter.dateRange.to?.toISOString(),
          status: filter.status,
          limit: 50
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.stats) {
        // Update stats with real data
        setStats(data.stats);

        // Update KPIs with summary data
        if (data.summary) {
          setKpis(prev => ({
            ...prev,
            totalGifts: data.summary.totalGifts,
            claimedGifts: data.summary.totalClaimed,
            conversionRate: data.summary.averageConversionRate,
            totalValue: data.summary.totalValue,
            activeUsers: data.summary.totalViewed
          }));
        }

        if (!silent) {
          showNotification({
            type: 'success',
            title: t('notifications.dataUpdated'),
            message: `${data.stats.length} ${t('notifications.campaignsLoaded')}`
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      showNotification({
        type: 'error',
        title: t('notifications.errorLoading'),
        message: t('notifications.errorLoadingMessage')
      });
    } finally {
      setLoading(false);
    }
  }
  
  function exportData() {
    const csvContent = [
      [t('table.campaign'), t('table.total'), t('table.claimed'), t('table.conversion'), t('table.value')],
      ...stats.map(s => [
        s.campaignName,
        s.totalGifts,
        s.status.claimed,
        `${format.number(s.conversionRate / 100, { style: 'percent', minimumFractionDigits: 2 })}`,
        format.number(s.totalValue, { style: 'currency', currency: 'USD' })
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-analytics-${format.dateTime(new Date(), { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-')}.csv`;
    a.click();
    
    showNotification({
      type: 'success',
      title: t('notifications.exportComplete'),
      message: t('notifications.exportCompleteMessage')
    });
  }
  
  // Custom tooltip with i18n formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {format.number(entry.value)}
          </p>
        ))}
      </div>
    );
  };
  
  // Check authentication
  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ThemeCard variant="default">
          <div className="p-8 text-center">
            <Gift className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">{t('auth.connectWallet')}</h2>
            <p className="text-gray-600">{t('auth.connectMessage')}</p>
          </div>
        </ThemeCard>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <DashboardGlassHeader
        title={
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6" />
            <span>{t('title')}</span>
            {autoRefresh && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-green-500"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
            )}
          </div>
        }
        subtitle={t('subtitle')}
      >
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              autoRefresh 
                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            {autoRefresh ? t('nav.live') : t('nav.manual')}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {t('nav.filters')}
          </button>
          
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('nav.refresh')}
          </button>
          
          <button
            onClick={exportData}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('nav.export')}
          </button>

          <a
            href="/referrals/import"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Importar Histórico
          </a>
        </div>
      </DashboardGlassHeader>
      
      <div className="container mx-auto px-4 py-8">
        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <ThemeCard variant="default">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('filters.title')}</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('filters.campaigns')}</label>
                      <select 
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                        multiple
                        value={filter.campaignIds}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setFilter(prev => ({ ...prev, campaignIds: values }));
                        }}
                      >
                        <option value="">{t('filters.allCampaigns')}</option>
                        {stats.map(s => (
                          <option key={s.campaignId} value={s.campaignId}>
                            {s.campaignName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('filters.status')}</label>
                      <select 
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                        value={filter.status}
                        onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as any }))}
                      >
                        <option value="all">{t('filters.allStatus')}</option>
                        <option value="created">{t('stages.created')}</option>
                        <option value="viewed">{t('stages.viewed')}</option>
                        <option value="claimed">{t('stages.claimed')}</option>
                        <option value="expired">{t('stages.expired')}</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('filters.groupBy')}</label>
                      <select 
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                        value={filter.groupBy}
                        onChange={(e) => setFilter(prev => ({ ...prev, groupBy: e.target.value as any }))}
                      >
                        <option value="day">{t('filters.day')}</option>
                        <option value="week">{t('filters.week')}</option>
                        <option value="month">{t('filters.month')}</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('filters.chartType')}</label>
                      <select 
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                        value={chartView.type}
                        onChange={(e) => setChartView(prev => ({ ...prev, type: e.target.value as any }))}
                      >
                        <option value="area">{t('filters.area')}</option>
                        <option value="bar">{t('filters.bar')}</option>
                        <option value="line">{t('filters.line')}</option>
                        <option value="pie">{t('filters.pie')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </ThemeCard>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t('kpis.totalGifts')}
            value={format.number(metrics.totals.created)}
            change={12.5}
            icon={<Gift className="w-5 h-5" />}
            color="blue"
            formatter={format}
            t={t}
          />
          
          <MetricCard
            title={t('kpis.claimed')}
            value={format.number(metrics.totals.claimed)}
            change={8.2}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            subtitle={`${format.number(metrics.conversionRate / 100, { 
              style: 'percent', 
              minimumFractionDigits: 1 
            })} ${t('kpis.conversion')}`}
            formatter={format}
            t={t}
          />
          
          <MetricCard
            title={t('kpis.totalValue')}
            value={format.number(metrics.totals.value, {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
            change={15.3}
            icon={<DollarSign className="w-5 h-5" />}
            color="purple"
            formatter={format}
            t={t}
          />
          
          <MetricCard
            title={t('kpis.avgTime')}
            value={`${Math.round(stats.reduce((acc, s) => acc + s.avgClaimTime, 0) / stats.length)} min`}
            change={-5.2}
            icon={<Clock className="w-5 h-5" />}
            color="orange"
            formatter={format}
            t={t}
          />
        </div>
        
        {/* Main Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Conversion Funnel */}
          <ThemeCard variant="default">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('charts.conversionFunnel')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(v) => format.number(v)} />
                  <YAxis dataKey="stage" type="category" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ThemeCard>
          
          {/* Status Distribution */}
          <ThemeCard variant="default">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('charts.statusDistribution')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ThemeCard>
        </div>
        
        {/* Time Series */}
        <ThemeCard variant="default" className="mb-8">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('charts.timeEvolution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => format.number(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fill="url(#colorGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ThemeCard>
        
        {/* Campaign Table */}
        <ThemeCard variant="default">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('charts.campaignDetails')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t('table.campaign')}</th>
                    <th className="text-center py-3 px-4">{t('table.total')}</th>
                    <th className="text-center py-3 px-4">{t('table.claimed')}</th>
                    <th className="text-center py-3 px-4">{t('table.conversion')}</th>
                    <th className="text-center py-3 px-4">{t('table.value')}</th>
                    <th className="text-center py-3 px-4">{t('table.topReferrer')}</th>
                    <th className="text-center py-3 px-4">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(campaign => (
                    <tr key={campaign.campaignId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{campaign.campaignName}</div>
                          <div className="text-sm text-gray-500">ID: {campaign.campaignId}</div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {format.number(campaign.totalGifts)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {format.number(campaign.status.claimed)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <span>
                            {format.number(campaign.conversionRate / 100, {
                              style: 'percent',
                              minimumFractionDigits: 1
                            })}
                          </span>
                          {campaign.conversionRate > 40 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {format.number(campaign.totalValue, {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0
                        })}
                      </td>
                      <td className="text-center py-3 px-4">
                        {campaign.topReferrers[0] ? (
                          <div className="text-sm">
                            <div>{campaign.topReferrers[0].address}</div>
                            <div className="text-gray-500">
                              {format.number(campaign.topReferrers[0].count)} {t('table.refs')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <Link
                          href={`/referrals/analytics/gift/${campaign.campaignId.replace('campaign_', '')}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {t('table.viewDetails')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ThemeCard>
      </div>
    </div>
  );
}

// ============================================================================
// SUB COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  subtitle?: string;
  formatter: any;
  t: any;
}

function MetricCard({ title, value, change, icon, color, subtitle, formatter, t }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400'
  };
  
  return (
    <ThemeCard variant="default">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-4 flex items-center gap-1">
            {change > 0 ? (
              <ArrowUp className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              change > 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {formatter.number(Math.abs(change) / 100, {
                style: 'percent',
                minimumFractionDigits: 1
              })}
            </span>
            <span className="text-sm text-gray-500">{t('kpis.vs')}</span>
          </div>
        )}
      </div>
    </ThemeCard>
  );
}