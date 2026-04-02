import { memo, useState, useCallback, useRef } from 'react';
import type { Message } from 'ai';

interface Design {
  option: number;
  title: string;
  imageUrl: string;
  htmlUrl: string;
  screenId?: string;
}

interface DesignCardsProps {
  designs: Design[];
  projectId?: string;
  designSystem?: unknown;
  append?: (message: Message) => void;
}

function getHiResUrl(url: string): string {
  if (url?.includes('lh3.googleusercontent.com')) {
    return `${url}${url.includes('=') ? '' : '='}w1280`;
  }

  return url;
}

function getThumbUrl(url: string): string {
  if (url?.includes('lh3.googleusercontent.com')) {
    return `${url}${url.includes('=') ? '' : '='}w400`;
  }

  return url;
}

export const DesignCards = memo(({ designs: initialDesigns, projectId, append }: DesignCardsProps) => {
  const [designs, setDesigns] = useState(initialDesigns);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const [fetching, setFetching] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refining, setRefining] = useState(false);
  const refineInputRef = useRef<HTMLInputElement>(null);

  const current = designs[currentIndex];
  const total = designs.length;

  const goTo = useCallback(
    (index: number) => {
      if (!selectedOption) {
        setCurrentIndex(Math.max(0, Math.min(index, total - 1)));
      }
    },
    [total, selectedOption],
  );

  const handleSelect = useCallback(
    async (design: Design) => {
      if (selectedOption || fetching) {
        return;
      }

      setFetching(true);
      setSelectedOption(design.option);

      let htmlContent = '';

      try {
        const res = await fetch('/api/fetch-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: design.htmlUrl }),
        });
        const data = (await res.json()) as { html?: string };

        if (data.html) {
          htmlContent = data.html;
        }
      } catch {
        // Fall back to URL-only approach
      } finally {
        setFetching(false);
      }

      const prompt = htmlContent
        ? [
            `Je choisis le design ${design.option} (${design.title}).`,
            '',
            'Voici le code HTML complet de la maquette Stitch sélectionnée :',
            '',
            '```html',
            htmlContent,
            '```',
            '',
            'INSTRUCTIONS CRITIQUES :',
            '- Reproduis ce design À L\'IDENTIQUE en React + Vite + TypeScript (TSX) + Tailwind CSS.',
            '- Conserve exactement la même structure de sections, le même layout, les mêmes couleurs, polices, espacements, images et textes.',
            '- Convertis le CSS inline et les classes en classes Tailwind équivalentes.',
            '- Adapte le contenu textuel au business de l\'utilisateur tout en gardant la structure visuelle identique.',
            '- Les images utilisent les mêmes URLs que dans le HTML source.',
            '- Le résultat doit être pixel-perfect par rapport à la maquette.',
            '- IMPORTANT JSX : Échappe TOUJOURS les caractères spéciaux HTML dans le texte JSX : utilise &lt; pour <, &gt; pour >, &amp; pour &, {\'<\'} ou {\'>\'}. Ne JAMAIS écrire un < ou > brut dans du texte JSX.',
          ].join('\n')
        : `Je choisis le design ${design.option} (${design.title}). Voici le lien vers le HTML du design : ${design.htmlUrl}\n\nUtilise fetch_website en format html sur ce lien, puis reproduis ce design À L'IDENTIQUE en React + Vite + TSX + Tailwind CSS. Le résultat doit être pixel-perfect.`;

      append?.({
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
      });
    },
    [append, selectedOption, fetching],
  );

  const handleRefine = useCallback(async () => {
    const prompt = refinePrompt.trim();

    if (!prompt || refining || selectedOption || !current?.screenId || !projectId) {
      return;
    }

    setRefining(true);

    try {
      const res = await fetch('/api/stitch-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          screenId: current.screenId,
          prompt,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        imageUrl?: string;
        htmlUrl?: string;
        screenId?: string;
      };

      if (data.success && (data.imageUrl || data.htmlUrl)) {
        setDesigns((prev) =>
          prev.map((d, i) =>
            i === currentIndex
              ? {
                  ...d,
                  imageUrl: data.imageUrl || d.imageUrl,
                  htmlUrl: data.htmlUrl || d.htmlUrl,
                  screenId: data.screenId || d.screenId,
                }
              : d,
          ),
        );
        setImageLoaded((prev) => ({ ...prev, [current.option]: false }));
        setRefinePrompt('');
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setRefining(false);
    }
  }, [refinePrompt, refining, selectedOption, current, projectId, currentIndex]);

  const isSelected = selectedOption === current?.option;

  return (
    <div className="my-4 space-y-3">
      {/* Mockup viewer */}
      <div className="rounded-xl border border-bolt-elements-borderColor overflow-hidden">
        {/* Image - scrollable */}
        <div
          className="relative overflow-y-auto"
          style={{ maxHeight: '480px' }}
        >
          {/* Nav arrows */}
          {currentIndex > 0 && !selectedOption && (
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="sticky top-1/2 -translate-y-1/2 float-left z-20 ml-2 w-8 h-8 rounded-full bg-bolt-elements-background-depth-1/80 backdrop-blur-sm border border-bolt-elements-borderColor text-bolt-elements-textSecondary flex items-center justify-center hover:text-bolt-elements-textPrimary transition-colors"
            >
              <div className="i-ph:caret-left text-sm" />
            </button>
          )}
          {currentIndex < total - 1 && !selectedOption && (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="sticky top-1/2 -translate-y-1/2 float-right z-20 mr-2 w-8 h-8 rounded-full bg-bolt-elements-background-depth-1/80 backdrop-blur-sm border border-bolt-elements-borderColor text-bolt-elements-textSecondary flex items-center justify-center hover:text-bolt-elements-textPrimary transition-colors"
            >
              <div className="i-ph:caret-right text-sm" />
            </button>
          )}

          {!imageLoaded[current?.option] && (
            <div className="flex items-center justify-center min-h-[280px]">
              <div className="i-svg-spinners:90-ring-with-bg text-2xl text-bolt-elements-textTertiary" />
            </div>
          )}
          <img
            key={current?.option}
            src={getHiResUrl(current?.imageUrl)}
            alt={current?.title}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className={`w-full ${imageLoaded[current?.option] ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            onLoad={() => setImageLoaded((prev) => ({ ...prev, [current?.option]: true }))}
            onError={() => setImageLoaded((prev) => ({ ...prev, [current?.option]: true }))}
            loading="eager"
          />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-2 px-3 py-2 border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex gap-1.5">
                {designs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    disabled={!!selectedOption}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentIndex
                        ? 'bg-bolt-elements-textPrimary scale-110'
                        : 'bg-bolt-elements-textTertiary/40 hover:bg-bolt-elements-textTertiary'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-bolt-elements-textTertiary truncate">
                {current?.title}
              </span>
            </div>

            {!selectedOption && !fetching ? (
              <button
                onClick={() => handleSelect(current)}
                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors flex-shrink-0"
              >
                Valider ce design
              </button>
            ) : fetching ? (
              <span className="flex items-center gap-1.5 text-xs text-bolt-elements-textTertiary flex-shrink-0">
                <div className="i-svg-spinners:90-ring-with-bg text-sm" />
                Récupération du HTML…
              </span>
            ) : isSelected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-500 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Sélectionné
              </span>
            ) : null}
          </div>

          {/* Refine input — only shown before validation and when projectId + screenId are available */}
          {!selectedOption && !fetching && projectId && current?.screenId && (
            <div className="flex items-center gap-2">
              <input
                ref={refineInputRef}
                type="text"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRefine();
                  }
                }}
                placeholder="Affiner : ex. « couleurs plus chaudes », « hero plus grand »…"
                disabled={refining}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary/60 focus:outline-none focus:border-bolt-elements-textTertiary transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleRefine}
                disabled={refining || !refinePrompt.trim()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors disabled:opacity-40 flex-shrink-0 flex items-center gap-1.5"
              >
                {refining ? (
                  <>
                    <div className="i-svg-spinners:90-ring-with-bg text-xs" />
                    Affinage…
                  </>
                ) : (
                  'Affiner'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {total > 1 && !selectedOption && (
        <div className="flex gap-2">
          {designs.map((d, i) => (
            <button
              key={d.option}
              onClick={() => goTo(i)}
              className={`flex-1 rounded-lg overflow-hidden border transition-all ${
                i === currentIndex
                  ? 'border-bolt-elements-textPrimary/40 shadow-sm'
                  : 'border-bolt-elements-borderColor opacity-60 hover:opacity-100'
              }`}
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={getThumbUrl(d.imageUrl)}
                  alt={d.title}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
