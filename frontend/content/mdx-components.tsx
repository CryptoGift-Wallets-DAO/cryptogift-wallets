import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Callout component for important information
export const Callout = ({
  type = 'info',
  children
}: {
  type?: 'info' | 'warning' | 'success' | 'error';
  children: React.ReactNode;
}) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    error: '❌'
  };

  return (
    <div className={`border rounded-xl p-4 my-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icons[type]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

// CTA Button component
export const CTAButton = ({
  href,
  children,
  variant = 'primary'
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) => {
  const styles = variant === 'primary'
    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
    : 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600';

  return (
    <Link
      href={href}
      className={`inline-block px-6 py-3 rounded-full font-semibold transition-all duration-300 ${styles}`}
    >
      {children}
    </Link>
  );
};

// Video component for embedded videos
export const Video = ({
  src,
  title,
  poster
}: {
  src: string;
  title?: string;
  poster?: string;
}) => {
  return (
    <div className="my-6 rounded-xl overflow-hidden shadow-lg">
      <video
        src={src}
        title={title}
        poster={poster}
        controls
        className="w-full"
      />
    </div>
  );
};

// Feature Grid for displaying features
export const FeatureGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
      {children}
    </div>
  );
};

// Feature Card for individual features
export const FeatureCard = ({
  icon,
  title,
  children
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{title}</h3>
      <div className="text-gray-600 dark:text-gray-400">{children}</div>
    </div>
  );
};

// Progress indicator
export const Progress = ({
  value,
  max = 100
}: {
  value: number;
  max?: number;
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className="my-4">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
        <span>Progreso</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Code block wrapper with syntax highlighting hint
export const CodeBlock = ({
  language,
  children
}: {
  language?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="my-4">
      {language && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {language}
        </div>
      )}
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
};

// Anchor link with proper styling
export const Anchor = ({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const isExternal = href.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
    >
      {children}
    </Link>
  );
};

// Export all MDX components
export const MDXComponents = {
  // Custom components
  Callout,
  CTAButton,
  Video,
  FeatureGrid,
  FeatureCard,
  Progress,
  CodeBlock,

  // Override default elements
  a: Anchor,
  img: (props: any) => (
    <Image
      {...props}
      className="rounded-lg my-4"
      width={800}
      height={400}
      alt={props.alt || ''}
    />
  ),
  h1: (props: any) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-white" {...props} />,
  p: (props: any) => <p className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="my-4 list-disc list-inside text-gray-700 dark:text-gray-300" {...props} />,
  ol: (props: any) => <ol className="my-4 list-decimal list-inside text-gray-700 dark:text-gray-300" {...props} />,
  li: (props: any) => <li className="my-1" {...props} />,
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400"
      {...props}
    />
  ),
};