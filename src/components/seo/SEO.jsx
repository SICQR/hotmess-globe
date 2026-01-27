/**
 * SEO Component
 * 
 * Manages meta tags, Open Graph, Twitter Cards, and structured data.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  siteName: 'HOTMESS',
  siteUrl: 'https://hotmess.app',
  defaultTitle: 'HOTMESS - Compatibility-first Discovery',
  defaultDescription: 'Find your match in minutes. Smart compatibility scoring, real-time availability, no ghosting.',
  defaultImage: '/images/og-default.png',
  twitterHandle: '@hotmessapp',
  locale: 'en_GB',
  themeColor: '#E62020',
};

// ============================================================================
// Main SEO Component
// ============================================================================

export function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  article,
  profile,
  noindex = false,
  canonical,
  children,
}) {
  const location = useLocation();
  
  const pageTitle = title 
    ? `${title} | ${DEFAULT_CONFIG.siteName}`
    : DEFAULT_CONFIG.defaultTitle;
  
  const pageDescription = description || DEFAULT_CONFIG.defaultDescription;
  const pageImage = image || DEFAULT_CONFIG.defaultImage;
  const pageUrl = url || `${DEFAULT_CONFIG.siteUrl}${location.pathname}`;
  const canonicalUrl = canonical || pageUrl;

  useEffect(() => {
    // Update document title
    document.title = pageTitle;

    // Helper to update or create meta tags
    const setMeta = (name, content, property = false) => {
      if (!content) return;
      
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    setMeta('description', pageDescription);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('theme-color', DEFAULT_CONFIG.themeColor);

    // Open Graph tags
    setMeta('og:title', pageTitle, true);
    setMeta('og:description', pageDescription, true);
    setMeta('og:image', pageImage.startsWith('http') ? pageImage : `${DEFAULT_CONFIG.siteUrl}${pageImage}`, true);
    setMeta('og:url', pageUrl, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', DEFAULT_CONFIG.siteName, true);
    setMeta('og:locale', DEFAULT_CONFIG.locale, true);

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:site', DEFAULT_CONFIG.twitterHandle);
    setMeta('twitter:title', pageTitle);
    setMeta('twitter:description', pageDescription);
    setMeta('twitter:image', pageImage.startsWith('http') ? pageImage : `${DEFAULT_CONFIG.siteUrl}${pageImage}`);

    // Article-specific tags
    if (type === 'article' && article) {
      setMeta('article:published_time', article.publishedTime, true);
      setMeta('article:modified_time', article.modifiedTime, true);
      setMeta('article:author', article.author, true);
      if (article.tags) {
        article.tags.forEach((tag, i) => {
          setMeta(`article:tag:${i}`, tag, true);
        });
      }
    }

    // Profile-specific tags
    if (type === 'profile' && profile) {
      setMeta('profile:username', profile.username, true);
      setMeta('profile:first_name', profile.firstName, true);
    }

    // Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // Cleanup on unmount
    return () => {
      // Reset to defaults when component unmounts
      document.title = DEFAULT_CONFIG.defaultTitle;
    };
  }, [pageTitle, pageDescription, pageImage, pageUrl, canonicalUrl, type, noindex, article, profile]);

  return children || null;
}

// ============================================================================
// JSON-LD Structured Data
// ============================================================================

export function JsonLd({ data }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [data]);

  return null;
}

// ============================================================================
// Pre-built Structured Data Components
// ============================================================================

export function WebsiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: DEFAULT_CONFIG.siteName,
    url: DEFAULT_CONFIG.siteUrl,
    description: DEFAULT_CONFIG.defaultDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${DEFAULT_CONFIG.siteUrl}/social?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return <JsonLd data={data} />;
}

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: DEFAULT_CONFIG.siteName,
    url: DEFAULT_CONFIG.siteUrl,
    logo: `${DEFAULT_CONFIG.siteUrl}/icons/icon-512.png`,
    sameAs: [
      'https://twitter.com/hotmessapp',
      'https://instagram.com/hotmessapp',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@hotmess.app',
    },
  };

  return <JsonLd data={data} />;
}

export function ProfileJsonLd({ profile }) {
  if (!profile) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.displayName || profile.username,
    url: `${DEFAULT_CONFIG.siteUrl}/profile/${profile.username || profile.id}`,
    image: profile.photos?.[0]?.url || profile.avatar_url,
    description: profile.bio,
  };

  return <JsonLd data={data} />;
}

export function ProductJsonLd({ product }) {
  if (!product) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images?.[0]?.src,
    url: `${DEFAULT_CONFIG.siteUrl}/market/p/${product.handle}`,
    offers: {
      '@type': 'Offer',
      price: product.variants?.[0]?.price?.amount,
      priceCurrency: product.variants?.[0]?.price?.currencyCode || 'GBP',
      availability: product.availableForSale 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
    },
  };

  return <JsonLd data={data} />;
}

export function EventJsonLd({ event }) {
  if (!event) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.event_date,
    endDate: event.end_date,
    location: {
      '@type': 'Place',
      name: event.venue_name,
      address: event.location,
    },
    image: event.image_url,
    url: `${DEFAULT_CONFIG.siteUrl}/events/${event.id}`,
    organizer: {
      '@type': 'Organization',
      name: event.organizer_name || DEFAULT_CONFIG.siteName,
    },
  };

  return <JsonLd data={data} />;
}

// ============================================================================
// Breadcrumb Component
// ============================================================================

export function BreadcrumbJsonLd({ items }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${DEFAULT_CONFIG.siteUrl}${item.url}` : undefined,
    })),
  };

  return <JsonLd data={data} />;
}

// ============================================================================
// FAQ Component
// ============================================================================

export function FAQJsonLd({ faqs }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}

export default SEO;
