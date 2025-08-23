/**
 * Approvals Manager Component
 * Mobile-first UI for viewing and revoking token approvals
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Info,
  ExternalLink,
  Copy,
  X,
} from 'lucide-react';
import { useApprovals } from '@/hooks/useApprovals';
import { formatApproval, isHighRiskApproval } from '@/lib/approvals/revoker';
import type { TokenApproval } from '@/lib/approvals/scanner';

interface ApprovalsManagerProps {
  className?: string;
  compactMode?: boolean;
}

export function ApprovalsManager({ 
  className = '',
  compactMode = false 
}: ApprovalsManagerProps) {
  const {
    approvals,
    isScanning,
    error,
    progress,
    lastScan,
    scanApprovals,
    cancelScan,
    revokeApproval,
    batchRevokeApprovals,
    isEnabled,
  } = useApprovals();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  
  // Filter approvals based on search and risk
  const filteredApprovals = useMemo(() => {
    return approvals.filter(approval => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !approval.tokenSymbol?.toLowerCase().includes(query) &&
          !approval.tokenName?.toLowerCase().includes(query) &&
          !approval.spenderInfo.label.toLowerCase().includes(query) &&
          !approval.spender.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // Risk filter
      if (filterRisk !== 'all') {
        if (filterRisk === 'high' && approval.riskLevel !== 'high' && approval.riskLevel !== 'critical') {
          return false;
        }
        if (filterRisk === 'medium' && approval.riskLevel !== 'medium') {
          return false;
        }
        if (filterRisk === 'low' && approval.riskLevel !== 'low') {
          return false;
        }
      }
      
      return true;
    });
  }, [approvals, searchQuery, filterRisk]);
  
  // Group approvals by token
  const groupedApprovals = useMemo(() => {
    const groups = new Map<string, typeof filteredApprovals>();
    
    filteredApprovals.forEach(approval => {
      const key = approval.token;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(approval);
    });
    
    return groups;
  }, [filteredApprovals]);
  
  if (!isEnabled) {
    return null;
  }
  
  const handleRevoke = async (approval: TokenApproval) => {
    setIsRevoking(true);
    try {
      await revokeApproval(approval);
    } finally {
      setIsRevoking(false);
    }
  };
  
  const handleBatchRevoke = async () => {
    if (selectedApprovals.size === 0) return;
    
    setIsRevoking(true);
    try {
      const toRevoke = approvals.filter(a => {
        const key = getApprovalKey(a);
        return selectedApprovals.has(key);
      });
      
      await batchRevokeApprovals(toRevoke);
      setSelectedApprovals(new Set());
    } finally {
      setIsRevoking(false);
    }
  };
  
  const getApprovalKey = (approval: TokenApproval): string => {
    return `${approval.token}-${approval.spender}-${approval.tokenId || 'all'}`;
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      case 'trusted': return '#3b82f6';
      default: return '#9ca3af';
    }
  };
  
  const getRiskBgColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'rgba(239, 68, 68, 0.1)';
      case 'high': return 'rgba(245, 158, 11, 0.1)';
      case 'medium': return 'rgba(234, 179, 8, 0.1)';
      case 'low': return 'rgba(34, 197, 94, 0.1)';
      case 'trusted': return 'rgba(59, 130, 246, 0.1)';
      default: return 'rgba(156, 163, 175, 0.1)';
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: compactMode ? 'row' : 'column',
        gap: '16px',
        alignItems: compactMode ? 'center' : 'stretch',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
            Token Approvals
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Manage and revoke token spending permissions
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedApprovals.size > 0 && (
            <button
              onClick={handleBatchRevoke}
              disabled={isRevoking}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                cursor: isRevoking ? 'not-allowed' : 'pointer',
                opacity: isRevoking ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <XCircle size={16} />
              Revoke {selectedApprovals.size} Selected
            </button>
          )}
          
          <button
            onClick={() => scanApprovals({ forceRefresh: true })}
            disabled={isScanning}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {isScanning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div style={{
        display: 'flex',
        flexDirection: compactMode ? 'row' : 'column',
        gap: '12px',
      }}>
        {/* Search */}
        <div style={{
          flex: 1,
          position: 'relative',
        }}>
          <Search 
            size={16} 
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
          />
          <input
            type="text"
            placeholder="Search tokens, spenders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
            }}
          />
        </div>
        
        {/* Risk Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          {(['all', 'high', 'medium', 'low'] as const).map(risk => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: filterRisk === risk ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                backgroundColor: filterRisk === risk ? 'rgba(59, 130, 246, 0.1)' : 'white',
                color: filterRisk === risk ? '#3b82f6' : '#6b7280',
                fontSize: '14px',
                fontWeight: filterRisk === risk ? 500 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {risk === 'all' ? 'All' : risk} Risk
            </button>
          ))}
        </div>
      </div>
      
      {/* Progress Bar */}
      {isScanning && progress && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#f3f4f6',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '12px',
            color: '#6b7280',
          }}>
            <span>Scanning blocks...</span>
            <span>{Math.round((Number(progress.scannedBlocks) / Number(progress.totalBlocks)) * 100)}%</span>
          </div>
          <div style={{
            height: '4px',
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#3b82f6',
              width: `${(Number(progress.scannedBlocks) / Number(progress.totalBlocks)) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}
      
      {/* Approvals List */}
      <div style={{
        maxHeight: compactMode ? '400px' : 'auto',
        overflowY: 'auto',
      }}>
        {error && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#dc2626',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}
        
        {filteredApprovals.length === 0 && !isScanning && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#9ca3af',
          }}>
            <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No active approvals found</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Your tokens are safe with no external spending permissions
            </p>
          </div>
        )}
        
        {Array.from(groupedApprovals.entries()).map(([token, tokenApprovals]) => (
          <div
            key={token}
            style={{
              marginBottom: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Token Header */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>
                    {tokenApprovals[0].tokenSymbol || 'Unknown'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                    {tokenApprovals[0].tokenName}
                  </span>
                </div>
                <span style={{
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  {tokenApprovals.length} approval{tokenApprovals.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {/* Approvals */}
            {tokenApprovals.map(approval => {
              const key = getApprovalKey(approval);
              const isSelected = selectedApprovals.has(key);
              const isShowingDetails = showDetails === key;
              
              return (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'white',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const newSelected = new Set(selectedApprovals);
                        if (isSelected) {
                          newSelected.delete(key);
                        } else {
                          newSelected.add(key);
                        }
                        setSelectedApprovals(newSelected);
                      }}
                      style={{
                        marginTop: '2px',
                        cursor: 'pointer',
                      }}
                    />
                    
                    {/* Approval Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: getRiskBgColor(approval.riskLevel),
                          color: getRiskColor(approval.riskLevel),
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}>
                          {approval.riskLevel} Risk
                        </span>
                        
                        {approval.spenderInfo.isKnown && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            fontSize: '12px',
                          }}>
                            {approval.spenderInfo.label}
                          </span>
                        )}
                      </div>
                      
                      <div style={{
                        fontSize: '14px',
                        marginBottom: '4px',
                      }}>
                        <span style={{ color: '#6b7280' }}>Spender: </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {approval.spender.slice(0, 6)}...{approval.spender.slice(-4)}
                        </span>
                      </div>
                      
                      <div style={{
                        fontSize: '14px',
                        color: '#374151',
                      }}>
                        <span style={{ color: '#6b7280' }}>Allowance: </span>
                        <span style={{ fontWeight: 500 }}>
                          {formatApproval(approval)}
                        </span>
                      </div>
                      
                      {isShowingDetails && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#6b7280' }}>Transaction: </span>
                            <a
                              href={`https://etherscan.io/tx/${approval.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#3b82f6',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {approval.transactionHash.slice(0, 10)}...
                              <ExternalLink size={10} />
                            </a>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Block: </span>
                            <span>{approval.blockNumber.toString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                    }}>
                      <button
                        onClick={() => setShowDetails(isShowingDetails ? null : key)}
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Info size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleRevoke(approval)}
                        disabled={isRevoking}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          cursor: isRevoking ? 'not-allowed' : 'pointer',
                          opacity: isRevoking ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        <X size={14} />
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Last Scan Info */}
      {lastScan && (
        <div style={{
          padding: '8px',
          borderRadius: '4px',
          backgroundColor: '#f9fafb',
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
        }}>
          Last scanned: {new Date(lastScan).toLocaleString()}
        </div>
      )}
    </div>
  );
}