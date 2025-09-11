/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://cryptogift-wallets.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  
  // Exclude admin and debug routes
  exclude: [
    '/admin/*',
    '/debug/*',
    '/api/*',
    '/_not-found',
    '/sentry-example-page'
  ],
  
  // Generate alternate refs for each locale
  alternateRefs: [
    {
      href: 'https://cryptogift-wallets.vercel.app/es',
      hreflang: 'es',
    },
    {
      href: 'https://cryptogift-wallets.vercel.app/en',
      hreflang: 'en',
    },
    {
      href: 'https://cryptogift-wallets.vercel.app/es',
      hreflang: 'x-default',
    },
  ],
  
  // Transform function to add both locale versions
  transform: async (config, path) => {
    // Skip if already has locale prefix
    if (path.startsWith('/es') || path.startsWith('/en')) {
      return {
        loc: path,
        changefreq: config.changefreq,
        priority: config.priority,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
        alternateRefs: config.alternateRefs ?? [],
      };
    }
    
    // Generate entries for both locales
    const defaultConfig = {
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
    
    return [
      {
        ...defaultConfig,
        loc: `/es${path}`,
        alternateRefs: [
          { href: `${config.siteUrl}/es${path}`, hreflang: 'es' },
          { href: `${config.siteUrl}/en${path}`, hreflang: 'en' },
          { href: `${config.siteUrl}/es${path}`, hreflang: 'x-default' },
        ],
      },
      {
        ...defaultConfig,
        loc: `/en${path}`,
        alternateRefs: [
          { href: `${config.siteUrl}/es${path}`, hreflang: 'es' },
          { href: `${config.siteUrl}/en${path}`, hreflang: 'en' },
          { href: `${config.siteUrl}/es${path}`, hreflang: 'x-default' },
        ],
      },
    ];
  },
  
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/debug/'],
      },
    ],
    additionalSitemaps: [
      'https://cryptogift-wallets.vercel.app/sitemap.xml',
    ],
  },
};