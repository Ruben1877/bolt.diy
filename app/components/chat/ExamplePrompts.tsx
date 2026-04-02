import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Un site vitrine pour mon cabinet dentaire', icon: 'i-ph:tooth' },
  { text: 'Une pizzeria avec réservation en ligne', icon: 'i-ph:pizza' },
  { text: 'Un salon de coiffure élégant', icon: 'i-ph:scissors' },
  { text: 'Une landing page immobilière', icon: 'i-ph:house-line' },
  { text: 'Un studio de yoga avec planning', icon: 'i-ph:flower-lotus' },
  { text: 'Un portfolio de photographe', icon: 'i-ph:camera' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative w-full max-w-2xl mx-auto mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="group flex items-center gap-1.5 border border-bolt-elements-borderColor rounded-full bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary px-3.5 py-1.5 text-xs transition-all duration-200 hover:border-accent-400/30 hover:shadow-sm"
            >
              <span className={`${examplePrompt.icon} text-sm opacity-50 group-hover:opacity-80 transition-opacity`} />
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
