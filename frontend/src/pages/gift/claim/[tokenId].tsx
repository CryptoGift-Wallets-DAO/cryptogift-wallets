import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import { ClaimEscrowInterface } from '../../../components/escrow/ClaimEscrowInterface';
import { EscrowGiftStatus } from '../../../components/escrow/EscrowGiftStatus';
import { PreClaimFlow } from '../../../components/education/PreClaimFlow';
import { EducationModule } from '../../../components/education/EducationModule';
import { LessonModalWrapperForEducation } from '../../../components/education/LessonModalWrapperForEducation';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../../app/client';
import { resolveIPFSUrlClient } from '../../../lib/clientMetadataStore';
import { NotificationProvider, useNotifications } from '../../../components/ui/NotificationSystem';
import { 
  loadClaimSession, 
  updateClaimSession,
  cleanupExpiredSessions 
} from '../../../lib/claimSessionStorage';

interface GiftInfo {
  creator: string;
  nftContract: string;
  expirationTime: number;
  status: 'active' | 'expired' | 'claimed' | 'returned';
  timeRemaining?: string;
  canClaim: boolean;
  isExpired: boolean;
}

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
}

// Claim flow states
enum ClaimFlowState {
  PRE_VALIDATION = 'pre_validation',
  EDUCATION = 'education', 
  CLAIM = 'claim',
  SUCCESS = 'success'
}

interface EducationSession {
  sessionToken: string;
  requiresEducation: boolean;
  requiredModules?: number[];
  currentModuleIndex?: number;
}

export default function ClaimGiftPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { tokenId } = router.query;
  
  const [giftInfo, setGiftInfo] = useState<GiftInfo | null>(null);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [claimed, setClaimed] = useState(false);
  
  // New states for education flow
  const [flowState, setFlowState] = useState<ClaimFlowState | null>(null); // Start with null to prevent race conditions
  const [educationSession, setEducationSession] = useState<EducationSession | null>(null);
  const [educationGateData, setEducationGateData] = useState<string>('0x'); // EIP-712 signature for education approval
  const [hasEducationRequirements, setHasEducationRequirements] = useState<boolean>(false);

  // Handle theme hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load gift information when page loads and recover session if exists
  useEffect(() => {
    if (tokenId && typeof tokenId === 'string') {
      // Clean up any expired sessions
      cleanupExpiredSessions();
      
      // Try to recover existing session
      const existingSession = loadClaimSession(tokenId);
      if (existingSession) {
        console.log('🔄 Recovering claim session:', {
          tokenId,
          flowState: existingSession.flowState,
          passwordValidated: existingSession.passwordValidated,
          educationCompleted: existingSession.educationCompleted,
          hasGateData: !!existingSession.educationGateData
        });
        
        // Restore session state based on where user left off
        if (existingSession.educationCompleted && existingSession.educationGateData) {
          // User completed education, go directly to claim
          setFlowState(ClaimFlowState.CLAIM);
          setEducationGateData(existingSession.educationGateData);
          setEducationSession({
            sessionToken: existingSession.sessionToken,
            requiresEducation: false,
            requiredModules: []
          });
        } else if (existingSession.passwordValidated && existingSession.requiresEducation) {
          // User validated password but didn't complete education
          setFlowState(ClaimFlowState.EDUCATION);
          setEducationSession({
            sessionToken: existingSession.sessionToken,
            requiresEducation: true,
            requiredModules: existingSession.educationModules,
            currentModuleIndex: existingSession.currentModuleIndex || 0
          });
        } else if (existingSession.passwordValidated && !existingSession.requiresEducation) {
          // User validated password and no education required
          setFlowState(ClaimFlowState.CLAIM);
          setEducationGateData('0x');
        }
        // If nothing validated yet, PreClaimFlow will handle recovery
      }
      
      loadGiftInfo(tokenId);
      checkGiftRequirements(tokenId);
    }
  }, [tokenId]);

  // Check if gift has education requirements (ALL gifts have passwords)
  const checkGiftRequirements = async (tokenId: string) => {
    try {
      const response = await fetch(`/api/gift-has-password?tokenId=${tokenId}`);
      const data = await response.json();
      
      console.log('🔐 Gift requirements check:', data);
      
      if (data.success) {
        // CORRECTED FINAL LOGIC:
        // - NO education → go directly to ClaimEscrowInterface (NO password pre-validation)
        // - HAS education → go to PreClaimFlow (password + bypass button)
        
        if (data.hasEducation) {
          console.log('📚 Gift has education requirements - showing password validation with bypass');
          setHasEducationRequirements(true);
          setFlowState(ClaimFlowState.PRE_VALIDATION);
        } else {
          console.log('✨ No education requirements - proceeding directly to claim');
          setHasEducationRequirements(false);
          setEducationGateData('0x'); // No gate data needed
          setFlowState(ClaimFlowState.CLAIM);
        }
      }
    } catch (error) {
      console.error('Failed to check gift requirements:', error);
      // Default to direct claim (safest option)
      setFlowState(ClaimFlowState.CLAIM);
    }
  };

  const loadGiftInfo = async (tokenId: string) => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Loading gift info for token:', tokenId);

      const response = await fetch(`/api/gift-info/${tokenId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load gift info: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load gift information');
      }

      console.log('✅ Gift info loaded:', result);
      setGiftInfo(result.gift);

      // Try to load NFT metadata (optional)
      loadNFTMetadata(result.gift.nftContract, tokenId);

    } catch (err: any) {
      console.error('❌ Failed to load gift info:', err);
      setError(err.message || 'Failed to load gift information');
    } finally {
      setLoading(false);
    }
  };

  const loadNFTMetadata = async (nftContract: string, tokenId: string) => {
    try {
      console.log('🎨 Loading NFT metadata for:', { nftContract, tokenId });
      
      // FIXED: Load real NFT metadata using the new API
      const metadataResponse = await fetch(`/api/nft/${nftContract}/${tokenId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (metadataResponse.ok) {
        const metadataResult = await metadataResponse.json();
        
        if (metadataResult.success) {
          console.log('✅ NFT metadata loaded:', metadataResult);
          
          // IPFS FIX: Convert ipfs:// URLs to HTTP gateway URLs
          let imageUrl = metadataResult.image;
          if (imageUrl && imageUrl.startsWith('ipfs://')) {
            imageUrl = resolveIPFSUrlClient(imageUrl);
            console.log('🔗 IPFS URL resolved:', metadataResult.image, '→', imageUrl);
          }
          
          setNftMetadata({
            name: metadataResult.name || `CryptoGift NFT #${tokenId}`,
            description: metadataResult.description || 'A secured gift NFT protected by temporal escrow',
            image: imageUrl
          });
        } else {
          console.warn('⚠️ No metadata available for this NFT');
          setNftMetadata({
            name: `CryptoGift NFT #${tokenId}`,
            description: 'A secured gift NFT protected by temporal escrow',
            image: undefined
          });
        }
      } else {
        console.warn('⚠️ Failed to fetch NFT metadata from API');
        // Fallback to default metadata
        setNftMetadata({
          name: `CryptoGift NFT #${tokenId}`,
          description: 'A secured gift NFT protected by temporal escrow',
          image: undefined
        });
      }

    } catch (error) {
      console.warn('⚠️ Could not load NFT metadata:', error);
      // Always set something to prevent null state
      setNftMetadata({
        name: `CryptoGift NFT #${tokenId}`,
        description: 'A secured gift NFT protected by temporal escrow',
        image: undefined
      });
    }
  };

  // Pre-claim validation handlers - FIXED to accept educationModules directly
  const handlePreClaimValidation = async (
    sessionToken: string, 
    requiresEducation: boolean, 
    gateData?: string, 
    educationModules?: number[]
  ) => {
    console.log('✅ Pre-claim validation successful', { 
      sessionToken, 
      requiresEducation, 
      gateData: gateData?.slice(0, 20) + '...', 
      educationModules 
    });
    
    // Update session storage with validation results
    if (typeof tokenId === 'string') {
      updateClaimSession(tokenId, {
        sessionToken,
        requiresEducation,
        educationModules,
        passwordValidated: true,
        flowState: requiresEducation ? 'education' : 'claim',
        educationGateData: gateData
      });
    }
    
    // Store the education gate data for use in claim transaction
    if (gateData) {
      setEducationGateData(gateData);
      console.log('🎓 Education gate data stored for claim:', gateData === '0x' ? 'EMPTY (no education)' : 'EIP-712 SIGNATURE');
    }
    
    if (requiresEducation) {
      // CRITICAL FIX: Use educationModules passed directly from validation
      if (educationModules && educationModules.length > 0) {
        console.log('✅ Using modules directly from validation:', educationModules);
        
        setEducationSession({
          sessionToken,
          requiresEducation: true,
          requiredModules: educationModules, // Use the exact modules from validation
          currentModuleIndex: 0
        });
        setFlowState(ClaimFlowState.EDUCATION);
      } else {
        // Fallback: Try to get from session (but this should not happen with the fix)
        console.warn('⚠️ No modules passed from validation, attempting session fetch...');
        
        try {
          const response = await fetch('/api/education/get-requirements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Education requirements from session:', data);
            
            const modulesToUse = data.modules && data.modules.length > 0 
              ? data.modules 
              : [5]; // Last resort: default to Sales Masterclass
            
            setEducationSession({
              sessionToken,
              requiresEducation: true,
              requiredModules: modulesToUse,
              currentModuleIndex: 0
            });
            setFlowState(ClaimFlowState.EDUCATION);
          } else {
            console.error('❌ Session fetch failed, using module 5 as final fallback');
            setEducationSession({
              sessionToken,
              requiresEducation: true,
              requiredModules: [5], // Sales Masterclass as absolute last resort
              currentModuleIndex: 0
            });
            setFlowState(ClaimFlowState.EDUCATION);
          }
        } catch (error) {
          console.error('❌ Error in fallback:', error);
          setEducationSession({
            sessionToken,
            requiresEducation: true,
            requiredModules: [5], // Sales Masterclass as absolute last resort
            currentModuleIndex: 0
          });
          setFlowState(ClaimFlowState.EDUCATION);
        }
      }
    } else {
      // No education required, proceed directly to claim
      setEducationSession({
        sessionToken,
        requiresEducation: false
      });
      setFlowState(ClaimFlowState.CLAIM);
    }
  };

  const handleModuleComplete = (gateData?: string) => {
    if (!educationSession || !educationSession.requiredModules) return;
    
    // Store the gate data when received
    if (gateData) {
      console.log('🆕 Education gate data received:', gateData.slice(0, 20) + '...');
      setEducationGateData(gateData);
    }
    
    const nextIndex = (educationSession.currentModuleIndex || 0) + 1;
    
    if (nextIndex < educationSession.requiredModules.length) {
      // Move to next module and update session
      const updatedSession = {
        ...educationSession,
        currentModuleIndex: nextIndex
      };
      setEducationSession(updatedSession);
      
      // Update localStorage with progress
      if (typeof tokenId === 'string') {
        updateClaimSession(tokenId, {
          currentModuleIndex: nextIndex
        });
      }
    } else {
      // All modules completed, proceed to claim
      console.log('🎓 All education modules completed with gate data!');
      setFlowState(ClaimFlowState.CLAIM);
      
      // Mark education as completed in localStorage
      if (typeof tokenId === 'string') {
        updateClaimSession(tokenId, {
          educationCompleted: true,
          educationGateData: gateData,
          flowState: 'claim'
        });
      }
    }
  };

  const handleClaimSuccess = (transactionHash: string, giftInfo?: any) => {
    console.log('🎉 Gift claimed successfully!', { transactionHash, giftInfo });
    setClaimed(true);
    setFlowState(ClaimFlowState.SUCCESS);
    
    // Clear session storage since claim is complete
    if (typeof tokenId === 'string') {
      const { clearClaimSession } = require('../../../lib/claimSessionStorage');
      clearClaimSession(tokenId);
      
      // Refresh gift info to show claimed status
      setTimeout(() => {
        loadGiftInfo(tokenId);
      }, 2000);
    }
  };

  const handleClaimError = (error: string) => {
    console.error('❌ Claim failed:', error);
    setError(error);
  };

  const handleRefresh = () => {
    if (tokenId && typeof tokenId === 'string') {
      loadGiftInfo(tokenId);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Gift... | CryptoGift</title>
          <meta name="description" content="Loading your secured gift..." />
        </Head>
        
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loading Gift...</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Fetching your secured gift information...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error && !giftInfo) {
    return (
      <>
        <Head>
          <title>Gift Not Found | CryptoGift</title>
          <meta name="description" content="This gift could not be found or loaded." />
        </Head>
        
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Gift Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </>
    );
  }

  const pageTitle = giftInfo?.status === 'claimed' 
    ? `Gift Claimed | CryptoGift`
    : `Claim Your Gift #${tokenId} | CryptoGift`;
    
  const pageDescription = giftInfo?.status === 'claimed'
    ? 'This gift has been successfully claimed!'
    : 'Claim your secured temporal escrow gift with your password.';

  return (
    <NotificationProvider>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        {nftMetadata?.image && (
          <meta property="og:image" content={nftMetadata.image} />
        )}
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  ← Back to CryptoGift
                </button>
              </div>
              
              {/* Theme Selector and Connect Button */}
              <div className="flex items-center gap-3">
                {mounted && (
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    title="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    )}
                  </button>
                )}
                
                {!account && (
                  <ConnectButton
                    client={client}
                    appMetadata={{
                      name: "CryptoGift Wallets",
                      url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || (() => { throw new Error('NEXT_PUBLIC_SITE_URL is required'); })(),
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Dynamic based on flow state */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading state while determining flow */}
          {flowState === null && (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Verificando requisitos del regalo...</p>
            </div>
          )}
          
          {/* Pre-Validation State */}
          {flowState === ClaimFlowState.PRE_VALIDATION && tokenId && (
            <PreClaimFlow
              tokenId={tokenId as string}
              onValidationSuccess={handlePreClaimValidation}
              giftInfo={giftInfo}
              nftMetadata={nftMetadata}
              className="mx-auto"
            />
          )}
          
          {/* Education State - ACTUALIZADO PARA USAR LESSONMODALWRAPPER CON MAPEO CORRECTO */}
          {flowState === ClaimFlowState.EDUCATION && educationSession && educationSession.requiredModules && (
            <div className="max-w-4xl mx-auto">
              {/* Mostrar el módulo actual usando LessonModalWrapper */}
              <LessonModalWrapperForEducation
                moduleId={educationSession.requiredModules[educationSession.currentModuleIndex || 0]}
                sessionToken={educationSession.sessionToken}
                tokenId={tokenId as string}
                onComplete={(gateData) => handleModuleComplete(gateData)}
                giftInfo={giftInfo}
                nftMetadata={nftMetadata}
              />
            </div>
          )}
          
          {/* Claim State - Original UI preserved */}
          {flowState === ClaimFlowState.CLAIM && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Gift Status */}
              <div>
                <EscrowGiftStatus
                  tokenId={tokenId as string}
                  giftInfo={giftInfo}
                  nftMetadata={nftMetadata}
                  isCreator={false}
                  onRefresh={handleRefresh}
                  className="mb-6"
                />
              
              {/* Help Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  How to Claim Your Gift
                </h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">1</span>
                    </div>
                    <p>Connect your wallet using the button above</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">2</span>
                    </div>
                    <p>Enter the password that was shared with you</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">3</span>
                    </div>
                    <p>The NFT will be transferred to your wallet</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Claim Interface */}
            <div>
              {claimed ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-green-800 mb-2">
                    Gift Claimed Successfully!
                  </h2>
                  <p className="text-green-600 mb-4">
                    The NFT has been transferred to your wallet.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Refresh Status
                  </button>
                </div>
              ) : (
                <ClaimEscrowInterface
                  tokenId={tokenId as string}
                  giftInfo={giftInfo}
                  nftMetadata={nftMetadata}
                  onClaimSuccess={handleClaimSuccess}
                  onClaimError={handleClaimError}
                  educationGateData={educationGateData} // Pass EIP-712 signature or '0x' for no education
                  hasEducationRequirements={hasEducationRequirements}
                />
              )}

              {/* Security Notice */}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">Security Notice</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Never share your wallet&apos;s private key or seed phrase</li>
                      <li>• This gift is secured by temporal escrow technology</li>
                      <li>• If expired, the gift will be returned to the creator</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
          
          {/* Success State */}
          {flowState === ClaimFlowState.SUCCESS && (
            <div className="max-w-md mx-auto">
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-2xl p-8 text-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-3xl font-bold text-green-800 dark:text-green-200 mb-4">
                  ¡Regalo Reclamado!
                </h2>
                <p className="text-green-600 dark:text-green-400 mb-6">
                  El NFT ha sido transferido exitosamente a tu wallet.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/my-wallets')}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Ver Mis NFT Wallets
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Volver al Inicio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </NotificationProvider>
  );
}

// Disable static generation for this page since it uses ThirdWeb hooks
export async function getServerSideProps() {
  return {
    props: {}
  };
}