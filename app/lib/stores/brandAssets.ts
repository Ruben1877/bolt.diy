import { atom } from 'nanostores';

export interface BrandAssets {
  logo: string | null;
  photos: string[];
}

const STORAGE_KEY = 'bolt_brand_assets';

const DEFAULT_ASSETS: BrandAssets = { logo: null, photos: [] };

function loadFromStorage(): BrandAssets {
  if (import.meta.env.SSR) {
    return DEFAULT_ASSETS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        logo: parsed.logo ?? null,
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      };
    }
  } catch {
    // corrupted data
  }

  return DEFAULT_ASSETS;
}

export const brandAssetsStore = atom<BrandAssets>(loadFromStorage());

function persist(assets: BrandAssets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function setBrandLogo(dataUri: string | null) {
  const current = brandAssetsStore.get();
  const next = { ...current, logo: dataUri };
  brandAssetsStore.set(next);
  persist(next);
}

export function addBrandPhotos(dataUris: string[]) {
  const current = brandAssetsStore.get();
  const next = { ...current, photos: [...current.photos, ...dataUris] };
  brandAssetsStore.set(next);
  persist(next);
}

export function removeBrandPhoto(index: number) {
  const current = brandAssetsStore.get();
  const next = { ...current, photos: current.photos.filter((_, i) => i !== index) };
  brandAssetsStore.set(next);
  persist(next);
}

export function clearBrandAssets() {
  brandAssetsStore.set(DEFAULT_ASSETS);
  localStorage.removeItem(STORAGE_KEY);
}
