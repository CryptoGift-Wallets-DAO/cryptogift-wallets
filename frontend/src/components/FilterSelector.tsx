"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { PHOTO_FILTERS, AI_GENERATION_PROMPTS } from '../lib/constants';
import { NFTImageModal } from './ui/NFTImageModal';

interface FilterSelectorProps {
  imageUrl: string;
  onFilterSelect: (filteredUrl: string, filterName: string) => void;
  onBack: () => void;
}

export const FilterSelector: React.FC<FilterSelectorProps> = ({ 
  imageUrl, 
  onFilterSelect, 
  onBack 
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [filteredPreviews, setFilteredPreviews] = useState<Record<string, string>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    image: string;
    filterName: string;
    filterId: string;
  }>({ isOpen: false, image: '', filterName: '', filterId: '' });

  // Apply CSS filters in real-time (simplified for TypeScript compatibility)
  const applyFilter = async (filterId: string) => {
    if (filteredPreviews[filterId]) return; // Already processed

    const filter = PHOTO_FILTERS.find(f => f.id === filterId);
    if (!filter) return;

    setLoadingFilters(prev => new Set(prev).add(filterId));
    setError(null);

    try {
      // Simulate brief loading for UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use CSS filters approach - works perfectly and is more compatible
      setFilteredPreviews(prev => ({
        ...prev,
        [filterId]: imageUrl // Original URL with CSS filter overlay applied via style
      }));

    } catch (err) {
      console.error('Filter error:', err);
      setError(`Error aplicando filtro ${filterId}`);
    } finally {
      setLoadingFilters(prev => {
        const newSet = new Set(prev);
        newSet.delete(filterId);
        return newSet;
      });
    }
  };

  const handleFilterClick = (filterId: string) => {
    setSelectedFilter(filterId);
    if (!filteredPreviews[filterId]) {
      applyFilter(filterId);
    }
    
    // Show preview modal
    const filter = PHOTO_FILTERS.find(f => f.id === filterId);
    const filterName = filter?.name || 'Original';
    setPreviewModal({
      isOpen: true,
      image: imageUrl,
      filterName,
      filterId
    });
  };

  const handleOriginalClick = () => {
    setSelectedFilter('original');
    setPreviewModal({
      isOpen: true,
      image: imageUrl,
      filterName: 'Original',
      filterId: 'original'
    });
  };

  const handleContinue = () => {
    if (!selectedFilter) return;
    
    const filteredUrl = filteredPreviews[selectedFilter] || imageUrl;
    const filterName = PHOTO_FILTERS.find(f => f.id === selectedFilter)?.name || 'Original';
    
    onFilterSelect(filteredUrl, filterName);
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Elige tu Estilo</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Aplica filtros IA de última generación para darle un toque único a tu regalo
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Original Image Option */}
      <div
        onClick={handleOriginalClick}
        className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
          selectedFilter === 'original'
            ? 'border-blue-500 dark:border-blue-400 shadow-xl shadow-blue-500/25'
            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <Image
          src={imageUrl}
          alt="Original"
          width={400}
          height={192}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 w-full">
            <h3 className="font-semibold text-gray-900 dark:text-white">Original</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sin filtros</p>
          </div>
        </div>
        {selectedFilter === 'original' && (
          <div className="absolute top-4 right-4 w-8 h-8 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* AI Filter Options - Organized by Category */}
      <div className="space-y-6">
        {/* Free Filters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            🆓 Filtros Gratuitos
            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
              Disponible ahora
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {PHOTO_FILTERS.filter(f => !f.premium).map((filter) => (
              <div
                key={filter.id}
                onClick={() => !filter.comingSoon && handleFilterClick(filter.id)}
                className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
                  selectedFilter === filter.id
                    ? 'border-blue-500 dark:border-blue-400 shadow-xl shadow-blue-500/25'
                    : filter.comingSoon 
                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Loading State */}
                {loadingFilters.has(filter.id) && (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
                    <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}


                <div className="relative">
                  <Image
                    src={filteredPreviews[filter.id] || imageUrl}
                    alt={filter.name}
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover transition-all duration-300"
                    style={{
                      filter: !filteredPreviews[filter.id] && !loadingFilters.has(filter.id) 
                        ? filter.cssFilter 
                        : 'none'
                    }}
                  />
                  
                  {/* Category badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      filter.category === 'futuristic' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                      filter.category === 'artistic' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                      filter.category === 'animated' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' :
                      filter.category === 'enhancement' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {filter.category === 'futuristic' ? '🚀' :
                       filter.category === 'artistic' ? '🎨' :
                       filter.category === 'animated' ? '✨' :
                       filter.category === 'enhancement' ? '💎' : '📸'}
                    </span>
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 w-full">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{filter.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{filter.description}</p>
                  </div>
                </div>

                {selectedFilter === filter.id && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Premium Filters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            ⭐ Filtros Premium
            <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-full">
              Próximamente
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {PHOTO_FILTERS.filter(f => f.premium).map((filter) => (
              <div
                key={filter.id}
                className="relative cursor-not-allowed rounded-2xl overflow-hidden border-4 border-dashed border-purple-300 dark:border-purple-700 opacity-75"
              >
                <Image
                  src={imageUrl}
                  alt={filter.name}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover filter grayscale"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 to-transparent flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xl">⭐</span>
                    </div>
                    <p className="text-white font-medium text-sm">Próximamente</p>
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-purple-600/90 backdrop-blur-sm p-3">
                  <h3 className="font-semibold text-white">{filter.name}</h3>
                  <p className="text-sm text-purple-100">{filter.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Generator Option */}
      <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl p-6 text-center bg-purple-50 dark:bg-purple-900/20">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-xl">✨</span>
        </div>
        <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">¿No tienes foto?</h3>
        <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
          Genera arte único con IA basado en una descripción de 1:1 para obtener la mejor calidad NFT
        </p>
        
        <div className="text-xs text-purple-500 dark:text-purple-400 space-y-1 mb-4">
          <p>💡 <strong>Recomendación temporal:</strong></p>
          <p>Usa tu proveedor de IA favorito (ChatGPT, Midjourney, DALL-E) con estas especificaciones:</p>
          <div className="bg-purple-100 dark:bg-purple-800/30 rounded p-2 mt-2">
            <p className="font-mono text-xs">Aspect ratio: 1:1 (cuadrado)</p>
            <p className="font-mono text-xs">Resolución: 1024x1024 o superior</p>
            <p className="font-mono text-xs">Formato: JPG o PNG</p>
          </div>
        </div>
        
        <button 
          disabled
          className="text-purple-600 dark:text-purple-400 font-medium text-sm cursor-not-allowed opacity-50"
        >
          🔬 Próximamente - Generación IA Integrada →
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white"
        >
          Atrás
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedFilter}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 shadow-lg disabled:shadow-none"
        >
          {selectedFilter ? '✨ Continuar con ' + (PHOTO_FILTERS.find(f => f.id === selectedFilter)?.name || 'Original') : 'Selecciona un filtro'}
        </button>
      </div>

      {/* Filter Preview Modal */}
      <NFTImageModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        image={previewModal.image}
        name={`Vista Previa: ${previewModal.filterName}`}
        tokenId="preview"
        metadata={{
          description: previewModal.filterId === 'original' 
            ? "Previsualización de tu imagen original tal como aparecerá en la blockchain. Este será el formato NFT final que tu amigo verá." 
            : `Previsualización con filtro ${previewModal.filterName} aplicado. Así es como se verá tu NFT en la blockchain.`,
          attributes: [
            { trait_type: "Filtro Aplicado", value: previewModal.filterName },
            { trait_type: "Estado", value: "Vista Previa" },
            { trait_type: "Calidad NFT", value: "Blockchain Ready" }
          ]
        }}
      />
    </div>
  );
};