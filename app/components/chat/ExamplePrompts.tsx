import React, { useState } from 'react';

const PROFESSIONS = [
  { label: 'Plombier', icon: 'i-ph:wrench' },
  { label: 'Coiffeur', icon: 'i-ph:scissors' },
  { label: 'Dentiste', icon: 'i-ph:tooth' },
  { label: 'Boulanger', icon: 'i-ph:bread' },
  { label: 'Photographe', icon: 'i-ph:camera' },
  { label: 'Électricien', icon: 'i-ph:lightning' },
  { label: 'Avocat', icon: 'i-ph:scales' },
  { label: 'Restaurant', icon: 'i-ph:fork-knife' },
  { label: 'Garagiste', icon: 'i-ph:car' },
  { label: 'Architecte', icon: 'i-ph:ruler' },
  { label: 'Coach sportif', icon: 'i-ph:barbell' },
  { label: 'Fleuriste', icon: 'i-ph:flower-lotus' },
];

function buildPrompt(profession: string): string {
  return `Crée-moi un site vitrine complet et professionnel pour un ${profession}. Inclus une page d'accueil avec hero section, une section services, une section à propos, des témoignages clients, et un formulaire de contact. Design moderne et épuré.`;
}

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  const [customValue, setCustomValue] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customValue.trim()) {
      sendMessage?.(e as unknown as React.UIEvent, buildPrompt(customValue.trim()));
    }
  };

  return (
    <div id="examples" className="relative w-full max-w-2xl mx-auto mt-4 flex flex-col items-center gap-3">
      <p className="text-bolt-elements-textSecondary text-xs font-medium">
        Créer un site vitrine pour un...
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {PROFESSIONS.map((prof, index) => (
          <button
            key={index}
            onClick={(event) => {
              sendMessage?.(event, buildPrompt(prof.label));
            }}
            className="group flex items-center gap-1.5 border border-bolt-elements-borderColor rounded-full bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary px-3.5 py-1.5 text-xs transition-all duration-200 hover:border-accent-400/30 hover:shadow-sm"
          >
            <span className={`${prof.icon} text-sm opacity-50 group-hover:opacity-80 transition-opacity`} />
            {prof.label}
          </button>
        ))}
      </div>
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mt-1">
        <span className="text-bolt-elements-textTertiary text-xs">ou</span>
        <div className="flex items-center border border-bolt-elements-borderColor rounded-full bg-bolt-elements-background-depth-1 overflow-hidden">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Votre métier..."
            className="bg-transparent text-xs text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary px-3 py-1.5 outline-none w-36"
          />
          <button
            type="submit"
            disabled={!customValue.trim()}
            className="text-xs px-3 py-1.5 text-accent-500 hover:text-accent-400 disabled:opacity-30 disabled:cursor-default transition-colors font-medium"
          >
            Générer →
          </button>
        </div>
      </form>
    </div>
  );
}
