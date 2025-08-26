"use client";

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { NFTImage } from '../NFTImage';
import { InteriorMuseum360 } from './InteriorMuseum360';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  image: string;
  description: string;
  price?: string;
  size: 'small' | 'medium' | 'large' | 'hero';
  cryptoType?: string;
}

interface MuseumArtwork {
  id: string;
  image: string;
  title: string;
  artist?: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
}

interface LuxuryGlassMuseumGalleryProps {
  gpuTier: 'low' | 'medium' | 'high';
}

export default function LuxuryGlassMuseumGallery({ gpuTier }: LuxuryGlassMuseumGalleryProps) {
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);

  // LUXURY ART COLLECTION - Quality NFT artworks for museum display
  const artworks: Artwork[] = [
    {
      id: 'hero-main',
      title: 'Digital Renaissance',
      artist: 'AI × Human Collaboration',
      year: '2024',
      image: '/Arte-IA-Personalizado.png',
      description: 'The fusion of classical art and modern AI technology, representing the bridge between traditional creativity and digital innovation.',
      price: '₿ 5.0',
      size: 'hero',
      cryptoType: 'NFT'
    },
    {
      id: 'crypto-abstract-1',
      title: 'Blockchain Symphony',
      artist: 'Genesis Creator',
      year: '2024',
      image: 'https://i.seadn.io/gae/BdxvLseXcfl57BiuQcQYdJ64v-aI8din7WPk0Pgo3qQFhAUH-B6i-dCqqHgy_-gfa5Z_J84z4oxmqFiJjn3hS-Pv04_7t3p1mL7AuI4=s512',
      description: 'An abstract representation of blockchain technology flowing through the digital cosmos.',
      price: '₿ 2.3',
      size: 'large',
      cryptoType: 'NFT'
    },
    {
      id: 'wallet-secure',
      title: 'The Vault',
      artist: 'Security Architect',
      year: '2024', 
      image: 'https://i.seadn.io/gae/N1OLMgVhLqgFkzb3V8F7vd0aL5T_YZL8F2pP8K9pZ8qx3dB1V8K2F2H9L1K8F9P2Z1aL5T8?auto=format&dpr=1&w=384',
      description: 'A visual representation of ultimate crypto security and protection.',
      price: '₿ 1.8',
      size: 'medium',
      cryptoType: 'Wallet'
    },
    {
      id: 'academy-knowledge',
      title: 'Path to Wisdom',
      artist: 'Learning Master',
      year: '2024',
      image: 'https://i.seadn.io/gae/M8K2F9P1Z3aL5T8B1V8K2F2H9L1K8F9P2Z1aL5T_YZL8F2pP8K9pZ8qx3dB1V8=s384',
      description: 'The journey of learning and mastering the crypto ecosystem.',
      price: '₿ 1.2',
      size: 'medium',
      cryptoType: 'Academy'
    },
    {
      id: 'community-bond',
      title: 'United We Build',
      artist: 'Community Spirit',
      year: '2024',
      image: 'https://i.seadn.io/gae/Z1aL5T_YZL8F2pP8K9pZ8qx3dB1V8K2F2H9L1K8F9P2M8K2F9P1Z3aL5T8B1V8=s512',
      description: 'The power of community in building the decentralized future.',
      price: '₿ 0.9',
      size: 'small',
      cryptoType: 'Community'
    },
    {
      id: 'defi-revolution',
      title: 'Financial Freedom',
      artist: 'DeFi Pioneer', 
      year: '2024',
      image: 'https://i.seadn.io/gae/F2pP8K9pZ8qx3dB1V8K2F2H9L1K8F9P2Z1aL5T_YZL8M8K2F9P1Z3aL5T8B1V8=s384',
      description: 'The revolution of decentralized finance transforming traditional banking.',
      price: '₿ 3.1',
      size: 'large',
      cryptoType: 'DeFi'
    },
    {
      id: 'nft-culture',
      title: 'Digital Culture',
      artist: 'Culture Curator',
      year: '2024',
      image: 'https://i.seadn.io/gae/H9L1K8F9P2Z1aL5T_YZL8F2pP8K9pZ8qx3dB1V8K2F2M8K2F9P1Z3aL5T8B1V8=s512',
      description: 'How NFTs are reshaping digital art and cultural expression.',
      price: '₿ 2.7',
      size: 'medium',
      cryptoType: 'NFT'
    },
    {
      id: 'metaverse-future',
      title: 'Virtual Realms',
      artist: 'Metaverse Architect',
      year: '2024',
      image: 'https://i.seadn.io/gae/P8K9pZ8qx3dB1V8K2F2H9L1K8F9P2Z1aL5T_YZL8F2pM8K2F9P1Z3aL5T8B1V8=s384',
      description: 'Exploring the infinite possibilities of virtual worlds and metaverses.',
      price: '₿ 4.2',
      size: 'large',
      cryptoType: 'Metaverse'
    }
  ];

  // Convert artworks to museum format
  const museumArtworks: MuseumArtwork[] = artworks.map(artwork => ({
    id: artwork.id,
    image: artwork.image,
    title: artwork.title,
    artist: artwork.artist,
    size: artwork.size
  }));

  const handleArtworkClick = (artwork: MuseumArtwork) => {
    const fullArtwork = artworks.find(art => art.id === artwork.id);
    if (fullArtwork) {
      setSelectedArt(fullArtwork);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Interior Museum 360 - Real museum room matching reference images */}
      <InteriorMuseum360 
        artworks={museumArtworks}
        gpuTier={gpuTier}
        onArtworkClick={handleArtworkClick}
      />

      {/* NFT Modal - Luxury artwork details */}
      <AnimatePresence>
        {selectedArt && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedArt(null)}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <NFTImage
                src={selectedArt.image}
                alt={selectedArt.title}
                width={800}
                height={600}
                className="w-full h-auto rounded-2xl shadow-2xl"
                priority
              />
              
              {/* Artwork details overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-2xl">
                <h2 className="text-3xl font-bold text-white mb-2">{selectedArt.title}</h2>
                <p className="text-cyan-300 text-lg mb-2">by {selectedArt.artist} • {selectedArt.year}</p>
                {selectedArt.price && (
                  <p className="text-yellow-400 text-xl font-semibold mb-3">{selectedArt.price}</p>
                )}
                <p className="text-gray-200 text-sm leading-relaxed">{selectedArt.description}</p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedArt(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}