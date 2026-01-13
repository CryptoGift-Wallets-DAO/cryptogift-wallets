"use client";

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { CategoryTabsProps, CategoryType } from '@/types/modelos';

// Get icon component from string name
function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Box;
}

// Category color classes for active state
const categoryActiveColors: Record<CategoryType, string> = {
  onboarding: 'from-amber-500 to-orange-500',
  campaigns: 'from-blue-500 to-cyan-500',
  competitions: 'from-red-500 to-pink-500',
  governance: 'from-purple-500 to-violet-500',
  finance: 'from-green-500 to-emerald-500',
  gaming: 'from-pink-500 to-rose-500',
  social: 'from-indigo-500 to-blue-500',
  enterprise: 'from-slate-500 to-gray-500'
};

export function CategoryTabs({ activeCategory, onCategoryChange, categories }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollability, 300);
    }
  };

  const allCategories = [
    {
      id: 'all' as const,
      label: 'Todos',
      labelEn: 'All',
      icon: 'LayoutGrid',
      colorFrom: 'white',
      colorTo: 'gray-300',
      description: 'Ver todos los modelos',
      descriptionEn: 'View all models'
    },
    ...categories
  ];

  return (
    <div className="relative">
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                     w-8 h-8 rounded-full bg-gray-900/80 backdrop-blur-sm
                     border border-white/10 flex items-center justify-center
                     text-white/70 hover:text-white hover:bg-gray-800
                     transition-all shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollRef}
        onScroll={checkScrollability}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allCategories.map((category) => {
          const IconComponent = getIcon(category.icon);
          const isActive = activeCategory === category.id;
          const gradientColors = category.id === 'all'
            ? 'from-white/20 to-gray-400/20'
            : categoryActiveColors[category.id as CategoryType];

          return (
            <motion.button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-xl
                font-medium text-sm whitespace-nowrap
                transition-all duration-300
                ${isActive
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                }
              `}
            >
              {/* Active gradient background */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 bg-gradient-to-r ${gradientColors} rounded-xl`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              {/* Content */}
              <span className="relative flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                <span>{category.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                     w-8 h-8 rounded-full bg-gray-900/80 backdrop-blur-sm
                     border border-white/10 flex items-center justify-center
                     text-white/70 hover:text-white hover:bg-gray-800
                     transition-all shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Gradient fades */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none opacity-0" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none opacity-0" />
    </div>
  );
}

export default CategoryTabs;
