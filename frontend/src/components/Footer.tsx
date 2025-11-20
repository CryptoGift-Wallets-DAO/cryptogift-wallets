"use client";

import React from 'react';
import { Link } from '../i18n/routing';
import Image from 'next/image';
import { SmartIcon } from './ui/SmartIcon';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <SmartIcon icon="🎁" size={20} />
              </div>
              <div>
                <div className="font-bold text-xl">CryptoGift</div>
                <div className="text-xs text-gray-400">Wallets</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Regala el futuro. Crea NFT-wallets únicos con arte IA y criptomonedas reales.
            </p>
            <div className="flex space-x-4">
              <a href="https://x.com/giftwalletcoin?s=21" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="X/Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="https://discord.gg/4zBvZnQB" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Discord">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                </svg>
              </a>
              <a href="https://farcaster.xyz/cryptogift-w" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Farcaster">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.24 5.16h-3.12V1.92h3.12v3.24zm-6.48 0H8.64V1.92h3.12v3.24zM1.92 22.08V8.88h3.36v13.2H1.92zm16.32 0V8.88h3.36v13.2h-3.36zM8.64 22.08V8.88h6.72v13.2H8.64z"/>
                </svg>
              </a>
              <a href="https://youtu.be/_CDc7GMVNhg" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="YouTube">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Producto</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">Crear Regalo</Link></li>
              <li><Link href="/referrals" className="hover:text-white transition-colors">Programa de Referidos</Link></li>
              <li><Link href="/knowledge" className="hover:text-white transition-colors">Academia</Link></li>
              <li><a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Verificar en Blockchain</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Recursos</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href={process.env.NEXT_PUBLIC_DOCS_URL || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentación</a></li>
              <li><a href={process.env.NEXT_PUBLIC_BLOG_URL || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href={process.env.NEXT_PUBLIC_SUPPORT_URL || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
              <li><a href="mailto:admin@mbxart.com" className="hover:text-white transition-colors">Soporte</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="mailto:admin@mbxart.com" className="hover:text-white transition-colors">Contacto</a></li>
              <li><a href="https://github.com/cryptogift-wallets" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Código Abierto</a></li>
              <li><a href={process.env.NEXT_PUBLIC_DOCS_URL || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentación</a></li>
              <li><a href="https://discord.gg/4zBvZnQB" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Comunidad</a></li>
            </ul>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">$2M+</div>
              <div className="text-xs text-gray-500">Total Regalado</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">50K+</div>
              <div className="text-xs text-gray-500">NFT-Wallets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">98%</div>
              <div className="text-xs text-gray-500">Satisfacción</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">$84K</div>
              <div className="text-xs text-gray-500">Ahorrado en Gas</div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-400 mb-4 md:mb-0">
            © 2025 The Moon in a Box, CryptoGift Wallets. All rights reserved.
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>Construido en</span>
            <div className="flex items-center space-x-2">
              <Image src="/base-logo.svg" alt="Base" width={24} height={24} className="w-6 h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
              <span>Base</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};