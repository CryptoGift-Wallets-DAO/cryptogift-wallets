/**
 * Transaction History Component
 * Mobile-first consolidated transaction display
 */

'use client';

import React, { useState } from 'react';
import {
  Clock,
  Send,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Coins,
} from 'lucide-react';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { TransactionType, TransactionStatus } from '@/lib/history/config';
import { groupTransactionsByDate } from '@/lib/history/formatter';

interface TransactionHistoryProps {
  className?: string;
  compactMode?: boolean;
}

export function TransactionHistory({
  className = '',
  compactMode = false,
}: TransactionHistoryProps) {
  const {
    isEnabled,
    isLoading,
    transactions,
    error,
    hasMore,
    address,
    chainId,
    chainName,
    refresh,
    loadMore,
    filterTransactions,
    exportTransactions,
  } = useTransactionHistory();
  
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    direction: 'all' as 'sent' | 'received' | 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  if (!isEnabled) return null;
  
  if (!address || !chainId) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: '#6b7280',
      }}>
        <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <p>Connect wallet to view transaction history</p>
      </div>
    );
  }
  
  const filteredTxs = filterTransactions(filter);
  const groupedTxs = groupTransactionsByDate(filteredTxs);
  
  const copyToClipboard = async (text: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };
  
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.ERC20:
        return <Coins size={16} />;
      case TransactionType.ERC721:
      case TransactionType.ERC1155:
        return <ImageIcon size={16} />;
      default:
        return <FileText size={16} />;
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            Transaction History
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
          }}>
            {chainName} • {filteredTxs.length} transactions
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            <Filter size={16} />
            {!compactMode && 'Filter'}
          </button>
          
          <button
            onClick={refresh}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {!compactMode && 'Refresh'}
          </button>
          
          <button
            onClick={() => exportTransactions('csv')}
            disabled={filteredTxs.length === 0}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: filteredTxs.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            <Download size={16} />
            {!compactMode && 'Export'}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: compactMode ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            <div>
              <label style={{
                fontSize: '12px',
                color: '#6b7280',
                display: 'block',
                marginBottom: '4px',
              }}>
                Direction
              </label>
              <select
                value={filter.direction}
                onChange={(e) => setFilter({ ...filter, direction: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '14px',
                }}
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
              </select>
            </div>
            
            <div>
              <label style={{
                fontSize: '12px',
                color: '#6b7280',
                display: 'block',
                marginBottom: '4px',
              }}>
                Type
              </label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '14px',
                }}
              >
                <option value="">All Types</option>
                <option value={TransactionType.NATIVE}>Native</option>
                <option value={TransactionType.ERC20}>Token</option>
                <option value={TransactionType.ERC721}>NFT</option>
              </select>
            </div>
            
            <div>
              <label style={{
                fontSize: '12px',
                color: '#6b7280',
                display: 'block',
                marginBottom: '4px',
              }}>
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '14px',
                }}
              >
                <option value="">All Status</option>
                <option value={TransactionStatus.SUCCESS}>Success</option>
                <option value={TransactionStatus.FAILED}>Failed</option>
                <option value={TransactionStatus.PENDING}>Pending</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px' }}>{error}</p>
        </div>
      )}
      
      {/* Transaction List */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white',
        overflow: 'hidden',
      }}>
        {isLoading && filteredTxs.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
          }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280' }}>Loading transactions...</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
          }}>
            <Clock size={32} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ color: '#6b7280' }}>No transactions found</p>
          </div>
        ) : (
          <>
            {Array.from(groupedTxs.entries()).map(([date, txs]) => (
              <div key={date}>
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#6b7280',
                }}>
                  {date}
                </div>
                
                {txs.map((tx, idx) => {
                  const isExpanded = expandedTx === tx.hash;
                  const isSent = address && tx.from.toLowerCase() === address.toLowerCase();
                  
                  return (
                    <div
                      key={tx.hash}
                      style={{
                        borderBottom: idx < txs.length - 1 ? '1px solid #e5e7eb' : 'none',
                      }}
                    >
                      <div
                        onClick={() => setExpandedTx(isExpanded ? null : tx.hash)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: isSent ? '#fee2e2' : '#dcfce7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {isSent ? (
                                <ArrowUpRight size={16} color="#dc2626" />
                              ) : (
                                <ArrowDownLeft size={16} color="#16a34a" />
                              )}
                            </div>
                            
                            <div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '2px',
                              }}>
                                <span style={{
                                  fontWeight: 500,
                                  fontSize: '14px',
                                }}>
                                  {isSent ? `To ${tx.toShort || 'Contract'}` : `From ${tx.fromShort}`}
                                </span>
                                {getTransactionIcon(tx.type as TransactionType)}
                              </div>
                              <span style={{
                                fontSize: '12px',
                                color: '#6b7280',
                              }}>
                                {tx.relativeTime} • {tx.typeLabel}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{
                            textAlign: 'right',
                          }}>
                            <div style={{
                              fontWeight: 500,
                              fontSize: '14px',
                              marginBottom: '2px',
                            }}>
                              {tx.tokenInfo?.formattedAmount || tx.formattedValue}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              justifyContent: 'flex-end',
                            }}>
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: tx.statusColor,
                                }}
                              />
                              <span style={{
                                fontSize: '12px',
                                color: '#6b7280',
                              }}>
                                {tx.statusLabel}
                              </span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                        }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: compactMode ? '1fr' : 'repeat(2, 1fr)',
                            gap: '12px',
                            fontSize: '14px',
                          }}>
                            <div>
                              <span style={{ color: '#6b7280' }}>Transaction Hash:</span>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '4px',
                              }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                  {tx.shortHash}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(tx.hash, tx.hash);
                                  }}
                                  style={{
                                    padding: '2px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {copiedHash === tx.hash ? (
                                    <Check size={14} color="#10b981" />
                                  ) : (
                                    <Copy size={14} color="#6b7280" />
                                  )}
                                </button>
                                {tx.explorerUrl && (
                                  <a
                                    href={tx.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      color: '#3b82f6',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <span style={{ color: '#6b7280' }}>Time:</span>
                              <div style={{ marginTop: '4px' }}>
                                {tx.formattedTime}
                              </div>
                            </div>
                            
                            <div>
                              <span style={{ color: '#6b7280' }}>From:</span>
                              <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                                {tx.fromShort}
                              </div>
                            </div>
                            
                            <div>
                              <span style={{ color: '#6b7280' }}>To:</span>
                              <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                                {tx.toShort || 'Contract Creation'}
                              </div>
                            </div>
                            
                            {tx.tokenInfo && (
                              <>
                                <div>
                                  <span style={{ color: '#6b7280' }}>Token:</span>
                                  <div style={{ marginTop: '4px' }}>
                                    {tx.tokenInfo.symbol || 'Unknown'}
                                  </div>
                                </div>
                                
                                {tx.tokenInfo.tokenId && (
                                  <div>
                                    <span style={{ color: '#6b7280' }}>Token ID:</span>
                                    <div style={{ marginTop: '4px' }}>
                                      #{tx.tokenInfo.tokenId}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            <div>
                              <span style={{ color: '#6b7280' }}>Gas Used:</span>
                              <div style={{ marginTop: '4px' }}>
                                {tx.formattedGas} ETH
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Load More */}
            {hasMore && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                borderTop: '1px solid #e5e7eb',
              }}>
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: 'white',
                    color: '#3b82f6',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}