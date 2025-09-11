# 🎨 CREATOR STUDIO - DOCUMENTATION

## 📋 TABLE OF CONTENTS
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Content Creation Process](#content-creation-process)
5. [JsonLogic Rule Engine](#jsonlogic-rule-engine)
6. [Templates System](#templates-system)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)

---

## 🎯 OVERVIEW

Creator Studio is a comprehensive no-code platform for creating educational content and engagement campaigns within CryptoGift Wallets. It's integrated as a tab within Knowledge Academy, not a separate page.

### Key Features
- 🎯 **Visual Content Builder**: Drag-and-drop interface for lessons
- 🧩 **JsonLogic Rule Engine**: Visual rule builder for campaigns
- 📚 **Template Library**: 20+ pre-built templates
- 💾 **Auto-save System**: Draft preservation every 30 seconds
- ✅ **Zod Validation**: Type-safe content creation
- 📊 **Analytics Integration**: Track content performance

### Location
```typescript
// Access Creator Studio
URL: /knowledge?tab=create

// Integration point
Component: frontend/src/app/knowledge/page.tsx
Tab: 'create'
```

---

## 🏗️ ARCHITECTURE

### File Structure
```
frontend/src/
├── components/creator-studio/
│   ├── CreatorWizard.tsx       # Main wizard component
│   └── RuleBuilder.tsx         # Visual rule builder
└── lib/creator-studio/
    ├── types.ts                # TypeScript definitions
    ├── validation.ts           # Zod schemas
    ├── templates.ts            # Template library
    ├── jsonLogicEngine.ts      # Rule engine
    └── utils.ts                # Helper functions
```

### Core Components Architecture

```typescript
// Type System
interface CreatorStudioArchitecture {
  // Content Types
  contentTypes: {
    lesson: LessonCreatorData,
    campaign: CampaignCreatorData
  },
  
  // Validation Layer
  validation: {
    schemas: 'Zod',
    runtime: 'TypeScript',
    pattern: 'DO→EXPLAIN→CHECK→REINFORCE'
  },
  
  // Storage Strategy
  storage: {
    draft: 'localStorage',
    published: 'API backend',
    cache: 'sessionStorage'
  },
  
  // UI Components
  ui: {
    wizard: 'Step-by-step creation',
    ruleBuilder: 'Drag-drop conditions',
    preview: 'Real-time preview',
    templates: 'Quick start options'
  }
}
```

---

## 🧩 COMPONENTS

### 1. CreatorWizard (`CreatorWizard.tsx`)

Universal wizard for creating lessons and campaigns.

```typescript
interface CreatorWizardProps {
  type: 'lesson' | 'campaign';
  templateData?: Partial<LessonCreatorData | CampaignCreatorData>;
  onComplete: (data: LessonCreatorData | CampaignCreatorData) => void;
  onSaveDraft?: (data: any) => void;
  onCancel?: () => void;
}

// Usage
<CreatorWizard
  type="lesson"
  templateData={selectedTemplate}
  onComplete={(data) => {
    console.log('Lesson created:', data);
    saveToBackend(data);
  }}
  onSaveDraft={(draft) => {
    localStorage.setItem('draft', JSON.stringify(draft));
  }}
/>
```

#### Wizard Steps

**For Lessons:**
1. **Metadata** - Title, description, category (3 min)
2. **Objectives** - Learning goals (5 min)
3. **Content** - DO→EXPLAIN→CHECK→REINFORCE blocks (15 min)
4. **Settings** - Educational parameters (3 min)
5. **Review** - Preview and publish (2 min)

**For Campaigns:**
1. **Basics** - Campaign information (3 min)
2. **Prizes** - Reward configuration (5 min)
3. **Rules** - Eligibility conditions (8 min)
4. **Window** - Time constraints (3 min)
5. **Protection** - Anti-abuse settings (3 min)
6. **Publish** - Review and launch (2 min)

### 2. RuleBuilder (`RuleBuilder.tsx`)

Visual drag-and-drop rule builder for JsonLogic conditions.

```typescript
interface RuleBuilderProps {
  initialRule?: JsonLogicRule;
  availableFields?: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    description?: string;
  }>;
  onChange?: (rule: JsonLogicRule) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
  readonly?: boolean;
  showPreview?: boolean;
}

// Usage
<RuleBuilder
  availableFields={[
    { name: 'holding_days', label: 'Days Holding', type: 'number' },
    { name: 'has_nft', label: 'Has NFT', type: 'boolean' }
  ]}
  onChange={(rule) => {
    console.log('JsonLogic:', rule.logic);
    console.log('Human readable:', rule.humanReadable);
  }}
  showPreview={true}
/>
```

#### Features
- **Nested Groups**: AND/OR conditions up to 2 levels
- **Field Types**: string, number, boolean, date
- **Operators**: ==, !=, >, <, >=, <=, in, !in
- **Lock/Unlock**: Protect conditions from changes
- **Live Preview**: JSON and human-readable text
- **Validation**: Real-time error checking

---

## 📝 CONTENT CREATION PROCESS

### Mandatory Pattern: DO→EXPLAIN→CHECK→REINFORCE

Every lesson MUST follow this exact pattern:

```typescript
const LESSON_STRUCTURE = {
  // Block 1: DO (25-35% of time)
  DO: {
    purpose: 'Hands-on action',
    examples: [
      'Connect wallet',
      'Scan QR code',
      'Make transaction',
      'Create NFT'
    ],
    requirements: {
      interactive: true,
      realAction: true,
      immediateResult: true
    }
  },
  
  // Block 2: EXPLAIN (25-35% of time)
  EXPLAIN: {
    purpose: 'Understanding why',
    examples: [
      'How gas works',
      'What are NFTs',
      'Blockchain basics'
    ],
    requirements: {
      visual: true,
      simple: true,
      analogies: true
    }
  },
  
  // Block 3: CHECK (20-25% of time)
  CHECK: {
    purpose: 'Verify understanding',
    formats: [
      'Multiple choice',
      'True/false',
      'Drag and drop',
      'Fill in blank'
    ],
    requirements: {
      interactive: true,
      feedback: true,
      retry: true
    }
  },
  
  // Block 4: REINFORCE (15-20% of time)
  REINFORCE: {
    purpose: 'Consolidate learning',
    components: [
      'Key takeaways',
      'Achievement',
      'Next steps',
      'Share progress'
    ],
    requirements: {
      celebration: true,
      summary: true,
      continuation: true
    }
  }
};
```

### Content Block Types

```typescript
// DO Block
interface DoBlock {
  type: 'do';
  id: string;
  title: string;
  instruction: string;
  interactionType: 'wallet-connect' | 'qr-scan' | 'transaction' | 'nft-create';
  data: {
    endpoint?: string;
    parameters?: Record<string, any>;
    expectedResult?: any;
  };
  duration: number; // seconds
}

// EXPLAIN Block
interface ExplainBlock {
  type: 'explain';
  id: string;
  title: string;
  concept: string;
  explanation: string;
  visuals?: {
    type: 'image' | 'video' | 'animation' | 'diagram';
    url: string;
    alt: string;
  }[];
  analogies?: string[];
  duration: number;
}

// CHECK Block
interface CheckBlock {
  type: 'check';
  id: string;
  title: string;
  questionType: 'multiple-choice' | 'true-false' | 'drag-drop' | 'fill-blank';
  question: {
    text: string;
    options?: Array<{
      text: string;
      isCorrect: boolean;
      feedback?: string;
    }>;
    correctAnswer?: string;
  };
  hints?: string[];
  duration: number;
}

// REINFORCE Block
interface ReinforceBlock {
  type: 'reinforce';
  id: string;
  title: string;
  summary: string;
  keyPoints: string[]; // Max 3
  achievement?: {
    name: string;
    icon: string;
    points: number;
  };
  nextSteps: string;
  shareTemplate?: string;
  duration: number;
}
```

---

## ⚙️ JSONLOGIC RULE ENGINE

### Overview

The JsonLogic engine enables visual creation of complex eligibility rules.

```typescript
// Engine instance
import { jsonLogicEngine } from '@/lib/creator-studio/jsonLogicEngine';

// Add a rule
jsonLogicEngine.addRule('campaign_001', {
  logic: {
    and: [
      { ">=": [{ "var": "holding_days" }, 7] },
      { ">": [{ "var": "swaps_count" }, 0] }
    ]
  },
  humanReadable: 'Hold for 7+ days AND made at least 1 swap',
  variables: [
    { name: 'holding_days', type: 'number', description: 'Days holding tokens' },
    { name: 'swaps_count', type: 'number', description: 'Number of swaps' }
  ]
});

// Evaluate rule
const result = jsonLogicEngine.evaluate('campaign_001', {
  customData: {
    holding_days: 10,
    swaps_count: 3
  }
});

console.log(result.passed); // true
```

### Custom Operators

```typescript
// Available custom operators
const CUSTOM_OPERATORS = {
  wallet_age_days: (wallet: string) => number,
  token_balance: (address: string, token: string) => number,
  has_nft: (address: string, collection: string) => boolean,
  days_since: (timestamp: string) => number
};

// Usage in rules
{
  ">=": [
    { "wallet_age_days": { "var": "wallet_address" } },
    30
  ]
}
```

### Rule Builder Helper

```typescript
import { RuleBuilder } from '@/lib/creator-studio/jsonLogicEngine';

// Programmatic rule creation
const rule = new RuleBuilder()
  .where('holding_days', '>=', 7)
  .and(
    new RuleBuilder().where('swaps_count', '>', 0)
  )
  .or(
    new RuleBuilder().where('is_vip', '==', true)
  )
  .build();

console.log(rule.humanReadable);
// (holding_days >= 7) Y (swaps_count > 0) O (is_vip == true)
```

---

## 📚 TEMPLATES SYSTEM

### Template Structure

```typescript
interface Template {
  id: string;
  type: 'lesson' | 'campaign';
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  tags: string[];
  data: Partial<LessonCreatorData | CampaignCreatorData>;
}
```

### Available Templates

#### Lesson Templates
1. **🚀 Onboarding Express** - 5-minute intro to crypto
2. **📖 Micro-lesson 5min** - Quick single concept
3. **🎯 Tutorial Práctico** - Step-by-step guide
4. **🏆 Desafío Semanal** - Weekly challenge
5. **💡 Concepto Profundo** - Deep dive topic

#### Campaign Templates
1. **⚡ Onboard 48h** - New user onboarding
2. **💎 Hold 7D + 1 Swap** - Retention campaign
3. **🌟 Top 10 Referrals 72h** - Referral contest
4. **🎁 Claim Daily 30D** - Daily engagement
5. **🏅 Power User 7D** - Advanced users

### Using Templates

```typescript
import { getPopularTemplates, getTemplateById } from '@/lib/creator-studio/templates';

// Get all templates
const templates = getPopularTemplates();

// Get specific template
const onboardingTemplate = getTemplateById('template_onboarding_express');

// Apply template to wizard
<CreatorWizard
  type="lesson"
  templateData={onboardingTemplate.data}
  onComplete={handleComplete}
/>
```

---

## 📡 API REFERENCE

### Types

```typescript
// Main content types
type LessonCreatorData = {
  metadata: LessonMetadata;
  learningObjectives: string[];
  prerequisites: string[];
  contentBlocks: ContentBlock[];
  assessments: Assessment[];
  gamification: GamificationSettings;
  knowledgeSettings: KnowledgeSettings;
};

type CampaignCreatorData = {
  metadata: CampaignMetadata;
  prizes: PrizePool;
  eligibilityRules: JsonLogicRule[];
  timeWindow: TimeWindow;
  antiAbuseSettings: AntiAbuseSettings;
  trackingSettings: TrackingSettings;
};
```

### Validation Schemas

```typescript
import { 
  LessonCreatorDataSchema,
  CampaignCreatorDataSchema 
} from '@/lib/creator-studio/validation';

// Validate lesson
const result = LessonCreatorDataSchema.safeParse(lessonData);
if (!result.success) {
  console.error('Validation errors:', result.error);
}

// Validate campaign
const campaignResult = CampaignCreatorDataSchema.safeParse(campaignData);
```

### Utility Functions

```typescript
import * as utils from '@/lib/creator-studio/utils';

// ID Generation
const lessonId = utils.generateLessonId('My Awesome Lesson');
// Output: lesson_my-awesome-lesson_abc123_xyz789

// Block Management
const emptyDoBlock = utils.createEmptyBlock('do');
const duplicatedBlock = utils.duplicateBlock(existingBlock);
const reorderedBlocks = utils.reorderBlocks(blocks, 0, 2);

// Duration Calculations
const totalDuration = utils.calculateTotalDuration(blocks); // seconds
const formatted = utils.formatDuration(420); // "7m"
const readingTime = utils.estimateReadingTime(text); // seconds

// JsonLogic Helpers
const simpleRule = utils.createSimpleRule('age', '>=', 18);
const combinedRule = utils.combineRules([rule1, rule2], 'and');

// Storage
utils.saveToLocalStorage('draft_lesson', lessonData);
const draft = utils.loadFromLocalStorage('draft_lesson');
utils.clearLocalStorage('draft_lesson');

// Analytics
utils.trackEvent('lesson_created', { lessonId, title });
utils.trackWizardStep('content_blocks', 3, blockData);
utils.trackTemplateUsed('onboarding_express', 'lesson');
```

---

## 💡 BEST PRACTICES

### 1. Content Creation

```typescript
const CONTENT_BEST_PRACTICES = {
  // Structure
  structure: {
    pattern: 'ALWAYS use DO→EXPLAIN→CHECK→REINFORCE',
    duration: 'Keep between 5-15 minutes',
    blocks: 'Exactly 4 blocks, no more, no less'
  },
  
  // Writing
  writing: {
    language: 'Simple Spanish, 8th grade level',
    tone: 'Friendly, direct, encouraging',
    examples: 'Use real blockchain examples',
    jargon: 'Explain all technical terms'
  },
  
  // Interactivity
  interactivity: {
    DO: 'Real blockchain action, not simulation',
    CHECK: 'Immediate feedback on answers',
    hints: 'Progressive hints for wrong answers',
    retry: 'Allow unlimited retries'
  },
  
  // Visuals
  visuals: {
    minimum: 'At least 1 per block',
    format: 'PNG/JPG/GIF, max 2MB',
    alt: 'Descriptive alt text required',
    responsive: 'Test on mobile devices'
  }
};
```

### 2. Campaign Rules

```typescript
const CAMPAIGN_BEST_PRACTICES = {
  // Rules
  rules: {
    complexity: 'Start simple, max 3 conditions',
    testing: 'Test with edge cases',
    documentation: 'Explain rules clearly to users',
    fairness: 'Ensure equal opportunity'
  },
  
  // Prizes
  prizes: {
    distribution: 'Clear criteria for winners',
    transparency: 'Show prize pool publicly',
    automation: 'Automate distribution when possible',
    verification: 'Require claim within timeframe'
  },
  
  // Anti-Abuse
  antiAbuse: {
    sybil: 'Implement wallet age checks',
    farming: 'Limit actions per time period',
    verification: 'Consider human verification',
    monitoring: 'Track suspicious patterns'
  }
};
```

### 3. Performance

```typescript
const PERFORMANCE_TIPS = {
  // Optimization
  optimization: {
    images: 'Compress and lazy load',
    code: 'Split chunks by route',
    caching: 'Use localStorage for drafts',
    api: 'Batch API calls when possible'
  },
  
  // Validation
  validation: {
    client: 'Validate on input for UX',
    server: 'Always validate on server',
    schema: 'Use Zod for type safety',
    errors: 'Show clear error messages'
  },
  
  // Testing
  testing: {
    unit: 'Test individual blocks',
    integration: 'Test full lesson flow',
    mobile: 'Test on real devices',
    accessibility: 'Run a11y audits'
  }
};
```

### 4. Error Handling

```typescript
// Proper error handling example
try {
  // Save lesson
  const result = await saveLessonToBackend(lessonData);
  
  if (result.success) {
    // Success feedback
    showNotification('Lesson published successfully!', 'success');
    router.push('/knowledge?tab=my-content');
  } else {
    // Handle API errors
    showNotification(result.error.message, 'error');
    console.error('Save failed:', result.error);
  }
} catch (error) {
  // Handle network errors
  showNotification('Network error. Draft saved locally.', 'warning');
  utils.saveToLocalStorage('emergency_draft', lessonData);
  console.error('Network error:', error);
}
```

---

## 🚀 NEXT STEPS

1. **Implement Step Components** - Build specific UI for each wizard step
2. **Backend Integration** - Connect to API for persistence
3. **Preview System** - Interactive preview before publishing
4. **Analytics Dashboard** - Real-time metrics visualization
5. **AI Assistant** - Content generation helper
6. **Collaboration** - Multi-author support
7. **Versioning** - Content version control
8. **Marketplace** - Share/sell templates

---

## 📚 RELATED DOCUMENTATION

- [Knowledge Architecture](../KNOWLEDGE_ARCHITECTURE.md)
- [Development Guide](../../../../DEVELOPMENT.md)
- [API Documentation](../../../../API.md)
- [Testing Guide](../../../../TESTING.md)

---

*Made by mbxarts.com The Moon in a Box property*
*Co-Author: Godez22*