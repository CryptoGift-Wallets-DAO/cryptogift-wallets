import React, { useState } from 'react';
import Image from 'next/image';

export const FeatureSection: React.FC = () => {
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  const features = [
    {
      icon: 'Arte-IA-Personalizado.png',
      title: 'Arte IA Personalizado',
      description: 'Convierte cualquier foto en arte único con filtros de inteligencia artificial profesionales.',
      color: 'from-pink-500 to-rose-500',
      detailedContent: {
        subtitle: 'Tecnología PhotoRoom AI + Filtros Profesionales',
        features: [
          'Más de 15 filtros artísticos profesionales',
          'Procesamiento IA en tiempo real',
          'Optimización automática para NFTs',
          'Resolución 4K para calidad premium'
        ],
        highlight: 'Cada imagen se procesa con algoritmos de última generación para garantizar obras únicas e irrepetibles, perfectas para NFTs de alta calidad.'
      }
    },
    {
      icon: 'cg-wallet-logo.png',
      title: 'NFT = Wallet Real',
      description: 'Cada NFT es una wallet funcional que guarda criptomonedas reales usando tecnología ERC-6551.',
      color: 'from-blue-500 to-cyan-500',
      detailedContent: {
        subtitle: 'Tecnología ERC-6551 Token Bound Accounts',
        features: [
          'Wallet totalmente funcional dentro del NFT',
          'Compatible con todos los tokens ERC-20',
          'Integracin nativa con DeFi protocols',
          'Herencia automática del NFT'
        ],
        highlight: 'Revolucionamos el concepto de NFT: no es solo arte digital, es una wallet completa que puede recibir, enviar y gestionar criptomonedas reales.'
      }
    },
    {
      icon: 'Gas‑Patrocinado.png',
      title: 'Gas Patrocinado',
      description: 'Todas las transacciones son gratuitas para el usuario final. Nosotros pagamos el gas.',
      color: 'from-yellow-500 to-orange-500',
      detailedContent: {
        subtitle: 'Biconomy Paymaster + Optimización de Gas',
        features: [
          'Transacciones 100% gratuitas para usuarios',
          'Optimización inteligente de rutas',
          'Cobertura completa en Base Network',
          'Sin límites de transacciones diarias'
        ],
        highlight: 'Eliminamos la barrera de entrada más grande de crypto: el gas. Los usuarios nunca necesitan preocuparse por ETH o comisiones.'
      }
    },
    {
      icon: 'Recuperacion-Social.png',
      title: 'Recuperación Social',
      description: 'Sistema de guardianes para recuperar el acceso sin depender de frases semilla complicadas.',
      color: 'from-purple-500 to-violet-500',
      detailedContent: {
        subtitle: 'Guardians MultiSig + Cryptographic Verification',
        features: [
          'Sistema 2-de-3 guardianes de confianza',
          'Verificación criptográfica robusta',
          'Tiempo de espera de seguridad (72h)',
          'Auditoria completa de todas las acciones'
        ],
        highlight: 'Olvdate de las seed phrases. Si pierdes el acceso, tus guardianes de confianza pueden ayudarte a recuperarlo de forma segura y verificable.'
      }
    },
    {
      icon: 'Swap-Integrado.png',
      title: 'Swap Integrado',
      description: 'Cambia entre diferentes criptomonedas directamente desde la wallet del NFT con un clic.',
      color: 'from-green-500 to-emerald-500',
      detailedContent: {
        subtitle: '0x Protocol + Agregación de Liquidez Inteligente',
        features: [
          'Mejores precios agregando múltiples DEXs',
          'Slippage mínimo y ejecución inteligente',
          'Soporte para 50+ tokens principales',
          'Interfaz simplificada de un clic'
        ],
        highlight: 'Swap directo desde tu NFT-wallet sin salir de la plataforma. Obtienes los mejores precios del mercado con la comodidad de un botón.'
      }
    },
    {
      icon: 'Transparencia-Total.png',
      title: 'Transparencia Total',
      description: 'Código abierto y comunidad de desarrolladores. Dashboard público con estadísticas en tiempo real.',
      color: 'from-indigo-500 to-blue-600',
      detailedContent: {
        subtitle: 'Open Source + Auditoría Pública Continua',
        features: [
          'Código 100% abierto en GitHub',
          'Auditorías independientes trimestrales',
          'Dashboard de reservas en tiempo real',
          'Comunidad activa de desarrolladores'
        ],
        highlight: 'Transparencia total: todo nuestro código es público, las reservas son auditables on-chain y la comunidad puede verificar cada línea de código.'
      }
    }
  ];

  return (
    <section className="py-20 bg-bg-secondary dark:bg-bg-primary transition-colors duration-500">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 transition-colors duration-300">
            ¿Por qué CryptoGift Wallets?
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto transition-colors duration-300">
            Combinamos arte, tecnología y emociones para crear la experiencia de regalo cripto más humana del mundo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="relative">
              {/* Main Feature Card */}
              <div
                onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                className={`group bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-2xl 
                         transition-all duration-300 border cursor-pointer
                         ${expandedFeature === index 
                           ? 'border-accent-gold dark:border-accent-silver ring-2 ring-accent-gold/20 dark:ring-accent-silver/20' 
                           : 'border-border-primary hover:border-accent-gold dark:hover:border-accent-silver'
                         }`}
              >
                <div className={`w-16 h-20 bg-gradient-to-r ${feature.color} 
                               dark:from-accent-gold dark:to-accent-silver
                               rounded-2xl flex items-center justify-center mb-6 
                               group-hover:scale-110 transition-transform duration-300 
                               ${feature.icon === 'Arte-IA-Personalizado.png' ? 'p-0 overflow-hidden' : 'p-1'}`}>
                  <Image
                    src={`/${feature.icon}`}
                    alt={feature.title}
                    width={64}
                    height={80}
                    className={`${
                      feature.icon === 'Arte-IA-Personalizado.png' 
                        ? 'object-cover w-full h-full rounded-2xl' 
                        : 'object-contain w-full h-full drop-shadow-lg filter contrast-125 brightness-110'
                    }`}
                    priority
                  />
                </div>
                
                <h3 className="text-xl font-bold text-text-primary mb-4 
                             group-hover:text-accent-gold dark:group-hover:text-accent-silver 
                             transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-text-secondary leading-relaxed transition-colors duration-300 mb-4">
                  {feature.description}
                </p>
                
                {/* Expand Indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-accent-gold dark:text-accent-silver font-medium">
                    {expandedFeature === index ? 'Ver menos' : 'Ver más detalles'}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-accent-gold dark:text-accent-silver transition-transform duration-300 ${
                      expandedFeature === index ? 'rotate-180' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Expanded Panel */}
              {expandedFeature === index && (
                <div className="absolute top-full left-0 right-0 z-10 mt-2 bg-bg-card border border-accent-gold dark:border-accent-silver 
                              rounded-2xl p-6 shadow-2xl backdrop-blur-sm transition-all duration-300">
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-accent-gold dark:text-accent-silver">
                      {feature.detailedContent.subtitle}
                    </h4>
                    
                    <div className="space-y-2">
                      {feature.detailedContent.features.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-start">
                          <span className="text-accent-gold dark:text-accent-silver mr-3 mt-1 text-sm">✓</span>
                          <span className="text-text-secondary text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-accent-gold/10 dark:bg-accent-silver/10 rounded-xl p-4 mt-4">
                      <p className="text-sm text-text-primary italic leading-relaxed">
                        {feature.detailedContent.highlight}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Backdrop to close expanded panels */}
        {expandedFeature !== null && (
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-5 transition-opacity duration-300"
            onClick={() => setExpandedFeature(null)}
          />
        )}

        {/* Spacer for expanded panels */}
        <div className="h-32"></div>
        
        {/* Comparison Section */}
        <div className="mt-20 bg-bg-card rounded-3xl p-8 md:p-12 shadow-xl 
                      border border-border-primary transition-all duration-300">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-text-primary mb-12 transition-colors duration-300">
            Vs. Métodos Tradicionales
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-text-primary mb-6 flex items-center transition-colors duration-300">
                <span className="w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                               rounded-full flex items-center justify-center mr-3 text-sm transition-colors duration-300">✗</span>
                Métodos Tradicionales
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Exchanges complicados e intimidantes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Comisiones altas y gas impredecible</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Riesgo de perder claves privadas</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Experiencia fría y técnica</span>
                </div>
              </div>
            </div>

            {/* CryptoGift Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-text-primary mb-6 flex items-center transition-colors duration-300">
                <span className="w-8 h-8 bg-green-100 dark:bg-accent-gold/20 text-green-600 dark:text-accent-gold 
                               rounded-full flex items-center justify-center mr-3 text-sm transition-colors duration-300">✓</span>
                CryptoGift Wallets
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Interfaz simple, como enviar un email</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Cero comisiones, gas patrocinado</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Recuperación social con guardianes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Experiencia emotiva y personal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};