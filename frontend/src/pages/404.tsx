/**
 * CUSTOM 404 PAGE
 * Optimiza la generación estática del 404 page
 * Requerido cuando existe _error.tsx personalizado
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-8">Página no encontrada</p>
        <a 
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-lg hover:scale-105 transition-all"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}