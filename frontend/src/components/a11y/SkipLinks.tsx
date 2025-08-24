/**
 * Skip Links Component
 * WCAG 2.2 AA - Bypass blocks (2.4.1)
 */

'use client';

import React from 'react';
import { getA11yConfig } from '@/lib/a11y/config';

interface SkipLink {
  id: string;
  text: string;
  target: string;
}

const DEFAULT_LINKS: SkipLink[] = [
  { id: 'skip-to-main', text: 'Skip to main content', target: '#main-content' },
  { id: 'skip-to-nav', text: 'Skip to navigation', target: '#main-nav' },
  { id: 'skip-to-footer', text: 'Skip to footer', target: '#footer' },
];

interface SkipLinksProps {
  links?: SkipLink[];
}

export function SkipLinks({ links = DEFAULT_LINKS }: SkipLinksProps) {
  const config = getA11yConfig();
  
  if (!config.skipLinks) return null;
  
  return (
    <div className="skip-links" role="navigation" aria-label="Skip links">
      {links.map(link => (
        <a
          key={link.id}
          href={link.target}
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            const target = document.querySelector(link.target);
            if (target) {
              (target as HTMLElement).focus();
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          {link.text}
        </a>
      ))}
      
      <style jsx>{`
        .skip-links {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10000;
        }
        
        .skip-link {
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
          text-decoration: none;
        }
        
        .skip-link:focus {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 10001;
          width: auto;
          height: auto;
          padding: 12px 20px;
          background-color: #0052ff;
          color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 16px;
          font-weight: 500;
          outline: 2px solid white;
          outline-offset: 2px;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .skip-link:focus {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}