import { memo, useState, useCallback } from 'react';
import type { Message } from 'ai';

interface Design {
  option: number;
  title: string;
  imageUrl: string;
  htmlUrl: string;
}

interface DesignCardsProps {
  designs: Design[];
  append?: (message: Message) => void;
}

export const DesignCards = memo(({ designs, append }: DesignCardsProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>(
    () => Object.fromEntries(designs.map((d) => [d.option, true])),
  );

  const handleSelect = useCallback(
    (design: Design) => {
      if (selectedOption) {
        return;
      }

      setSelectedOption(design.option);

      if (append) {
        append({
          id: crypto.randomUUID(),
          role: 'user',
          content: `Je choisis le design ${design.option} (${design.title}). Voici le lien vers le HTML du design : ${design.htmlUrl}\n\nReproduise ce design fidèlement en l'adaptant au contenu de mon business.`,
        });
      }
    },
    [append, selectedOption],
  );

  const handleImageLoad = useCallback((option: number) => {
    setLoadingImages((prev) => ({ ...prev, [option]: false }));
  }, []);

  const handleImageError = useCallback((option: number) => {
    setLoadingImages((prev) => ({ ...prev, [option]: false }));
  }, []);

  return (
    <div className="my-4">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(designs.length, 3)}, 1fr)`,
        }}
      >
        {designs.map((design) => {
          const isSelected = selectedOption === design.option;
          const isDisabled = selectedOption !== null && !isSelected;

          return (
            <button
              key={design.option}
              onClick={() => handleSelect(design)}
              disabled={isDisabled}
              className={`
                group relative rounded-xl overflow-hidden border-2 transition-all duration-200
                text-left cursor-pointer
                ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30 scale-[1.02]'
                    : isDisabled
                      ? 'border-bolt-elements-borderColor opacity-40 cursor-not-allowed'
                      : 'border-bolt-elements-borderColor hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1'
                }
              `}
            >
              {/* Badge */}
              <div
                className={`
                absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold
                ${isSelected ? 'bg-blue-500 text-white' : 'bg-black/60 text-white backdrop-blur-sm'}
              `}
              >
                {isSelected ? 'Sélectionné' : `Option ${design.option}`}
              </div>

              {/* Screenshot */}
              <div className="relative aspect-[16/10] bg-bolt-elements-background-depth-2 overflow-hidden">
                {loadingImages[design.option] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="i-svg-spinners:90-ring-with-bg text-2xl text-bolt-elements-textSecondary" />
                  </div>
                )}
                <img
                  src={design.imageUrl}
                  alt={design.title}
                  className={`
                    w-full h-full object-cover object-top transition-opacity duration-300
                    ${loadingImages[design.option] ? 'opacity-0' : 'opacity-100'}
                  `}
                  onLoad={() => handleImageLoad(design.option)}
                  onError={() => handleImageError(design.option)}
                  loading="eager"
                />
              </div>

              {/* Title bar */}
              <div
                className={`
                px-4 py-3 border-t transition-colors
                ${isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor'}
              `}
              >
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{design.title}</p>
                {!selectedOption && (
                  <p className="text-xs text-bolt-elements-textSecondary mt-0.5 group-hover:text-blue-400 transition-colors">
                    Cliquez pour choisir ce design
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
