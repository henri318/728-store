# SEO & Analytics

> Estrategia de SEO on-page y Google Analytics 4 para Modular E-commerce.
> Fecha: 2026-06-14

---

## SEO

### Estrategia

El SEO se resuelve en **build-time y SSR** — no necesita Redis ni servicios externos. Next.js 15 proporciona todo lo necesario mediante su API `metadata` y generación estática.

### 1. Metadata por ruta

```typescript
// app/[locale]/products/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);

  return {
    title: `${product.name} | Modular Ecommerce`,
    description: product.description?.slice(0, 160),
    alternates: {
      languages: {
        es: `/${params.locale}/products/${params.slug}`,
        cat: `/cat/products/${params.slug}`,
      },
    },
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images ?? [],
    },
  };
}
```

**Reglas**:
- `title` único por página (formato: `"Página | Modular Ecommerce"`)
- `description` entre 120-160 caracteres
- `alternates.languages` para cada locale (es, cat)
- Open Graph tags para compartir en redes

### 2. Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();
  const categories = await getCategories();

  const productUrls = products.map(p => ({
    url: `https://tudominio.com/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    { url: 'https://tudominio.com', priority: 1.0 },
    { url: 'https://tudominio.com/products', priority: 0.9 },
    ...productUrls,
    { url: 'https://tudominio.com/about', priority: 0.5 },
  ];
}
```

### 3. Robots.txt

```typescript
// app/robots.ts
export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'GPTBot', disallow: '/' }, // bloquear crawlers de IA si aplica
    ],
    sitemap: 'https://tudominio.com/sitemap.xml',
  };
}
```

### 4. JSON-LD (structured data)

Para productos, usar schema.org `Product`:

```typescript
// components/seo/product-jsonld.tsx
export function ProductJsonLd({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.basePrice,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### 5. Core Web Vitals

- **LCP**: Optimizar imágenes con `next/image`, priorizar Above the Fold
- **INP**: Evitar JS bloqueante en interacciones (botones, formularios)
- **CLS**: Dimensiones explícitas en imágenes y contenedores dinámicos

No se necesita infraestructura extra — Next.js y `next/image` cubren el 90%.

---

## Google Analytics 4

### Estrategia

GA4 vía **Google Tag (gtag.js)** con carga diferida hasta que el usuario acepte cookies (consent mode v2).

### Setup

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Componente de carga

```typescript
// components/analytics/google-analytics.tsx
'use client';

import Script from 'next/script';
import { useConsent } from '@/hooks/use-consent';

export function GoogleAnalytics() {
  const { consentGiven } = useConsent();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId || !consentGiven) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
```

### Consent Mode v2

```typescript
// hooks/use-consent.ts
export function useConsent() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent');
    if (stored === 'accepted') {
      setConsentGiven(true);
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
      });
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setConsentGiven(true);
  };

  return { consentGiven, accept };
}
```

### Eventos personalizados

```typescript
// lib/analytics.ts
export function trackEvent(action: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (typeof gtag === 'undefined') return;

  gtag('event', action, params);
}

// Uso:
trackEvent('view_item', {
  currency: 'EUR',
  value: product.basePrice,
  items: [{ item_id: product.id, item_name: product.name }],
});

trackEvent('add_to_cart', { ... });
trackEvent('purchase', { transaction_id, value, ... });
trackEvent('sign_up', { method: 'email' });
```

### Banner de cookies

```typescript
// components/cookies/cookie-banner.tsx
'use client';

import { useConsent } from '@/hooks/use-consent';

export function CookieBanner() {
  const { consentGiven, accept } = useConsent();

  if (consentGiven) return null;

  return (
    <div className="fixed bottom-0 w-full bg-gray-900 text-white p-4 flex justify-between">
      <p>Usamos cookies para mejorar tu experiencia.</p>
      <button onClick={accept}>Aceptar</button>
    </div>
  );
}
```

---

## Resumen de dependencias

```json
{
  "dependencies": {
    "next": "^15.x" // metadata API, next/image, next/script — ya incluido
  }
}
```

No se necesitan dependencias externas. Todo se resuelve con APIs nativas de Next.js + Google Tag.
