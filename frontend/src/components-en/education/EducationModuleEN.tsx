import React, { useState, useEffect } from 'react';
// Removed: import { useRouter } from 'next/navigation'; - not needed in Pages Router
import { useNotifications } from '../../components/ui/NotificationSystem';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../src/app/client';
import { useAuth } from '../../hooks/useAuth';

interface EducationModuleProps {
  moduleId: number;
  sessionToken: string;
  tokenId: string;
  onComplete: () => void;
  className?: string;
  giftInfo?: any; // Para poder acceder a la información del regalo
  nftMetadata?: any; // Para mostrar la información del NFT
}

interface ModuleContent {
  id: number;
  title: string;
  sections: ModuleSection[];
  quiz: QuizQuestion[];
  passingScore: number;
}

interface ModuleSection {
  id: string;
  title: string;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
  };
  keyPoints?: string[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Module content database (would be in backend/CMS in production)
const MODULE_DATABASE: Record<number, ModuleContent> = {
  1: {
    id: 1,
    title: 'Crear Wallet Segura',
    sections: [
      {
        id: 'intro',
        title: '¿Qué es una Wallet de Criptomonedas?',
        content: 'Una wallet (billetera) de criptomonedas es como tu cuenta bancaria digital, pero tú tienes el control total. A diferencia de un banco, nadie más puede acceder a tus fondos si proteges bien tus claves.',
        keyPoints: [
          'Es tu identidad en blockchain',
          'Almacena tus activos digitales',
          'Tú eres el único responsable de su seguridad',
          'No hay "recuperar contraseña" como en apps tradicionales'
        ]
      },
      {
        id: 'metamask',
        title: 'Instalando MetaMask',
        content: 'MetaMask es la wallet más popular y fácil de usar. Es una extensión de navegador que te permite interactuar con aplicaciones blockchain.',
        keyPoints: [
          'Descarga solo desde metamask.io',
          'Verifica siempre la URL oficial',
          'Nunca instales desde enlaces en emails',
          'Funciona en Chrome, Firefox, Brave y Edge'
        ]
      },
      {
        id: 'seedphrase',
        title: 'Tu Frase Semilla - ¡CRÍTICO!',
        content: 'La frase semilla (12-24 palabras) es la ÚNICA forma de recuperar tu wallet. Es literalmente la llave maestra a todos tus fondos.',
        keyPoints: [
          'NUNCA la compartas con NADIE',
          'NUNCA la escribas en digital',
          'Guárdala en papel en lugar seguro',
          'Considera hacer 2 copias en lugares diferentes',
          'NUNCA la ingreses en sitios web'
        ]
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: '¿Cuál es la forma más segura de guardar tu frase semilla?',
        options: [
          'En un archivo de texto en mi computadora',
          'En un papel guardado en lugar seguro',
          'En mi email para no perderla',
          'En una foto en mi teléfono'
        ],
        correctAnswer: 1,
        explanation: 'La frase semilla debe guardarse OFFLINE, preferiblemente escrita en papel y en un lugar seguro. Nunca en formato digital.'
      },
      {
        id: 'q2',
        question: '¿Qué debes verificar SIEMPRE antes de instalar MetaMask?',
        options: [
          'Que sea gratis',
          'Que la URL sea metamask.io',
          'Que tenga buenos reviews',
          'Que funcione en mi navegador'
        ],
        correctAnswer: 1,
        explanation: 'Siempre verifica que estés en el sitio oficial metamask.io. Hay muchos sitios falsos que roban tus fondos.'
      },
      {
        id: 'q3',
        question: 'Si alguien del "soporte de MetaMask" te pide tu frase semilla, ¿qué haces?',
        options: [
          'Se la doy para que me ayuden',
          'Verifico primero su identidad',
          'NUNCA la comparto, es una estafa',
          'Solo si es urgente'
        ],
        correctAnswer: 2,
        explanation: 'MetaMask NUNCA te pedirá tu frase semilla. Cualquiera que la pida es un estafador, sin excepción.'
      }
    ],
    passingScore: 100 // Must get all correct for security module
  },
  2: {
    id: 2,
    title: 'Seguridad Básica',
    sections: [
      {
        id: 'threats',
        title: 'Amenazas Comunes',
        content: 'El mundo crypto es seguro si conoces los riesgos. La mayoría de pérdidas son por descuido del usuario, no por hackeos.',
        keyPoints: [
          'Phishing: Sitios web falsos',
          'Scam tokens: Tokens falsos enviados a tu wallet',
          'Rug pulls: Proyectos que desaparecen con el dinero',
          'Social engineering: Manipulación psicológica'
        ]
      },
      {
        id: 'protection',
        title: 'Cómo Protegerte',
        content: 'Con estas prácticas básicas, estarás más seguro que el 99% de usuarios.',
        keyPoints: [
          'Verifica SIEMPRE las URLs',
          'Nunca apruebes transacciones que no entiendas',
          'Usa una wallet separada para testing',
          'Revoca permisos regularmente en revoke.cash',
          'Si algo parece demasiado bueno, probablemente es estafa'
        ]
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: '¿Cuál es la estafa más común en crypto?',
        options: [
          'Hackeo de blockchain',
          'Phishing y sitios web falsos',
          'Virus en la computadora',
          'Robo físico'
        ],
        correctAnswer: 1,
        explanation: 'El phishing (sitios web falsos) es responsable de la mayoría de pérdidas en crypto.'
      },
      {
        id: 'q2',
        question: 'Recibes 1000 tokens gratis en tu wallet. ¿Qué haces?',
        options: [
          'Los vendo inmediatamente',
          'Los transfiero a otra wallet',
          'NO los toco, probablemente es scam',
          'Investigo el proyecto primero'
        ],
        correctAnswer: 2,
        explanation: 'Tokens no solicitados son casi siempre scams. Al interactuar con ellos, pueden vaciar tu wallet.'
      }
    ],
    passingScore: 100
  }
};

export const EducationModuleEN: React.FC<EducationModuleProps> = ({
  moduleId,
  sessionToken,
  tokenId,
  onComplete,
  className = '',
  giftInfo,
  nftMetadata
}) => {
  // Removed: const router = useRouter(); - not needed in this component
  const { addNotification } = useNotifications();
  const account = useActiveAccount();
  const auth = useAuth();
  
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionProgress, setSectionProgress] = useState<Record<string, boolean>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanations, setShowExplanations] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [educationCompleted, setEducationCompleted] = useState(false);
  const [waitingForWallet, setWaitingForWallet] = useState(false);

  const module = MODULE_DATABASE[moduleId];
  
  if (!module) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Módulo no encontrado</p>
      </div>
    );
  }

  const currentSectionData = module.sections[currentSection];
  const allSectionsRead = module.sections.every(s => sectionProgress[s.id]);
  const canStartQuiz = allSectionsRead && !quizStarted;
  const canNavigateNext = currentSection < module.sections.length - 1;

  // Mark section as read
  const markSectionRead = () => {
    setSectionProgress({
      ...sectionProgress,
      [currentSectionData.id]: true
    });
  };

  // Navigate between sections
  const goToNextSection = () => {
    markSectionRead();
    if (canNavigateNext) {
      setCurrentSection(currentSection + 1);
    } else if (canStartQuiz) {
      setQuizStarted(true);
    }
  };

  const goToPreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  // Quiz handling
  const handleQuizAnswer = (questionId: string, answerIndex: number) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionId]: answerIndex
    });
  };

  const submitQuiz = async () => {
    // Calculate score
    let correct = 0;
    module.quiz.forEach(question => {
      if (quizAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    
    const score = Math.round((correct / module.quiz.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    setShowExplanations(true);

    if (score >= module.passingScore) {
      // Module completed successfully
      setEducationCompleted(true);
      
      addNotification({
        type: 'success',
        title: '🎉 ¡Módulo Completado!',
        message: `Has aprobado con ${score}% de respuestas correctas`,
        duration: 5000
      });

      // Record completion
      try {
        await fetch('/api/education/complete-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken,
            moduleId,
            score,
            tokenId
          })
        });
      } catch (error) {
        console.error('Failed to record module completion:', error);
      }

      // NO navegamos automáticamente - ahora el usuario debe conectar wallet y reclamar
      // setTimeout(() => {
      //   onComplete();
      // }, 2000);
    } else {
      // Failed - need to retry
      addNotification({
        type: 'error',
        title: '❌ No Aprobado',
        message: `Necesitas ${module.passingScore}% para aprobar. Obtuviste ${score}%`,
        duration: 5000
      });
    }
  };

  const retryQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setShowExplanations(false);
    setEducationCompleted(false);
  };

  // Handle claim with wallet connection - EJECUTA TODO EL PROCESO EN ESTA PÁGINA
  const handleCompleteEducationAndClaim = async () => {
    // Esta función se llama SOLO cuando el wallet ya está conectado
    // El botón maneja la conexión primero si es necesario
    
    if (!account) {
      // Esto no debería pasar porque el botón maneja la conexión primero
      console.error('No account found when trying to claim');
      return;
    }

    setIsProcessingClaim(true);

    try {
      // PASO 1: Solicitar aprobación educativa con EIP-712
      console.log('🎓 PASO 1: Solicitando aprobación educativa con wallet conectada...');
      addNotification({
        type: 'info',
        title: '📝 Generando firma EIP-712',
        message: 'Confirmando que completaste los requisitos educativos...',
        duration: 3000
      });

      const approvalResponse = await fetch('/api/education/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          sessionToken,
          claimerAddress: account.address
        })
      });

      const approvalData = await approvalResponse.json();

      if (!approvalData.success || !approvalData.educationGateData) {
        throw new Error(approvalData.error || 'No se pudo obtener la aprobación educativa');
      }

      console.log('✅ PASO 1 COMPLETADO: EIP-712 signature obtenida:', approvalData.educationGateData);
      
      // PASO 2: Proceder con el claim usando la firma EIP-712
      console.log('🎁 PASO 2: Procesando reclamo del NFT con educational gate data...');
      addNotification({
        type: 'info',
        title: '🎁 Reclamando tu regalo',
        message: 'Transfiriendo el NFT a tu wallet...',
        duration: 3000
      });

      // Llamar al endpoint de claim con la firma educativa
      const claimResponse = await fetch('/api/claim-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          sessionToken,
          educationGateData: approvalData.educationGateData,
          claimerAddress: account.address
        })
      });

      const claimData = await claimResponse.json();

      if (claimData.success) {
        console.log('✅ PASO 2 COMPLETADO: NFT reclamado exitosamente');
        addNotification({
          type: 'success',
          title: '🎉 ¡Regalo Reclamado!',
          message: 'El NFT ha sido transferido exitosamente a tu wallet',
          duration: 5000
        });
        
        // Esperar un momento y luego llamar onComplete para actualizar la UI
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        throw new Error(claimData.error || 'Error al reclamar el NFT');
      }
    } catch (error) {
      console.error('❌ Error en el proceso de reclamo:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Error al procesar la solicitud',
        duration: 5000
      });
    } finally {
      setIsProcessingClaim(false);
    }
  };

  // Efecto para detectar cuando se conecta la wallet después de hacer clic en el botón
  useEffect(() => {
    // SOLO procesar si estábamos esperando una wallet
    if (waitingForWallet && account && educationCompleted && !isProcessingClaim) {
      console.log('🔗 Wallet conectada después de completar educación, procesando claim automáticamente...');
      setWaitingForWallet(false);
      handleCompleteEducationAndClaim();
    }
  }, [account, waitingForWallet]); // Se ejecuta cuando cambia el account Y estábamos esperando

  // Progress calculation
  const totalSteps = module.sections.length + 1; // +1 for quiz
  const currentStep = quizStarted ? module.sections.length + 1 : currentSection + 1;
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className={`max-w-3xl mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{module.title}</h1>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso del Módulo</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {!quizStarted ? (
            // Educational Content
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {currentSectionData.title}
                </h2>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {currentSectionData.content}
                </p>

                {currentSectionData.keyPoints && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                      Puntos Clave:
                    </h3>
                    <ul className="space-y-2">
                      {currentSectionData.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">✓</span>
                          <span className="text-gray-700 dark:text-gray-300">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Section Progress Indicator */}
                <div className="flex justify-center mt-6 space-x-2">
                  {module.sections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentSection 
                          ? 'bg-blue-600' 
                          : sectionProgress[section.id]
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={goToPreviousSection}
                  disabled={currentSection === 0}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 
                           dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
                >
                  ← Anterior
                </button>

                {sectionProgress[currentSectionData.id] && (
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    ✓ Sección leída
                  </span>
                )}

                <button
                  onClick={goToNextSection}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors font-medium"
                >
                  {canNavigateNext ? 'Siguiente →' : canStartQuiz ? 'Iniciar Quiz →' : 'Marcar como Leído'}
                </button>
              </div>
            </div>
          ) : (
            // Quiz Section
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Evaluación del Módulo
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Responde correctamente para completar el módulo
                </p>
              </div>

              {!quizSubmitted ? (
                // Quiz Questions
                <div className="space-y-6">
                  {module.quiz.map((question, qIndex) => (
                    <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <p className="font-medium text-gray-900 dark:text-white mb-3">
                        {qIndex + 1}. {question.question}
                      </p>
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <label 
                            key={oIndex}
                            className="flex items-start cursor-pointer p-3 rounded-lg hover:bg-gray-50 
                                     dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <input
                              type="radio"
                              name={question.id}
                              checked={quizAnswers[question.id] === oIndex}
                              onChange={() => handleQuizAnswer(question.id, oIndex)}
                              className="mt-1 mr-3"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(quizAnswers).length < module.quiz.length}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white 
                             font-semibold rounded-lg hover:shadow-lg transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar Respuestas
                  </button>
                </div>
              ) : (
                // Quiz Results
                <div className="space-y-6">
                  <div className={`p-6 rounded-lg text-center ${
                    quizScore >= module.passingScore 
                      ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                      : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                  }`}>
                    <div className="text-4xl mb-2">
                      {quizScore >= module.passingScore ? '🎉' : '😔'}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      {quizScore >= module.passingScore ? '¡Aprobado!' : 'No Aprobado'}
                    </h3>
                    <p className="text-lg">
                      Tu puntuación: <span className="font-bold">{quizScore}%</span>
                    </p>
                    <p className="text-sm mt-2 opacity-75">
                      Puntuación requerida: {module.passingScore}%
                    </p>
                  </div>

                  {/* Show explanations */}
                  {showExplanations && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Revisión de Respuestas:
                      </h4>
                      {module.quiz.map((question, index) => {
                        const userAnswer = quizAnswers[question.id];
                        const isCorrect = userAnswer === question.correctAnswer;
                        
                        return (
                          <div 
                            key={question.id}
                            className={`p-4 rounded-lg border ${
                              isCorrect 
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            }`}
                          >
                            <p className="font-medium mb-2">
                              {index + 1}. {question.question}
                            </p>
                            <p className="text-sm mb-1">
                              Tu respuesta: {question.options[userAnswer]} {isCorrect ? '✅' : '❌'}
                            </p>
                            {!isCorrect && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Respuesta correcta: {question.options[question.correctAnswer]}
                              </p>
                            )}
                            <p className="text-sm mt-2 text-gray-600 dark:text-gray-400 italic">
                              💡 {question.explanation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {quizScore < module.passingScore && (
                    <button
                      onClick={retryQuiz}
                      className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg 
                               hover:bg-blue-700 transition-colors"
                    >
                      Intentar Nuevamente
                    </button>
                  )}

                  {/* NUEVO: Botón para completar educación y reclamar cuando aprueba */}
                  {educationCompleted && quizScore >= module.passingScore && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="flex items-start">
                          <span className="text-2xl mr-3 flex-shrink-0">🎯</span>
                          <div>
                            <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-1">
                              ¡Felicidades! 🎉
                            </h4>
                            <p className="text-sm text-purple-700 dark:text-purple-400">
                              Tu puntuación: <span className="font-bold">{quizAnswers && Object.keys(quizAnswers).filter(qId => {
                                const q = module.quiz.find(question => question.id === qId);
                                return q && quizAnswers[qId] === q.correctAnswer;
                              }).length}/{module.quiz.length}</span> respuestas correctas
                            </p>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                              Has completado exitosamente los requisitos educativos. 
                              Ahora puedes reclamar tu regalo.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* UN SOLO BOTÓN QUE MANEJA TODO */}
                      {!account ? (
                        // Si NO hay wallet conectada, el botón conecta la wallet
                        <div onClick={() => setWaitingForWallet(true)}>
                          <ConnectButton
                            client={client}
                            appMetadata={{
                              name: "CryptoGift Wallets",
                              url: typeof window !== 'undefined' ? window.location.origin : '',
                            }}
                            connectButton={{
                              label: "🎁 Completar Educación y Reclamar Regalo",
                              className: "w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            }}
                            walletConnect={{
                              projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "e9e9be7c66f8a4fb50b54b5a6f39a0cf"
                            }}
                          />
                        </div>
                      ) : isProcessingClaim ? (
                        // Mientras procesa, muestra el estado de carga
                        <button
                          disabled
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                                   font-bold rounded-lg opacity-75 cursor-not-allowed"
                        >
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando reclamo...
                          </div>
                        </button>
                      ) : (
                        // Si YA hay wallet conectada, el botón procesa el claim
                        <button
                          onClick={handleCompleteEducationAndClaim}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                                   font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 
                                   transition-all duration-200 shadow-lg hover:shadow-xl 
                                   transform hover:-translate-y-0.5"
                        >
                          <span className="flex items-center justify-center">
                            <span className="mr-2">🎁</span>
                            Completar Educación y Reclamar Regalo
                          </span>
                        </button>
                      )}

                      {/* Trust indicators */}
                      <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          100% Seguro
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-blue-500">🔒</span>
                          Blockchain verificado
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-purple-500">💎</span>
                          NFT con valor real
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};