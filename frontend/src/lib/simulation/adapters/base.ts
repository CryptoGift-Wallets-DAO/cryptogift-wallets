/**
 * Base Simulation Adapter
 * Abstract class for simulation backends
 */

import type { SimulationResult } from '../config';
import type { Address } from 'viem';

export interface SimulationRequest {
  from: Address;
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  gas?: bigint;
  gasPrice?: bigint;
  chainId: number;
  blockNumber?: bigint;
}

export abstract class SimulationAdapter {
  protected timeout: number;
  
  constructor(timeout: number = 5000) {
    this.timeout = timeout;
  }
  
  /**
   * Simulate a transaction
   */
  abstract simulate(request: SimulationRequest): Promise<SimulationResult>;
  
  /**
   * Check if adapter is available
   */
  abstract isAvailable(): Promise<boolean>;
  
  /**
   * Get adapter name
   */
  abstract getName(): string;
  
  /**
   * Helper to create timeout promise
   */
  protected createTimeoutPromise<T>(): {
    promise: Promise<T>;
    timeoutId: NodeJS.Timeout;
  } {
    let timeoutId: NodeJS.Timeout;
    
    const promise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Simulation timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
    
    return { promise, timeoutId: timeoutId! };
  }
  
  /**
   * Race with timeout
   */
  protected async withTimeout<T>(operation: Promise<T>): Promise<T> {
    const { promise: timeoutPromise, timeoutId } = this.createTimeoutPromise<T>();
    
    try {
      const result = await Promise.race([operation, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}