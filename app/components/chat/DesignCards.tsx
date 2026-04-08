import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { brandAssetsStore } from '~/lib/stores/brandAssets';
import { replaceImagesWithBrandAssets, hasBrandAssets } from '~/lib/utils/imageReplacer';

const isInIframe = typeof window !== 'undefined' && window.parent !== window;

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
  loading?: boolean;
  totalExpected?: number;
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

async function fetchAndReplaceHtml(
  htmlUrl: string,
  brandAssets: { logo: string | null; photos: string[] },
): Promise<string | null> {
  try {
    const res = await fetch('/api/fetch-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: htmlUrl }),
    });
    const data = (await res.json()) as { html?: string };

    if (!data.html) {
      return null;
    }

    if (hasBrandAssets(brandAssets)) {
      return replaceImagesWithBrandAssets(data.html, brandAssets);
    }

    return data.html;
  } catch {
    return null;
  }
}

export const DesignCards = memo(
  ({ designs: initialDesigns, projectId, append, loading, totalExpected }: DesignCardsProps) => {
    const [designs, setDesigns] = useState(initialDesigns);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
    const [fetching, setFetching] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [refining, setRefining] = useState(false);
    const refineInputRef = useRef<HTMLInputElement>(null);

    const [liveHtml, setLiveHtml] = useState<Record<number, string>>({});
    const [htmlLoading, setHtmlLoading] = useState<Record<number, boolean>>({});
    const fetchedUrlsRef = useRef<Set<string>>(new Set());
    const pendingAppendRef = useRef<Message | null>(null);
    const [waitingAuth, setWaitingAuth] = useState(false);

    const brandAssets = useStore(brandAssetsStore);
    const hasAssets = hasBrandAssets(brandAssets);

    const prevDesignsRef = useRef(initialDesigns);

    if (initialDesigns !== prevDesignsRef.current && initialDesigns.length !== prevDesignsRef.current.length) {
      prevDesignsRef.current = initialDesigns;
      setDesigns(initialDesigns);
      setImageLoaded({});
    }

    useEffect(() => {
      if (!hasAssets) {
        return;
      }

      for (const design of designs) {
        if (!design.htmlUrl || fetchedUrlsRef.current.has(design.htmlUrl)) {
          continue;
        }

        fetchedUrlsRef.current.add(design.htmlUrl);
        setHtmlLoading((prev) => ({ ...prev, [design.option]: true }));

        fetchAndReplaceHtml(design.htmlUrl, brandAssets).then((html) => {
          if (html) {
            setLiveHtml((prev) => ({ ...prev, [design.option]: html }));
          }

          setHtmlLoading((prev) => ({ ...prev, [design.option]: false }));
        });
      }
    }, [designs, hasAssets, brandAssets]);

    const current = designs[currentIndex];
    const total = designs.length;
    const pendingCount = loading && totalExpected ? Math.max(0, totalExpected - designs.length) : 0;
    const currentLiveHtml = current ? liveHtml[current.option] : undefined;
    const currentHtmlLoading = current ? htmlLoading[current.option] : false;

    const goTo = useCallback(
      (index: number) => {
        if (!selectedOption) {
          setCurrentIndex(Math.max(0, Math.min(index, total - 1)));
        }
      },
      [total, selectedOption],
    );

    // Écoute le feu vert OU l'annulation de Limova
    useEffect(() => {
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'bolt:proceed-build' && pendingAppendRef.current) {
          append?.(pendingAppendRef.current);
          pendingAppendRef.current = null;
          setWaitingAuth(false);
        }

        if (e.data?.type === 'bolt:cancel-build') {
          pendingAppendRef.current = null;
          setWaitingAuth(false);
          setSelectedOption(null);
          setFetching(false);
        }
      };

      window.addEventListener('message', handler);

      return () => window.removeEventListener('message', handler);
    }, [append]);

    const buildMessage = useCallback(
      async (design: Design): Promise<Message> => {
        let htmlContent = liveHtml[design.option] || '';

        if (!htmlContent) {
          htmlContent = (await fetchAndReplaceHtml(design.htmlUrl, brandAssets)) || '';
        }

        const hasClientPhotos = hasBrandAssets(brandAssets);
        const instructions = [`Je choisis le design ${design.option} (${design.title}).`, ''];

        if (htmlContent) {
          instructions.push(
            'Voici le code HTML complet de la maquette Stitch sélectionnée :',
            '',
            '```html',
            htmlContent,
            '```',
            '',
            'INSTRUCTIONS CRITIQUES :',
            "- Reproduis ce design À L'IDENTIQUE en React + Vite + TypeScript (TSX) + Tailwind CSS.",
            '- Conserve exactement la même structure de sections, le même layout, les mêmes couleurs, polices, espacements, images et textes.',
            '- Convertis le CSS inline et les classes en classes Tailwind équivalentes.',
            "- Adapte le contenu textuel au business de l'utilisateur tout en gardant la structure visuelle identique.",
            '- Les images utilisent les mêmes URLs que dans le HTML source.',
            '- Le résultat doit être pixel-perfect par rapport à la maquette.',
            "- IMPORTANT JSX : Échappe TOUJOURS les caractères spéciaux HTML dans le texte JSX : utilise &lt; pour <, &gt; pour >, &amp; pour &, {'<'} ou {'>'}. Ne JAMAIS écrire un < ou > brut dans du texte JSX.",
          );

          if (hasClientPhotos) {
            instructions.push(
              "- IMPORTANT : Les images dans ce HTML sont les VRAIES photos du client. Conserve EXACTEMENT les mêmes URLs/src d'images dans ton code React. Ne les remplace PAS par des images Unsplash ou des placeholders.",
            );
          }
        } else {
          instructions.push(
            `Voici le lien vers le HTML du design : ${design.htmlUrl}`,
            '',
            "Utilise fetch_website en format html sur ce lien, puis reproduis ce design À L'IDENTIQUE en React + Vite + TSX + Tailwind CSS. Le résultat doit être pixel-perfect.",
          );
        }

        return { id: crypto.randomUUID(), role: 'user', content: instructions.join('\n') };
      },
      [liveHtml, brandAssets],
    );

    const handleSelect = useCallback(
      async (design: Design) => {
        if (selectedOption || fetching || waitingAuth) {
          return;
        }

        setFetching(true);

        const message = await buildMessage(design);

        setFetching(false);
        setSelectedOption(design.option);

        if (isInIframe) {
          // Mode iframe (Limova) — on envoie le design sélectionné et on attend l'auth
          pendingAppendRef.current = message;
          setWaitingAuth(true);
          window.parent.postMessage({ type: 'bolt:design-selected', option: design.option, title: design.title }, '*');

          // Pas de fallback : le build ne démarre QUE sur bolt:proceed-build
        } else {
          // Mode standalone — pas d'auth requise, on build directement
          append?.(message);
        }
      },
      [append, selectedOption, fetching, waitingAuth, buildMessage],
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
          const newHtmlUrl = data.htmlUrl || current.htmlUrl;

          if (data.htmlUrl) {
            fetchedUrlsRef.current.delete(current.htmlUrl);
          }

          setDesigns((prev) =>
            prev.map((d, i) =>
              i === currentIndex
                ? {
                    ...d,
                    imageUrl: data.imageUrl || d.imageUrl,
                    htmlUrl: newHtmlUrl,
                    screenId: data.screenId || d.screenId,
                  }
                : d,
            ),
          );
          setImageLoaded((prev) => ({ ...prev, [current.option]: false }));
          setLiveHtml((prev) => {
            const next = { ...prev };
            delete next[current.option];

            return next;
          });
          setRefinePrompt('');
        }
      } catch {
        // Silently fail
      } finally {
        setRefining(false);
      }
    }, [refinePrompt, refining, selectedOption, current, projectId, currentIndex]);

    const isSelected = selectedOption === current?.option;

    return (
      <div className="my-4 space-y-3">
        {/* Mockup viewer */}
        <div className="rounded-xl border border-bolt-elements-borderColor overflow-hidden">
          {/* Preview area */}
          <div className="relative overflow-y-auto" style={{ maxHeight: '480px' }}>
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

            {/* Live iframe preview (shown when brand assets + HTML ready) */}
            {currentLiveHtml ? (
              <iframe
                key={`live-${current?.option}`}
                srcDoc={currentLiveHtml}
                title={current?.title}
                className="w-full border-0"
                style={{ height: '480px' }}
                sandbox="allow-same-origin"
              />
            ) : (
              <>
                {(!imageLoaded[current?.option] || currentHtmlLoading) && (
                  <div className="flex flex-col items-center justify-center min-h-[280px] gap-2">
                    <div className="i-svg-spinners:90-ring-with-bg text-2xl text-bolt-elements-textTertiary" />
                    {currentHtmlLoading && hasAssets && (
                      <span className="text-[10px] text-bolt-elements-textTertiary">Intégration de vos photos…</span>
                    )}
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
              </>
            )}
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
                  {currentLiveHtml && hasAssets && <span className="ml-1.5 text-accent-500">● vos photos</span>}
                </span>
              </div>

              {!selectedOption && !fetching && !waitingAuth ? (
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
              ) : waitingAuth ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-500 flex-shrink-0">
                  <div className="i-svg-spinners:90-ring-with-bg text-sm" />
                  En attente de connexion…
                </span>
              ) : isSelected ? (
                <span className="flex items-center gap-1.5 text-xs text-green-500 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Sélectionné
                </span>
              ) : null}
            </div>

            {/* Refine input */}
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

        {/* Loading banner */}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-xs text-bolt-elements-textSecondary">
            <div className="i-svg-spinners:90-ring-with-bg text-sm" />
            <span>
              Génération des variantes en cours… {designs.length}/{totalExpected || '?'} prêtes
            </span>
          </div>
        )}

        {/* Thumbnails */}
        {(total > 1 || pendingCount > 0) && !selectedOption && (
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
            {Array.from({ length: pendingCount }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex-1 rounded-lg overflow-hidden border border-bolt-elements-borderColor"
              >
                <div className="aspect-[16/10] bg-bolt-elements-background-depth-2 animate-pulse flex items-center justify-center">
                  <div className="i-svg-spinners:90-ring-with-bg text-lg text-bolt-elements-textTertiary/40" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
