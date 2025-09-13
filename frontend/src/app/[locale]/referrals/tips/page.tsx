"use client";

import { useState } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../../client';

export default function ReferralTipsPage() {
  const account = useActiveAccount();
  const [selectedCategory, setSelectedCategory] = useState<'general' | 'social' | 'crypto' | 'business'>('general');

  const tipCategories = [
    { id: 'general', title: 'Tips Generales', icon: '🎯' },
    { id: 'social', title: 'Redes Sociales', icon: '📱' },
    { id: 'crypto', title: 'Comunidad Crypto', icon: '₿' },
    { id: 'business', title: 'Socios Comerciales', icon: '🤝' }
  ];

  const tips = {
    general: [
      {
        title: "Enfócate en el Valor, No en la Venta",
        content: "Presenta CryptoGift como una solución a problemas reales: regalos únicos, introducción al cripto, arte personalizado con IA.",
        example: "En lugar de 'usa mi link', di: 'Encontré una forma increíble de hacer regalos únicos con IA y crypto'"
      },
      {
        title: "Usa tu Historia Personal",
        content: "Comparte tu experiencia creando o recibiendo un CryptoGift. Las historias personales generan más confianza.",
        example: "Comparte capturas de pantalla de tu propio NFT-wallet creado y la reacción de quien lo recibió"
      },
      {
        title: "Timing es Clave",
        content: "Comparte durante fechas especiales: cumpleaños, navidad, día del padre/madre, graduaciones.",
        example: "Publica tu contenido 2-3 semanas antes de fechas especiales cuando la gente busca ideas de regalos"
      }
    ],
    social: [
      {
        title: "Contenido Visual Atractivo",
        content: "Crea posts mostrando el proceso de creación, el resultado final, y la reacción del receptor.",
        example: "Video time-lapse creando un NFT-wallet con música de fondo y texto explicativo"
      },
      {
        title: "Storytelling en Instagram/TikTok",
        content: "Crea series de historias mostrando desde la idea hasta la entrega del regalo.",
        example: "'Día 1: Quiero sorprender a mi hermana' → 'Día 2: Creando su NFT-wallet' → 'Día 3: Su reacción'"
      },
      {
        title: "Engagement Orgánico",
        content: "Responde preguntas, haz polls, crea contenido interactivo sobre crypto y regalos.",
        example: "Poll: '¿Qué prefieres para tu cumpleaños? A) Regalo tradicional B) NFT-wallet único' + explicación"
      }
    ],
    crypto: [
      {
        title: "Educar sobre Onboarding",
        content: "Posiciona CryptoGift como la puerta de entrada perfecta al mundo crypto para principiantes.",
        example: "Foros crypto: 'Para introducir a tu familia al crypto, CryptoGift es perfecto - no necesitan saber nada técnico'"
      },
      {
        title: "Destacar Token Bound Accounts",
        content: "Explica la tecnología ERC-6551 y cómo cada NFT es una wallet funcional.",
        example: "Twitter: 'Thread sobre Token Bound Accounts y cómo CryptoGift los hace accesibles para todos'"
      },
      {
        title: "Comunidades Específicas",
        content: "Participa en Discord/Telegram de NFTs, DeFi, Web3 con valor genuino antes de mencionar CryptoGift.",
        example: "Ayuda en canales de soporte, luego menciona CryptoGift como solución cuando sea relevante"
      }
    ],
    business: [
      {
        title: "Propuesta para Exchanges",
        content: "Presenta CryptoGift como herramienta de onboarding para sus usuarios novatos.",
        example: "Email: 'Hola, tengo una propuesta para ayudar a sus usuarios a introducir familiares al crypto de forma sencilla'"
      },
      {
        title: "Partnerships con Tiendas",
        content: "Sugiere integración con tiendas online como alternativa de regalo premium.",
        example: "Propuesta: 'Ofrezcan CryptoGift como opción de regalo premium que se diferencia de la competencia'"
      },
      {
        title: "Influencers y Creadores",
        content: "Contacta creadores de contenido crypto para colaboraciones auténticas.",
        example: "'Hola [Nombre], me encanta tu contenido sobre crypto. Te propongo mostrar CryptoGift a tu audiencia'"
      }
    ]
  };

  const workWithUsForm = {
    basics: [
      { name: 'fullName', label: 'Nombre Completo', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'telegram', label: 'Telegram (opcional)', type: 'text' },
      { name: 'country', label: 'País', type: 'text' }
    ],
    experience: [
      { name: 'cryptoExperience', label: 'Experiencia en Crypto', type: 'select', options: ['Principiante', 'Intermedio', 'Avanzado', 'Experto'] },
      { name: 'marketingExperience', label: 'Experiencia en Marketing', type: 'select', options: ['Sin experiencia', 'Básica', 'Intermedia', 'Avanzada', 'Profesional'] },
      { name: 'socialMediaFollowing', label: 'Seguidores en RRSS', type: 'select', options: ['<1K', '1K-10K', '10K-100K', '100K-1M', '>1M'] }
    ],
    goals: [
      { name: 'monthlyGoal', label: 'Meta de Ganancias Mensuales', type: 'select', options: ['$100-500', '$500-1000', '$1000-5000', '$5000-10000', '>$10000'] },
      { name: 'timeCommitment', label: 'Horas semanales disponibles', type: 'select', options: ['1-5 horas', '5-10 horas', '10-20 horas', '20-40 horas', '40+ horas'] },
      { name: 'interests', label: 'Áreas de interés', type: 'textarea' }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            💡 Tips para Maximizar tus Ganancias
          </h1>
          <p className="text-gray-600">
            Guía completa para referir efectivamente CryptoGift Wallets
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Category Selector */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Selecciona tu Área de Influencia</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {tipCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as any)}
                  className={`p-4 rounded-xl text-center transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-purple-500 text-white transform scale-105'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <div className="font-medium">{category.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tips Content */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {tipCategories.find(c => c.id === selectedCategory)?.icon} {tipCategories.find(c => c.id === selectedCategory)?.title}
            </h2>
            
            <div className="space-y-6">
              {tips[selectedCategory].map((tip, index) => (
                <div key={index} className="border-l-4 border-purple-500 pl-6 pb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">{tip.title}</h3>
                  <p className="text-gray-600 mb-4">{tip.content}</p>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-700">
                      <strong>Ejemplo:</strong> {tip.example}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Work With Us Section */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">🤝 ¿Quieres Colaborar con Nosotros?</h2>
              <p className="text-green-100 mb-6">
                La colaboración no es trabajar PARA nosotros. Al ser colaborador serás como un 
                <strong> accionista</strong> y podrás obtener jugosos porcentajes de las ganancias totales.
              </p>
              <div className="bg-white bg-opacity-10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">🎯 Beneficios de Ser Colaborador</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-300">✅</span>
                    <div>Participación en ganancias de toda la plataforma</div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-300">✅</span>
                    <div>Comisiones escalables hasta 40%</div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-300">✅</span>
                    <div>Acceso a herramientas exclusivas</div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-300">✅</span>
                    <div>Participación en decisiones estratégicas</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-green-100 mb-4">
                Completa el formulario y te contactaremos para evaluar tu potencial de colaboración
              </p>
              <button className="bg-white text-green-600 px-8 py-3 rounded-xl font-bold hover:bg-green-50 transition-colors">
                📝 Solicitar Información de Colaboración
              </button>
            </div>
          </div>

          {/* Success Metrics */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Métricas de Éxito</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">Conversión</div>
                <div className="text-sm text-gray-600">
                  Tasa promedio de conversión exitosa: <strong>15-25%</strong>
                </div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-b from-green-50 to-green-100 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">Retención</div>
                <div className="text-sm text-gray-600">
                  Usuarios que crean múltiples regalos: <strong>40%</strong>
                </div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-b from-purple-50 to-purple-100 rounded-xl">
                <div className="text-3xl font-bold text-purple-600 mb-2">Crecimiento</div>
                <div className="text-sm text-gray-600">
                  Referidos que se vuelven referidores: <strong>30%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}