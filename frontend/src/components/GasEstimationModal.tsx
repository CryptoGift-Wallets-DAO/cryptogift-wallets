'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface GasEstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedGas: string;
  gasPrice: string;
  totalCost: string;
  networkName: string;
}

export const GasEstimationModal: React.FC<GasEstimationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  estimatedGas,
  gasPrice,
  totalCost,
  networkName
}) => {
  const t = useTranslations('gasModal');
  const [understood, setUnderstood] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">⚠️ {t('title')}</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Gas Details - Compact */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700 mb-2">
              {t('gaslessFailed')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">{t('network')}</span>
                <div className="font-medium">{networkName}</div>
              </div>
              <div>
                <span className="text-gray-600">{t('cost')}</span>
                <div className="font-bold text-blue-600">{totalCost} ETH</div>
              </div>
            </div>
          </div>

          {/* What happens - Compact */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-semibold text-green-800 text-sm mb-2">✅ {t('whatHappens.title')}</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• {t('whatHappens.point1')}</li>
              <li>• {t('whatHappens.point2')}</li>
              <li>• {t('whatHappens.point3')}</li>
            </ul>
          </div>

          {/* Important notice - Compact */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              ⚠️ {t('warning')}
            </p>
          </div>

          {/* User confirmation - Compact */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">
                {t('understand')}
              </span>
            </label>
          </div>
        </div>

        {/* Actions - Fixed */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm"
            >
              {t('buttons.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={!understood}
              className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {t('buttons.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GasEstimationModal;