import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Head Component with Open Graph and Twitter Card support
 * 
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {string} image - Image URL for social media
 * @param {string} url - Canonical URL
 * @param {string} type - Open Graph type (website, article, etc.)
 */
export function SEOHead({
  title = "Promptster",
  description = "Your AI-powered prompt management platform",
  image = "/og-image.png",
  url = window.location.href,
  type = "website",
  twitterCard = "summary_large_image",
  keywords = [],
  author = "",
}) {
  const fullTitle = title === "Promptster" ? title : `${title} | Promptster`;
  const absoluteImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      {author && <meta name="author" content={author} />}
      <link rel="canonical" href={url} />

      {/* Open Graph Tags (Facebook, LinkedIn) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:site_name" content="Promptster" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      {/* <meta name="twitter:site" content="@yourhandle" /> */}
      {/* <meta name="twitter:creator" content="@yourhandle" /> */}
    </Helmet>
  );
}
