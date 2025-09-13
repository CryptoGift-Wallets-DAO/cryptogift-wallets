"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "../client";
import { GiftWizard } from "../../components/GiftWizard";
import { HeroSection } from "../../components/HeroSection";
import { FeatureSection } from "../../components/FeatureSection";
import { StatsSection } from "../../components/StatsSection";
import { ReferralWelcomeBanner } from "../../components/ReferralWelcomeBanner";

export default function HomeClient() {
  const [showWizard, setShowWizard] = useState(false);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const searchParams = useSearchParams();
  const account = useActiveAccount();
  const t = useTranslations();

  useEffect(() => {
    setMounted(true);
    
    // Check for referral parameter
    const ref = searchParams?.get("ref");
    if (ref) {
      setReferrer(ref);
      // Store in localStorage for later use
      localStorage.setItem("referrer", ref);
      
      // Show welcome banner for referred users
      const hasSeenBanner = localStorage.getItem(`referral-banner-${ref}`);
      if (!hasSeenBanner) {
        setShowWelcomeBanner(true);
      }
      
      // Track referral click in real-time - will be handled by separate effect
      console.log('REFERRAL DETECTED:', ref);
    } else {
      // Check localStorage for existing referrer
      const storedRef = localStorage.getItem("referrer");
      if (storedRef) {
        setReferrer(storedRef);
      }
    }
  }, [searchParams]);

  // Enhanced function to track referral clicks with wallet data  
  const trackReferralClick = useCallback(async (referrerAddress: string) => {
    try {
      console.log('🔗 Tracking referral click for:', referrerAddress);
      
      const response = await fetch('/api/referrals/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerAddress,
          referredAddress: account?.address, // Include connected wallet if available
          userAgent: navigator.userAgent,
          source: 'direct' // Can be enhanced to detect actual source
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('SUCCESS: Referral click tracked successfully:', result);
      } else {
        console.warn('WARNING: Failed to track referral click:', response.statusText);
      }
    } catch (error) {
      console.error('ERROR: Error tracking referral click:', error);
      // Don't throw error to avoid disrupting user experience
    }
  }, [account?.address]); // Dependencies: account address

  // Separate effect to track referral clicks when referrer is detected
  useEffect(() => {
    if (referrer && mounted) {
      trackReferralClick(referrer);
    }
  }, [referrer, mounted, trackReferralClick]);

  // Auto-upgrade IP-based account when user connects wallet
  useEffect(() => {
    if (account?.address && mounted) {
      upgradeIPAccount(account.address);
      
      // Re-track referral with wallet address if we have a stored referrer
      const storedRef = localStorage.getItem("referrer");
      if (storedRef) {
        console.log('RETRACK: Re-tracking referral with connected wallet:', account.address);
        trackReferralClick(storedRef);
      }
    }
  }, [account?.address, mounted, trackReferralClick]);

  const upgradeIPAccount = async (userAddress: string) => {
    try {
      console.log('UPGRADE: Attempting to upgrade IP-based account for connected wallet');
      
      const response = await fetch('/api/referrals/upgrade-ip-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('SUCCESS: IP account upgrade successful:', result);
      } else {
        console.warn('WARNING: IP account upgrade failed:', response.statusText);
      }
    } catch (error) {
      console.error('ERROR: Error upgrading IP account:', error);
      // Don't throw error to avoid disrupting user experience
    }
  };

  const handleCreateGift = () => {
    setShowWizard(true);
  };

  const handleCloseBanner = () => {
    setShowWelcomeBanner(false);
    // Mark this referrer's banner as seen
    if (referrer) {
      localStorage.setItem(`referral-banner-${referrer}`, 'seen');
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <HeroSection onCreateGift={handleCreateGift} />

      {/* Features Section */}
      <FeatureSection />

      {/* Stats Section */}
      <StatsSection />

      {/* How it Works Section */}
      <section className="py-20 bg-bg-secondary dark:bg-bg-primary transition-colors duration-500">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-text-primary transition-colors duration-300">
            {t('features.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 dark:bg-accent-gold rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <span className="text-white dark:text-bg-primary font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text-primary transition-colors duration-300">{t('features.step1.title')}</h3>
              <p className="text-text-secondary transition-colors duration-300">
                {t('features.step1.description')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 dark:bg-accent-silver rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <span className="text-white dark:text-bg-primary font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text-primary transition-colors duration-300">{t('features.step2.title')}</h3>
              <p className="text-text-secondary transition-colors duration-300">
                {t('features.step2.description')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 dark:bg-accent-gold rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <span className="text-white dark:text-bg-primary font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text-primary transition-colors duration-300">{t('features.step3.title')}</h3>
              <p className="text-text-secondary transition-colors duration-300">
                {t('features.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 
                         dark:from-bg-primary dark:to-bg-secondary transition-all duration-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-text-primary mb-6 transition-colors duration-300">
            {t('hero.cta.title')}
          </h2>
          <p className="text-xl text-blue-100 dark:text-text-secondary mb-8 max-w-2xl mx-auto transition-colors duration-300">
            {t('hero.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateGift}
              className="bg-white dark:bg-bg-card text-blue-600 dark:text-accent-gold px-8 py-3 rounded-lg 
                       font-semibold hover:bg-gray-100 dark:hover:bg-bg-secondary border dark:border-border-primary
                       transition-all duration-300"
            >
              {t('hero.createGift')}
            </button>
            {mounted && client && (
              <ConnectButton
                client={client}
                appMetadata={{
                  name: "CryptoGift Wallets",
                  url: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://cryptogift-wallets.vercel.app'),
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Gift Wizard Modal */}
      {showWizard && (
        <GiftWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          referrer={referrer}
        />
      )}

      {/* Referral Welcome Banner */}
      {showWelcomeBanner && referrer && (
        <ReferralWelcomeBanner
          referrerAddress={referrer}
          onClose={handleCloseBanner}
        />
      )}
    </main>
  );
}