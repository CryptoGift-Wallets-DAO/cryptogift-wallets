"use client";

/**
 * KNOWLEDGE V2 PAGE - Nueva experiencia mejorada
 * Version with Sales Masterclass integration
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface KnowledgeModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  duration: string;
  topics: string[];
  isLocked?: boolean;
  prerequisite?: string;
}

export default function KnowledgeV2Page() {
  const [selectedCategory, setSelectedCategory] = useState('sales-masterclass');
  const [searchQuery, setSearchQuery] = useState('');

  const knowledgeModules: Record<string, KnowledgeModule[]> = {
    'sales-masterclass': [
      {
        id: 'sales-masterclass',
        title: '🚀 SALES MASTERCLASS',
        description: 'De $0 a $100M en 15 minutos - La presentación definitiva para captar colaboradores, inversores y comunidad',
        icon: '💎',
        level: 'Avanzado',
        duration: '15 min',
        topics: ['Psicología de Ventas', 'AIDA Framework', 'Demo Live', 'Captación de Leads', 'ROI $100M+']
      }
    ],
    'getting-started': [
      {
        id: 'crypto-basics',
        title: '¿Qué es una Criptomoneda?',
        description: 'Conceptos fundamentales del dinero digital y blockchain',
        icon: '🪙',
        level: 'Básico',
        duration: '10 min',
        topics: ['Bitcoin', 'Ethereum', 'Wallets', 'Private Keys']
      },
      {
        id: 'wallet-basics',
        title: 'Tu Primera Wallet',
        description: 'Cómo crear y usar una billetera de criptomonedas',
        icon: '👛',
        level: 'Básico',
        duration: '15 min',
        topics: ['MetaMask', 'Seed Phrases', 'Seguridad', 'Backup']
      },
      {
        id: 'nft-intro',
        title: 'NFTs Explicado Simple',
        description: 'Qué son los NFTs y por qué son únicos',
        icon: '🖼️',
        level: 'Básico',
        duration: '12 min',
        topics: ['Tokens Únicos', 'Ownership', 'OpenSea', 'Metadata']
      }
    ],
    'platform-guide': [
      {
        id: 'cryptogift-basics',
        title: 'Cómo Funciona CryptoGift',
        description: 'Guía completa de nuestra plataforma',
        icon: '🎁',
        level: 'Básico',
        duration: '20 min',
        topics: ['NFT-Wallets', 'Gasless Transactions', 'TBA', 'Referrals']
      },
      {
        id: 'creating-gifts',
        title: 'Crear tu Primer Regalo',
        description: 'Tutorial paso a paso para regalar crypto',
        icon: '✨',
        level: 'Básico',
        duration: '25 min',
        topics: ['Upload Image', 'Add Funds', 'Share Link', 'Track Status']
      },
      {
        id: 'referral-system',
        title: 'Sistema de Referidos',
        description: 'Gana dinero invitando amigos',
        icon: '🌟',
        level: 'Intermedio',
        duration: '30 min',
        topics: ['Commission Structure', 'Tracking', 'Payments', 'Optimization']
      }
    ]
  };

  const categories = [
    { id: 'sales-masterclass', name: '⭐ MASTERCLASS', icon: '🚀', color: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shadow-lg' },
    { id: 'getting-started', name: 'Primeros Pasos', icon: '🚀', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    { id: 'platform-guide', name: 'Guía CryptoGift', icon: '🎁', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Básico': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'Intermedio': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Avanzado': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const currentModules = knowledgeModules[selectedCategory] || [];
  const filteredModules = currentModules.filter(module => 
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 flex items-center justify-center bg-yellow-500/20 rounded-2xl shadow-lg border border-yellow-500/30">
              <span className="text-4xl">🎓</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              CryptoGift Academy V2
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experiencia de aprendizaje revolucionaria con el módulo de ventas más potente del ecosistema cripto.
            <br />
            <span className="text-yellow-400 font-medium">Diseñado para captar colaboradores, inversores y comunidad</span>
          </p>
        </div>

        {/* Featured Sales Masterclass */}
        <div className="mb-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 
                       border border-yellow-500/30 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
              ⭐ MÓDULO ESTRELLA
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">🚀</div>
                <div>
                  <h2 className="text-4xl font-bold text-white mb-2">
                    SALES MASTERCLASS
                  </h2>
                  <p className="text-lg text-gray-300">
                    De $0 a $100M en Regalos Cripto - 15 minutos que cambiarán tu visión del futuro
                  </p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-center border border-white/20">
                  <div className="font-bold text-yellow-400">15 minutos</div>
                  <div className="text-sm text-gray-400">Duración</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-center border border-white/20">
                  <div className="font-bold text-yellow-400">AIDA + SPIN</div>
                  <div className="text-sm text-gray-400">Frameworks</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-center border border-white/20">
                  <div className="font-bold text-yellow-400">Demo Live</div>
                  <div className="text-sm text-gray-400">QR Interactivo</div>
                </div>
              </div>

              <Link
                href="/knowledge-v2/sales-masterclass"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 
                         text-black font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg animate-pulse"
              >
                🚀 INICIAR MASTERCLASS AHORA
              </Link>
            </div>
            
            <div className="hidden lg:block ml-8">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full 
                            flex items-center justify-center text-4xl animate-spin-slow">
                💎
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-full blur-3xl" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full blur-3xl" />
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="🔍 Buscar temas, tutoriales, conceptos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-700 bg-gray-900/50 text-white
                       focus:outline-none focus:ring-2 focus:ring-yellow-500 text-lg backdrop-blur-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedCategory === category.id
                  ? category.color + ' shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-yellow-400">50+</div>
            <div className="text-sm text-gray-400">Lecciones Disponibles</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-green-400">15h</div>
            <div className="text-sm text-gray-400">Contenido Total</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-purple-400">98%</div>
            <div className="text-sm text-gray-400">Satisfacción</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold text-orange-400">24/7</div>
            <div className="text-sm text-gray-400">Asistente AI</div>
          </div>
        </div>

        {/* Knowledge Modules */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(module => (
            <div
              key={module.id}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl hover:border-gray-600 
                       transition-all duration-300 overflow-hidden cursor-pointer hover:scale-105"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{module.icon}</div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(module.level)}`}>
                      {module.level}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  {module.title}
                </h3>
                
                <p className="text-gray-400 mb-4 text-sm">
                  {module.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>⏱️ {module.duration}</span>
                  <span>📖 {module.topics.length} temas</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {module.topics.slice(0, 3).map(topic => (
                    <span key={topic} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                      {topic}
                    </span>
                  ))}
                  {module.topics.length > 3 && (
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                      +{module.topics.length - 3} más
                    </span>
                  )}
                </div>

                <Link
                  href={module.id === 'sales-masterclass' ? '/knowledge-v2/sales-masterclass' : `/knowledge-v2/${module.id}`}
                  className={`block w-full text-center py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 ${
                    module.id === 'sales-masterclass' 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold shadow-lg animate-pulse'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  }`}
                >
                  {module.id === 'sales-masterclass' ? '🚀 INICIAR MASTERCLASS' : '🚀 Comenzar Lección'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para revolucionar Web3?
          </h2>
          <p className="text-gray-400 mb-8">
            Comienza con nuestro módulo estrella y descubre el futuro de los regalos cripto
          </p>
          <Link
            href="/knowledge-v2/sales-masterclass"
            className="inline-flex items-center gap-2 px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 
                     text-black font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
          >
            🚀 MASTERCLASS COMPLETA →
          </Link>
        </div>
      </div>
    </div>
  );
}