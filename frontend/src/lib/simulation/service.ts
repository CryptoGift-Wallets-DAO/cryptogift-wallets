/**
 * Transaction Simulation Service
 * Manages adapters and provides fallback logic
 */

import { SimulationAdapter, type SimulationRequest } from './adapters/base';
import { LocalSimulationAdapter } from './adapters/local';
import { TenderlySimulationAdapter } from './adapters/tenderly';
import { 
  getSimulationConfig, 
  type SimulationResult,
  type SimulationBackend,
} from './config';

export class SimulationService {
  private adapters: Map<SimulationBackend, SimulationAdapter> = new Map();
  private config = getSimulationConfig();
  
  constructor() {
    this.initializeAdapters();
  }
  
  private initializeAdapters() {
    // Always initialize local adapter as fallback
    this.adapters.set('local', new LocalSimulationAdapter(this.config.timeout));
    
    // Initialize Tenderly if configured
    if (this.config.backend === 'tenderly' && this.config.tenderly) {
      this.adapters.set('tenderly', new TenderlySimulationAdapter(
        this.config.timeout,
        this.config.tenderly
      ));
    }
    
    // Defender adapter would go here when implemented
  }
  
  /**
   * Simulate a transaction with automatic fallback
   */
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    // Try primary backend first
    const primaryAdapter = this.adapters.get(this.config.backend);
    
    if (primaryAdapter) {
      try {
        const isAvailable = await primaryAdapter.isAvailable();
        if (isAvailable) {
          console.log(`Simulating with ${primaryAdapter.getName()}`);
          return await primaryAdapter.simulate(request);
        } else {
          console.warn(`${primaryAdapter.getName()} not available, falling back to local`);
        }
      } catch (error) {
        console.error(`${primaryAdapter.getName()} simulation failed:`, error);
        console.log('Falling back to local simulation');
      }
    }
    
    // Fallback to local simulation
    const localAdapter = this.adapters.get('local');
    if (!localAdapter) {
      throw new Error('Local simulation adapter not available');
    }
    
    try {
      return await localAdapter.simulate(request);
    } catch (error) {
      console.error('Local simulation also failed:', error);
      
      // Return a basic failure result
      return {
        success: false,
        revertReason: 'Simulation failed',
        balanceChanges: [],
        tokenChanges: [],
        approvalsDetected: [],
        risks: [{
          level: 'danger',
          title: 'Unable to simulate',
          description: 'Transaction simulation failed. Proceed with caution.',
          mitigation: 'Verify transaction parameters manually',
        }],
      };
    }
  }
  
  /**
   * Get available adapters
   */
  async getAvailableAdapters(): Promise<{
    name: string;
    backend: SimulationBackend;
    available: boolean;
  }[]> {
    const results = [];
    
    for (const [backend, adapter] of this.adapters.entries()) {
      const available = await adapter.isAvailable();
      results.push({
        name: adapter.getName(),
        backend,
        available,
      });
    }
    
    return results;
  }
  
  /**
   * Check if simulation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }
}

// Singleton instance
let simulationService: SimulationService | null = null;

/**
 * Get simulation service instance
 */
export function getSimulationService(): SimulationService {
  if (!simulationService) {
    simulationService = new SimulationService();
  }
  return simulationService;
}

/**
 * Simulate a transaction (convenience function)
 */
export async function simulateTransaction(
  request: SimulationRequest
): Promise<SimulationResult> {
  const service = getSimulationService();
  return service.simulate(request);
}