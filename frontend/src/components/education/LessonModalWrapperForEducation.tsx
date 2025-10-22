/**
 * LESSON MODAL WRAPPER FOR EDUCATION - WRAPPER CON MAPEO CORRECTO
 * 
 * Este componente asegura que CADA educational requirement cargue su módulo ESPECÍFICO
 * siguiendo la LEY establecida en EDUCATIONAL_MAPPING_LAW.md
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect } from 'react';
import { LessonModalWrapper } from './LessonModalWrapper';
import { EducationModule } from './EducationModule';
import { getModuleMapping, debugPrintMapping } from '../../lib/educationalModuleMapping';
import { useNotifications } from '../ui/NotificationSystem';

interface LessonModalWrapperForEducationProps {
  moduleId: number;
  sessionToken: string;
  tokenId: string;
  giftId?: string; // CRITICAL FIX: Real giftId for email/appointment saving
  onComplete: (gateData?: string) => void; // FIXED: Accept optional gateData
  giftInfo?: any;
  nftMetadata?: any;
}

export const LessonModalWrapperForEducation: React.FC<LessonModalWrapperForEducationProps> = ({
  moduleId,
  sessionToken,
  tokenId,
  giftId, // CRITICAL FIX: Accept giftId from parent
  onComplete,
  giftInfo,
  nftMetadata
}) => {
  const { addNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Obtener el mapeo correcto para este módulo
  const moduleMapping = getModuleMapping(moduleId);
  
  useEffect(() => {
    // Debug logging para verificar el mapeo
    console.log('🎓 EDUCATIONAL MODULE LOADING:');
    console.log(`  Module ID: ${moduleId}`);
    console.log(`  Mapped to: ${moduleMapping?.name || 'UNKNOWN'}`);
    console.log(`  Lesson ID: ${moduleMapping?.lessonId || 'UNKNOWN'}`);
    console.log(`  Component: ${moduleMapping?.component || 'UNKNOWN'}`);
    
    if (moduleId === 5) {
      console.log('✅ SPECIAL CASE: Proyecto CryptoGift → SalesMasterclass');
    }
    
    // Imprimir todo el mapeo para debug
    if (!moduleMapping) {
      debugPrintMapping();
    }
  }, [moduleId, moduleMapping]);
  
  // Si el módulo no está mapeado, mostrar error
  if (!moduleMapping) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
          Error de Configuración
        </h2>
        <p className="text-red-600 dark:text-red-400 mb-4">
          El módulo educativo #{moduleId} no está configurado correctamente.
        </p>
        <p className="text-sm text-red-500 dark:text-red-500">
          Por favor, contacta al administrador. Error: MODULE_NOT_MAPPED
        </p>
        <button
          onClick={() => {
            console.error('Module not mapped, skipping education');
            onComplete('0x'); // Pass empty gate data for error case
          }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Saltar Educación (Error)
        </button>
      </div>
    );
  }
  
  // Determinar qué componente renderizar basado en el lessonId
  const shouldUseLessonModal = ['sales-masterclass', 'claim-first-gift'].includes(moduleMapping.lessonId);
  
  if (shouldUseLessonModal) {
    // Para Sales Masterclass y Claim First Gift, usar LessonModalWrapper
    return (
      <>
        {/* Botón para abrir el modal */}
        {!isModalOpen && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎓</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {moduleMapping.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {moduleMapping.description}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Tiempo estimado: {moduleMapping.estimatedTime} minutos
              </p>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                       font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 
                       transition-all duration-200 shadow-lg hover:shadow-xl 
                       transform hover:-translate-y-0.5"
            >
              Comenzar Módulo Educativo
            </button>
            
            {moduleId === 5 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  🌟 Este módulo especial te mostrará la visión del Proyecto CryptoGift
                  y cómo puedes ser parte de nuestra comunidad de colaboradores.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Modal con la lección */}
        <LessonModalWrapper
          lessonId={moduleMapping.lessonId}
          mode="educational"
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            // No llamar onComplete aquí, esperar a que la lección se complete
          }}
          tokenId={tokenId}
          giftId={giftId} // CRITICAL FIX: Pass giftId for email/appointment saving
          sessionToken={sessionToken}
          onComplete={(gateData) => {
            console.log('✅ Lesson completed with gate data:', gateData);
            setIsModalOpen(false);
            onComplete(gateData); // CRITICAL FIX: Pass gateData to parent
          }}
        />
      </>
    );
  } else {
    // Para otros módulos, usar EducationModule tradicional
    return (
      <EducationModule
        moduleId={moduleId}
        sessionToken={sessionToken}
        tokenId={tokenId}
        onComplete={() => onComplete('0x')} // EducationModule doesn't provide gateData
        giftInfo={giftInfo}
        nftMetadata={nftMetadata}
        className="mx-auto"
      />
    );
  }
};

export default LessonModalWrapperForEducation;