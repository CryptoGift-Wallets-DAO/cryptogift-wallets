/**
 * EDUCATIONAL MASTERCLASS WRAPPER
 * Integrates Sales Masterclass as Educational Requirement
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React from 'react';
import { useActiveAccount } from 'thirdweb/react';

// KnowledgeLessonModal handles confetti internally

// Import the Knowledge Lesson Modal directly (no dynamic import needed)
import { KnowledgeLessonModal } from './KnowledgeLessonModal';

interface EducationalMasterclassProps {
  tokenId: string;
  sessionToken: string;
  onComplete: (gateData: string) => void;
  onClose?: () => void;
}

export const EducationalMasterclass: React.FC<EducationalMasterclassProps> = ({
  tokenId,
  sessionToken,
  onComplete,
  onClose
}) => {
  // Simple pass-through to handle the API call for completion
  const handleMasterclassComplete = async (gateData: string) => {
    console.log('📚 Educational lesson completed, calling parent onComplete with gateData:', gateData);
    onComplete(gateData);
  };

  // Direct render of Knowledge Lesson Modal - no wrapper needed
  const renderEducationalContent = () => {
    return (
      <KnowledgeLessonModal
        lessonId="proyecto-cryptogift"
        tokenId={tokenId}
        sessionToken={sessionToken}
        onComplete={handleMasterclassComplete}
        onClose={onClose}
      />
    );
  };

  // KnowledgeLessonModal handles its own modal state and rendering
  return renderEducationalContent();
};

export default EducationalMasterclass;