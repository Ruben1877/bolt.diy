import type { BrandAssets } from '~/lib/stores/brandAssets';

interface ImageMatch {
  fullTag: string;
  src: string;
  index: number;
  context: string;
  isLogo: boolean;
  isHero: boolean;
  isGallery: boolean;
}

const IMG_REGEX = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

const STOCK_DOMAINS = [
  'images.unsplash.com',
  'unsplash.com',
  'lh3.googleusercontent.com',
  'source.unsplash.com',
  'plus.unsplash.com',
  'picsum.photos',
  'via.placeholder.com',
  'placehold.co',
  'placekitten.com',
  'loremflickr.com',
];

function isStockImage(src: string): boolean {
  const lower = src.toLowerCase();
  return STOCK_DOMAINS.some((d) => lower.includes(d));
}

function getContext(html: string, index: number, radius = 300): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(html.length, index + radius);
  return html.slice(start, end).toLowerCase();
}

function isLogoContext(context: string, _src: string): boolean {
  const logoPatterns = [
    '<header',
    '<nav',
    'class="logo',
    "class='logo",
    'class="brand',
    "class='brand",
    'logo-',
    '-logo',
    'navbar',
    'nav-brand',
    'site-logo',
    'header-logo',
  ];
  return logoPatterns.some((p) => context.includes(p));
}

function isHeroContext(context: string): boolean {
  const heroPatterns = [
    'hero',
    'banner',
    'jumbotron',
    'main-visual',
    'showcase',
    'cover-image',
    'fullscreen',
    'full-width',
    'above-fold',
  ];
  return heroPatterns.some((p) => context.includes(p));
}

function isGalleryContext(context: string): boolean {
  const galleryPatterns = [
    'gallery',
    'portfolio',
    'grid',
    'masonry',
    'carousel',
    'slider',
    'showcase',
    'réalisation',
    'realisation',
    'projet',
    'travaux',
  ];
  return galleryPatterns.some((p) => context.includes(p));
}

function classifyImages(html: string): ImageMatch[] {
  const matches: ImageMatch[] = [];
  let match: RegExpExecArray | null;

  IMG_REGEX.lastIndex = 0;

  while ((match = IMG_REGEX.exec(html)) !== null) {
    const fullTag = match[0];
    const src = match[1];
    const index = match.index;

    if (!isStockImage(src)) {
      continue;
    }

    const context = getContext(html, index);
    const isLogo = isLogoContext(context, src);
    const isHero = !isLogo && isHeroContext(context);
    const isGallery = !isLogo && !isHero && isGalleryContext(context);

    matches.push({ fullTag, src, index, context, isLogo, isHero, isGallery });
  }

  return matches;
}

export function replaceImagesWithBrandAssets(html: string, assets: BrandAssets): string {
  if (!assets.logo && assets.photos.length === 0) {
    return html;
  }

  const images = classifyImages(html);

  if (images.length === 0) {
    return html;
  }

  let photoIndex = 0;
  let result = html;

  const replacements: Array<{ original: string; replacement: string }> = [];

  for (const img of images) {
    let newSrc: string | null = null;

    if (img.isLogo && assets.logo) {
      newSrc = assets.logo;
    } else if (img.isHero && assets.photos.length > 0) {
      newSrc = assets.photos[0];

      if (photoIndex === 0) {
        photoIndex = 1;
      }
    } else if (!img.isLogo && assets.photos.length > 0 && photoIndex < assets.photos.length) {
      newSrc = assets.photos[photoIndex % assets.photos.length];
      photoIndex++;
    }

    if (newSrc) {
      const newTag = img.fullTag.replace(img.src, newSrc);
      replacements.push({ original: img.fullTag, replacement: newTag });
    }
  }

  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }

  return result;
}

export function hasBrandAssets(assets: BrandAssets): boolean {
  return !!assets.logo || assets.photos.length > 0;
}
