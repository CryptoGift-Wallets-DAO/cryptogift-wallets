'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { getLucideIconForEmoji, containsEmoji, extractEmojis } from '../../config/iconMapping';

interface SmartIconProps {
  icon?: string | LucideIcon;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
  fallback?: LucideIcon;
  title?: string;
  ariaLabel?: string;
}

/**
 * SmartIcon Component
 * 
 * Intelligently renders either an emoji or a Lucide icon based on the input.
 * Provides automatic emoji-to-Lucide conversion for gradual migration.
 * 
 * Usage:
 * - Pass an emoji string: <SmartIcon icon="🎁" />
 * - Pass a Lucide icon: <SmartIcon icon={Gift} />
 * - Automatic conversion: Emojis are converted to their Lucide equivalents
 * 
 * Features:
 * - Automatic emoji detection and conversion
 * - Consistent sizing and styling
 * - Accessibility support with aria-label
 * - Fallback icon support
 * - Smooth transition during migration
 */
export const SmartIcon: React.FC<SmartIconProps> = ({
  icon,
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2,
  fallback,
  title,
  ariaLabel,
}) => {
  // If no icon provided, render nothing
  if (!icon) {
    return null;
  }

  // Check if the icon is a string (potential emoji)
  if (typeof icon === 'string') {
    // Check if the string contains emojis
    if (containsEmoji(icon)) {
      // Extract the first emoji and get its Lucide equivalent
      const emojis = extractEmojis(icon);
      const firstEmoji = emojis[0];
      
      if (firstEmoji) {
        const LucideIcon = getLucideIconForEmoji(firstEmoji);
        
        return (
          <span title={title || `Icon for ${firstEmoji}`} aria-label={ariaLabel || title || `Icon representing ${firstEmoji}`}>
            <LucideIcon
              size={size}
              className={`smart-icon ${className}`}
              color={color}
              strokeWidth={strokeWidth}
            />
          </span>
        );
      }
    }
    
    // If it's a string but not an emoji, try to render it as text
    // This shouldn't happen in normal usage but provides a fallback
    return (
      <span 
        className={`smart-icon-text ${className}`}
        style={{ fontSize: size, color }}
        title={title}
        aria-label={ariaLabel || title}
      >
        {icon}
      </span>
    );
  }

  // If icon is already a Lucide component, render it directly
  const LucideComponent = icon as LucideIcon;
  
  return (
    <span title={title} aria-label={ariaLabel || title}>
      <LucideComponent
        size={size}
        className={`smart-icon ${className}`}
        color={color}
        strokeWidth={strokeWidth}
      />
    </span>
  );
};

/**
 * IconWithText Component
 * 
 * Combines an icon with text, useful for buttons and menu items.
 * Automatically handles emoji-to-Lucide conversion.
 */
interface IconWithTextProps extends SmartIconProps {
  text: string;
  textClassName?: string;
  spacing?: 'tight' | 'normal' | 'wide';
  position?: 'before' | 'after';
}

export const IconWithText: React.FC<IconWithTextProps> = ({
  text,
  textClassName = '',
  spacing = 'normal',
  position = 'before',
  ...iconProps
}) => {
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-2',
    wide: 'gap-3',
  };

  const containerClass = `inline-flex items-center ${spacingClasses[spacing]}`;

  const iconElement = <SmartIcon {...iconProps} />;
  const textElement = <span className={textClassName}>{text}</span>;

  return (
    <div className={containerClass}>
      {position === 'before' ? (
        <>
          {iconElement}
          {textElement}
        </>
      ) : (
        <>
          {textElement}
          {iconElement}
        </>
      )}
    </div>
  );
};

/**
 * Helper hook to get the appropriate icon
 * Useful for conditional rendering based on state
 */
export const useSmartIcon = (emojiOrIcon: string | LucideIcon): LucideIcon | null => {
  if (!emojiOrIcon) return null;
  
  if (typeof emojiOrIcon === 'string' && containsEmoji(emojiOrIcon)) {
    const emojis = extractEmojis(emojiOrIcon);
    if (emojis[0]) {
      return getLucideIconForEmoji(emojis[0]);
    }
  }
  
  if (typeof emojiOrIcon === 'function') {
    return emojiOrIcon as LucideIcon;
  }
  
  return null;
};

export default SmartIcon;