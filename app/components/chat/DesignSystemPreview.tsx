import { memo } from 'react';

export interface DesignSystemInfo {
  name: string;
  palette: { label: string; hex: string }[];
  typography: {
    style: string;
    fonts: string[];
  };
  features: string[];
}

interface DesignSystemPreviewProps {
  designSystem: DesignSystemInfo;
  compact?: boolean;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

const TYPO_FONT_MAP: Record<string, string> = {
  modern: 'Inter, system-ui, sans-serif',
  elegant: 'Georgia, Cambria, serif',
  bold: 'Impact, Arial Black, sans-serif',
  minimalist: 'Helvetica Neue, Helvetica, sans-serif',
  classic: 'Times New Roman, Times, serif',
};

const TYPO_LABEL_MAP: Record<string, string> = {
  modern: 'Modern',
  elegant: 'Élégant',
  bold: 'Bold',
  minimalist: 'Minimaliste',
  classic: 'Classique',
};

export const DesignSystemPreview = memo(({ designSystem, compact = false }: DesignSystemPreviewProps) => {
  const typoFont = TYPO_FONT_MAP[designSystem.typography.style] || 'sans-serif';
  const typoLabel = TYPO_LABEL_MAP[designSystem.typography.style] || designSystem.typography.style;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor">
        <div className="flex gap-0.5">
          {designSystem.palette.slice(0, 5).map((c, i) => (
            <div key={i} className="w-5 h-5 rounded first:rounded-l-lg last:rounded-r-lg" style={{ backgroundColor: c.hex }} />
          ))}
        </div>
        <div className="text-xs text-bolt-elements-textSecondary">
          <span className="font-medium text-bolt-elements-textPrimary">{designSystem.name}</span>
          {' · '}
          {typoLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-bold text-bolt-elements-textPrimary tracking-wide uppercase">
            {designSystem.name}
          </h3>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Typography Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="i-ph:text-aa text-bolt-elements-textTertiary text-sm" />
            <span className="text-xs font-medium text-bolt-elements-textTertiary uppercase tracking-wider">
              Typographie · {typoLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { size: 'text-2xl', weight: 'font-bold', label: 'Display' },
              { size: 'text-lg', weight: 'font-semibold', label: 'Heading' },
              { size: 'text-sm', weight: 'font-normal', label: 'Body' },
            ].map((level) => (
              <div
                key={level.label}
                className="flex flex-col items-center p-3 rounded-xl bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor"
              >
                <span
                  className={`${level.size} ${level.weight} text-bolt-elements-textPrimary`}
                  style={{ fontFamily: typoFont }}
                >
                  Aa
                </span>
                <span className="text-[10px] text-bolt-elements-textTertiary mt-1">{level.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="i-ph:palette text-bolt-elements-textTertiary text-sm" />
            <span className="text-xs font-medium text-bolt-elements-textTertiary uppercase tracking-wider">
              Palette de couleurs
            </span>
          </div>

          {/* Main colors row */}
          <div className="flex gap-1 rounded-xl overflow-hidden">
            {designSystem.palette.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="flex-1 h-14 flex flex-col items-center justify-center transition-all hover:flex-[1.5] cursor-default"
                style={{ backgroundColor: color.hex }}
              >
                <span
                  className="text-[9px] font-bold opacity-80"
                  style={{ color: getContrastColor(color.hex) }}
                >
                  {color.hex}
                </span>
              </div>
            ))}
          </div>

          {/* Color chips */}
          {designSystem.palette.length > 5 && (
            <div className="flex flex-wrap gap-1.5">
              {designSystem.palette.slice(5).map((color, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor"
                >
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color.hex }} />
                  <span className="text-[10px] text-bolt-elements-textTertiary">{color.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        {designSystem.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {designSystem.features.map((feature) => (
              <span
                key={feature}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textSecondary"
              >
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
