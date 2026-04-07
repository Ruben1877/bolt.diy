import { memo, useCallback, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  brandAssetsStore,
  setBrandLogo,
  addBrandPhotos,
  removeBrandPhoto,
  clearBrandAssets,
} from '~/lib/stores/brandAssets';

function readFilesAsDataUri(files: FileList | File[]): Promise<string[]> {
  return Promise.all(
    Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }),
      ),
  );
}

export const BrandAssetsPanel = memo(({ onClose }: { onClose: () => void }) => {
  const assets = useStore(brandAssetsStore);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const handleLogoDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    const uris = await readFilesAsDataUri(e.dataTransfer.files);

    if (uris[0]) {
      setBrandLogo(uris[0]);
    }
  }, []);

  const handleLogoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }

    const uris = await readFilesAsDataUri(e.target.files);

    if (uris[0]) {
      setBrandLogo(uris[0]);
    }

    e.target.value = '';
  }, []);

  const handlePhotosDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    const uris = await readFilesAsDataUri(e.dataTransfer.files);

    if (uris.length) {
      addBrandPhotos(uris);
    }
  }, []);

  const handlePhotosSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }

    const uris = await readFilesAsDataUri(e.target.files);

    if (uris.length) {
      addBrandPhotos(uris);
    }

    e.target.value = '';
  }, []);

  const hasAssets = !!assets.logo || assets.photos.length > 0;

  return (
    <div className="w-full max-w-chat mx-auto mb-2 rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <div className="i-ph:images-square text-sm text-bolt-elements-textSecondary" />
          <span className="text-xs font-medium text-bolt-elements-textPrimary">Photos du client</span>
          {hasAssets && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-500">
              {(assets.logo ? 1 : 0) + assets.photos.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasAssets && (
            <button
              onClick={() => clearBrandAssets()}
              className="text-[10px] px-1.5 py-0.5 rounded text-bolt-elements-textTertiary hover:text-red-400 transition-colors"
            >
              Tout supprimer
            </button>
          )}
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
          >
            <div className="i-ph:x text-sm" />
          </button>
        </div>
      </div>

      <div className="p-3 flex gap-3">
        {/* Logo zone */}
        <div className="flex-shrink-0">
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
          <div
            className="w-16 h-16 rounded-lg border-2 border-dashed border-bolt-elements-borderColor hover:border-accent-400/50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
            onClick={() => logoInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleLogoDrop}
            title="Logo"
          >
            {assets.logo ? (
              <div className="relative w-full h-full group">
                <img src={assets.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBrandLogo(null);
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <div className="i-ph:x text-white text-sm" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <div className="i-ph:crown-simple text-base text-bolt-elements-textTertiary" />
                <span className="text-[9px] text-bolt-elements-textTertiary">Logo</span>
              </div>
            )}
          </div>
        </div>

        {/* Photos zone */}
        <div className="flex-1 min-w-0">
          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotosSelect}
          />

          {assets.photos.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {assets.photos.map((photo, i) => (
                <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden group flex-shrink-0">
                  <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeBrandPhoto(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <div className="i-ph:x text-white text-xs" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => photosInputRef.current?.click()}
                className="w-12 h-12 rounded-md border-2 border-dashed border-bolt-elements-borderColor hover:border-accent-400/50 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handlePhotosDrop}
              >
                <div className="i-ph:plus text-sm text-bolt-elements-textTertiary" />
              </button>
            </div>
          ) : (
            <div
              className="h-16 rounded-lg border-2 border-dashed border-bolt-elements-borderColor hover:border-accent-400/50 flex items-center justify-center cursor-pointer transition-colors"
              onClick={() => photosInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handlePhotosDrop}
            >
              <div className="flex items-center gap-2 text-bolt-elements-textTertiary">
                <div className="i-ph:upload-simple text-base" />
                <span className="text-xs">Deposez vos photos ici</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasAssets && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-bolt-elements-textTertiary">
            Ces photos remplaceront automatiquement les images stock dans les maquettes Stitch.
          </p>
        </div>
      )}
    </div>
  );
});
