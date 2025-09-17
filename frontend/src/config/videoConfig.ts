/**
 * VIDEO CONFIGURATION - Centralized video management
 * This file makes it extremely easy to replace videos by just changing the IDs
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

export interface VideoConfig {
  lessonId: string;        // Unique ID for localStorage persistence
  muxPlaybackId: string;   // Mux Playback ID
  title: string;
  description?: string;
  poster?: string;         // Optional poster image
  captionsVtt?: string;    // Optional captions file
}

/**
 * CENTRALIZED VIDEO CONFIGURATION
 * To replace any video, just update the muxPlaybackId here
 * The lessonId should be changed when you want to force all users to see the new video
 */
export const VIDEO_CONFIG: Record<string, VideoConfig> = {
  // Sales Masterclass intro video
  salesMasterclass: {
    lessonId: "sales-masterclass-v2", // Updated to v2 for new CryptoGift__Regala_el_futuro video
    muxPlaybackId: "GYUeyDShOKhtDCy1qqoCetF01hhabYfp7dldcV3HKZ5U", // CryptoGift__Regala_el_futuro video
    title: "CryptoGift: Regala el Futuro",
    description: "Descubre cómo regalar activos digitales de valor real con CryptoGift",
    // poster: "/images/videos/sales-masterclass-poster.jpg", // Uncomment when you have a poster
    // captionsVtt: "/captions/sales-masterclass-es.vtt", // Uncomment when you have captions
  },

  // Presentation CGC - Video final después del EIP-712 y antes del claim
  presentationCGC: {
    lessonId: "presentation-cgc-v1",
    muxPlaybackId: "dsEZYVMpcrkuNvn0200p8C7nz9qEqY3dr7Mx9OiauZSro", // Presentation CGC video
    title: "Presentación CryptoGift Club",
    description: "Descubre las oportunidades exclusivas que te esperan como miembro del CryptoGift Club",
  },

  // Example for future lessons
  walletBasics: {
    lessonId: "wallet-basics-v1",
    muxPlaybackId: "YOUR_MUX_PLAYBACK_ID_HERE",
    title: "Fundamentos de Wallets Cripto",
    description: "Aprende los conceptos básicos de las wallets digitales",
  },

  gasOptimization: {
    lessonId: "gas-optimization-v1", 
    muxPlaybackId: "YOUR_MUX_PLAYBACK_ID_HERE",
    title: "Optimización de Gas",
    description: "Estrategias para minimizar costos de transacción",
  },

  nftIntro: {
    lessonId: "nft-intro-v1",
    muxPlaybackId: "YOUR_MUX_PLAYBACK_ID_HERE",
    title: "Introducción a NFTs",
    description: "Todo lo que necesitas saber sobre NFTs",
  },

  defiBasics: {
    lessonId: "defi-basics-v1",
    muxPlaybackId: "YOUR_MUX_PLAYBACK_ID_HERE",
    title: "DeFi para Principiantes",
    description: "Descubre el poder de las finanzas descentralizadas",
  }
};

/**
 * Helper function to get video config
 * @param key - The key from VIDEO_CONFIG object
 * @returns VideoConfig object or undefined if not found
 */
export function getVideoConfig(key: keyof typeof VIDEO_CONFIG): VideoConfig | undefined {
  return VIDEO_CONFIG[key];
}

/**
 * Helper function to update video version (forces re-watch)
 * @param key - The key from VIDEO_CONFIG object
 * @param version - New version number or string
 */
export function updateVideoVersion(key: keyof typeof VIDEO_CONFIG, version: string | number) {
  const config = VIDEO_CONFIG[key];
  if (config) {
    // Extract base lesson ID without version
    const baseId = config.lessonId.replace(/-v\d+$/, '');
    config.lessonId = `${baseId}-v${version}`;
  }
  return config;
}

/**
 * HOW TO REPLACE A VIDEO:
 * 
 * 1. Upload new video to Mux
 * 2. Get the new Playback ID from Mux dashboard
 * 3. Update the muxPlaybackId in VIDEO_CONFIG above
 * 4. If you want to force all users to watch the new video, change the lessonId version:
 *    - Example: "sales-masterclass-v1" → "sales-masterclass-v2"
 * 5. Deploy changes
 * 
 * That's it! The video will be automatically updated everywhere it's used.
 */