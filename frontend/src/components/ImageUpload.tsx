"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  onImageUpload: (file: File, url: string) => void;
  onBack: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, onBack }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Create a blob URL for immediate use
      const url = URL.createObjectURL(selectedFile);
      onImageUpload(selectedFile, url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Sube tu Arte</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Carga una foto personal que se convertirá en un NFT único
        </p>
      </div>

      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {isDragActive
                  ? 'Suelta la imagen aquí...'
                  : 'Arrastra una imagen aquí'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                o haz clic para seleccionar
              </p>
            </div>
            
            <div className="text-xs text-gray-400 dark:text-gray-500">
              PNG, JPG, GIF hasta 10MB
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Image
              src={preview}
              alt="Preview"
              width={600}
              height={320}
              className="w-full h-80 object-cover rounded-2xl"
            />
            <button
              onClick={removeImage}
              className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFile?.name} ({(selectedFile?.size! / 1024 / 1024).toFixed(1)} MB)
            </p>
          </div>
        </div>
      )}

      {/* Pro Tips */}
      <div className="bg-blue-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 dark:text-gray-300 mb-2">💡 Tips para mejores resultados:</h3>
        <ul className="text-sm text-blue-700 dark:text-gray-400 space-y-1">
          <li>• Usa fotos con buena iluminación</li>
          <li>• Evita imágenes muy pixeladas</li>
          <li>• Las fotos verticales funcionan mejor</li>
          <li>• ¡Rostros y paisajes son perfectos!</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white"
        >
          Atrás
        </button>
        
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Subiendo...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};