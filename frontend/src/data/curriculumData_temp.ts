// Temporary placeholder modules for M5-M20
export const placeholderModules = Array.from({ length: 16 }, (_, i) => ({
  id: `M${i + 5}`,
  title: `Módulo ${i + 5}`,
  description: `Descripción detallada del módulo ${i + 5}`,
  objective: `Objetivo específico del módulo ${i + 5}`,
  branches: [],
  xpTotal: 1200 + i * 100,
  estimatedTime: 60 + i * 5,
  status: 'locked' as const,
  completedBranches: 0,
  categoryId: 'placeholder',
  categoryTitle: 'Placeholder',
  depth: i < 4 ? 'high' as const : 'medium' as const,
  prerequisites: [`M${i + 4}`],
  masterBadgeId: `module-${i + 5}-master`,
  masterBadgeTitle: `Módulo ${i + 5} Master`,
  masterBadgeDescription: `Maestro del módulo ${i + 5}`,
  icon: ['🏦', '🖼️', '🏛️', '🌐', '🧠', '🌉', '🔒', '📊', '📈', '👨‍💻', '🧪', '🔮', '💾', '🎮', '⚖️', '🚀'][i] || '📚',
  color: ['#3B82F6', '#10B981', '#059669', '#A855F7', '#8B5CF6', '#06B6D4', '#0EA5E9', '#14B8A6', '#EF4444', '#F59E0B', '#84CC16', '#8B5CF6', '#6366F1', '#EC4899', '#7C3AED', '#F97316'][i] || '#6B7280',
  position: { 
    x: 550 + ((i % 4) * 200), 
    y: 80 + Math.floor(i / 4) * 160 
  },
  hasQuests: true,
  questsCount: i < 4 ? 4 : 3,
  badgesAvailable: i < 4 ? 4 : 3
}));