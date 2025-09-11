import { test, expect } from '@playwright/test';

test.describe('Internacionalización ES/EN', () => {
  test('navegación mantiene locale y lang attribute', async ({ page }) => {
    // Navegar a versión español
    await page.goto('/es');
    
    // Verificar HTML lang attribute
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    
    // Verificar que el selector de idioma muestra ES
    await expect(page.getByText('ES').first()).toBeVisible();
    
    // Cambiar a inglés
    await page.getByRole('button', { name: /es/i }).click();
    await page.getByText('English').click();
    
    // Verificar redirección a /en
    await expect(page).toHaveURL(/\/en(\/|$)/);
    
    // Verificar HTML lang cambió a en
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    
    // Verificar que el selector muestra EN
    await expect(page.getByText('EN').first()).toBeVisible();
  });

  test('cookie persiste después de reload', async ({ page }) => {
    // Navegar a versión inglés
    await page.goto('/en');
    
    // Verificar idioma inicial
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    
    // Recargar página
    await page.reload();
    
    // Verificar que mantiene inglés
    await expect(page).toHaveURL(/\/en(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    
    // Cambiar a español
    await page.getByRole('button', { name: /en/i }).click();
    await page.getByText('Español').click();
    
    // Recargar y verificar persistencia
    await page.reload();
    await expect(page).toHaveURL(/\/es(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('navegación entre páginas mantiene locale', async ({ page }) => {
    // Comenzar en español
    await page.goto('/es');
    
    // Navegar a Knowledge
    await page.getByRole('link', { name: 'Knowledge' }).click();
    await expect(page).toHaveURL('/es/knowledge');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    
    // Navegar a Referidos
    await page.getByRole('link', { name: 'Referidos' }).click();
    await expect(page).toHaveURL('/es/referrals');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('hreflang tags presentes en metadata', async ({ page }) => {
    await page.goto('/es');
    
    // Verificar canonical URL
    const canonical = await page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/es$/);
    
    // Verificar alternate hreflang links
    const hreflangEs = await page.locator('link[hreflang="es"]');
    await expect(hreflangEs).toHaveAttribute('href', /\/es$/);
    
    const hreflangEn = await page.locator('link[hreflang="en"]');
    await expect(hreflangEn).toHaveAttribute('href', /\/en$/);
    
    const hreflangDefault = await page.locator('link[hreflang="x-default"]');
    await expect(hreflangDefault).toHaveAttribute('href', /\/es$/);
  });

  test('traducciones se muestran correctamente', async ({ page }) => {
    // Probar en español
    await page.goto('/es');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Regala el Futuro');
    await expect(page.getByRole('button', { name: /crear mi regalo/i })).toBeVisible();
    
    // Cambiar a inglés
    await page.getByRole('button', { name: /es/i }).click();
    await page.getByText('English').click();
    
    // Verificar traducciones en inglés
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Gift the Future');
    await expect(page.getByRole('button', { name: /create my gift/i })).toBeVisible();
  });
});

// Test para verificar que no hay strings sin traducir
test('no hay strings sin traducir', async ({ page }) => {
  const pages = [
    '/es',
    '/es/knowledge',
    '/es/referrals',
    '/es/my-wallets'
  ];

  for (const url of pages) {
    await page.goto(url);
    
    // Buscar patrones comunes de strings sin traducir
    const pageContent = await page.content();
    
    // Verificar que no hay t('missing') o claves de traducción expuestas
    expect(pageContent).not.toMatch(/t\(['"]missing/);
    expect(pageContent).not.toMatch(/\[missing translation/i);
    expect(pageContent).not.toMatch(/translation\.key\./);
  }
});