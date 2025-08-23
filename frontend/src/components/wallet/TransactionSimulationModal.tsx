/**
 * Transaction Simulation Modal
 * Mobile-first UI for transaction preview and risk assessment
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { simulateTransaction } from '@/lib/simulation/service';
import { 
  type SimulationResult,
  formatBalanceChange,
  calculateTransactionRisk,
  getSimulationConfig,
} from '@/lib/simulation/config';
import type { SimulationRequest } from '@/lib/simulation/adapters/base';

interface TransactionSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  request: SimulationRequest;
  title?: string;
  description?: string;
}

export function TransactionSimulationModal({
  isOpen,
  onClose,
  onConfirm,
  request,
  title = 'Transaction Preview',
  description = 'Review the expected outcomes before signing',
}: TransactionSimulationModalProps) {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  
  const config = getSimulationConfig();
  
  useEffect(() => {
    if (isOpen && request) {
      runSimulation();
    }
  }, [isOpen, request]);
  
  const runSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    
    try {
      const result = await simulateTransaction(request);
      setSimulationResult(result);
      
      // Auto-expand details if there are risks
      if (result.risks.length > 0) {
        setShowDetails(true);
      }
    } catch (err: any) {
      console.error('Simulation failed:', err);
      setError(err.message || 'Failed to simulate transaction');
    } finally {
      setIsSimulating(false);
    }
  };
  
  if (!isOpen) return null;
  
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'danger':
        return <XCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'info':
        return <AlertCircle className="text-blue-500" size={20} />;
      default:
        return <CheckCircle className="text-green-500" size={20} />;
    }
  };
  
  const getStatusColor = (success: boolean) => {
    return success ? '#10b981' : '#ef4444';
  };
  
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                {title}
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                {description}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '4px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div style={{ padding: '20px' }}>
          {isSimulating && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              gap: '16px',
            }}>
              <Loader2 size={32} className="animate-spin" color="#3b82f6" />
              <p style={{ color: '#6b7280' }}>Simulating transaction...</p>
            </div>
          )}
          
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}>
                <XCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#dc2626', fontWeight: 500, marginBottom: '4px' }}>
                    Simulation Error
                  </p>
                  <p style={{ fontSize: '14px', color: '#dc2626' }}>
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {simulationResult && (
            <>
              {/* Status */}
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: simulationResult.success 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${simulationResult.success 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'rgba(239, 68, 68, 0.2)'}`,
                marginBottom: '16px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {simulationResult.success ? (
                    <CheckCircle size={20} color="#22c55e" />
                  ) : (
                    <XCircle size={20} color="#ef4444" />
                  )}
                  <span style={{
                    fontWeight: 500,
                    color: getStatusColor(simulationResult.success),
                  }}>
                    {simulationResult.success 
                      ? 'Transaction will succeed' 
                      : 'Transaction will fail'}
                  </span>
                </div>
                {simulationResult.revertReason && (
                  <p style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#dc2626',
                  }}>
                    Reason: {simulationResult.revertReason}
                  </p>
                )}
              </div>
              
              {/* Risks */}
              {simulationResult.risks.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Shield size={18} />
                    Risk Assessment
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {simulationResult.risks.map((risk, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'flex-start',
                        }}>
                          {getRiskIcon(risk.level)}
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                              {risk.title}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                              {risk.description}
                            </p>
                            {risk.mitigation && (
                              <p style={{ fontSize: '12px', color: '#3b82f6' }}>
                                💡 {risk.mitigation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Gas Estimation */}
              {config.showGas && simulationResult.gasEstimate && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  marginBottom: '16px',
                }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}>
                    Estimated Cost
                  </h3>
                  <div style={{ fontSize: '14px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}>
                      <span style={{ color: '#6b7280' }}>Gas:</span>
                      <span>{simulationResult.gasEstimate.toString()}</span>
                    </div>
                    {simulationResult.totalCost && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '4px',
                        borderTop: '1px solid #e5e7eb',
                      }}>
                        <span style={{ color: '#6b7280' }}>Total:</span>
                        <span style={{ fontWeight: 500 }}>
                          {(Number(simulationResult.totalCost) / 1e18).toFixed(6)} ETH
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Balance Changes */}
              {config.showBalances && simulationResult.balanceChanges.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    Balance Changes
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {simulationResult.balanceChanges.map((change, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                          {change.address.slice(0, 6)}...{change.address.slice(-4)}
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: change.diff > 0n ? '#22c55e' : '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          {change.diff > 0n ? (
                            <TrendingUp size={16} />
                          ) : (
                            <TrendingDown size={16} />
                          )}
                          {formatBalanceChange(change)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Approvals Detected */}
              {config.showApprovals && simulationResult.approvalsDetected.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertTriangle size={18} color="#f59e0b" />
                    Approvals Detected
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {simulationResult.approvalsDetected.map((approval, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                        }}
                      >
                        <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <span style={{ color: '#6b7280' }}>Token: </span>
                          <span style={{ fontWeight: 500 }}>{approval.symbol || 'Unknown'}</span>
                        </p>
                        <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <span style={{ color: '#6b7280' }}>Spender: </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {approval.spender.slice(0, 10)}...
                          </span>
                        </p>
                        {approval.amount && (
                          <p style={{ fontSize: '14px' }}>
                            <span style={{ color: '#6b7280' }}>Amount: </span>
                            <span style={{ fontWeight: 500 }}>
                              {approval.amount === 2n ** 256n - 1n ? 'Unlimited' : approval.amount.toString()}
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Advanced Details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '14px',
                  marginBottom: showDetails ? '12px' : 0,
                }}
              >
                <span>Advanced Details</span>
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showDetails && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  marginBottom: '16px',
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>To:</strong> {request.to}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Data:</strong> {request.data.slice(0, 42)}...
                  </div>
                  {request.value && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Value:</strong> {request.value.toString()} wei
                    </div>
                  )}
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {showRawData ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showRawData ? 'Hide' : 'Show'} Raw Data
                  </button>
                  {showRawData && simulationResult.raw && (
                    <pre style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      fontSize: '10px',
                    }}>
                      {JSON.stringify(simulationResult.raw, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSimulating || (simulationResult && !simulationResult.success)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: simulationResult?.success === false ? '#e5e7eb' : '#3b82f6',
              color: simulationResult?.success === false ? '#9ca3af' : 'white',
              cursor: simulationResult?.success === false ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {simulationResult?.success === false ? 'Cannot Proceed' : 'Confirm Transaction'}
          </button>
        </div>
      </div>
    </>
  );
}