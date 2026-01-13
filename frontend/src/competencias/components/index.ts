/**
 * COMPETENCIAS COMPONENTS
 * Centralized exports for all competition UI components
 */

// Main Wizard
export { WorkflowWizard } from './WorkflowWizard';
export type { WorkflowWizardProps } from './WorkflowWizard';

// Cards
export { CompetitionCard } from './CompetitionCard';
export type { CompetitionCardProps } from './CompetitionCard';

// Transparency
export { LiveTransparencyView } from './LiveTransparencyView';
export type { LiveTransparencyViewProps } from './LiveTransparencyView';

// Judge Panel
export { JudgePanel } from './JudgePanel';
export type { JudgePanelProps } from './JudgePanel';

// Prediction Market
export { PredictionMarketView } from './PredictionMarketView';
export type { PredictionMarketViewProps } from './PredictionMarketView';

// Transparency Dashboard
export { TransparencyDashboard } from './TransparencyDashboard';
export type { TransparencyDashboardProps } from './TransparencyDashboard';

// Re-export for convenience
export * from './WorkflowWizard';
export * from './CompetitionCard';
export * from './LiveTransparencyView';
export * from './JudgePanel';
export * from './PredictionMarketView';
export * from './TransparencyDashboard';
