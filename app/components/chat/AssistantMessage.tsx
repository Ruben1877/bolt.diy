import { memo, Fragment } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import Popover from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import WithTooltip from '~/components/ui/Tooltip';
import type { Message } from 'ai';
import type { ProviderInfo } from '~/types/model';
import type {
  TextUIPart,
  ReasoningUIPart,
  ToolInvocationUIPart,
  SourceUIPart,
  FileUIPart,
  StepStartUIPart,
} from '@ai-sdk/ui-utils';
import { ToolInvocations } from './ToolInvocations';
import { DesignCards } from './DesignCards';
import type { ToolCallAnnotation, DesignCardsAnnotation, ProgressAnnotation } from '~/types/context';

/* ── Card de progression style Lovable ───────────────────── */

const STITCH_STEP_KEYS = ['stitch-1', 'stitch-2', 'stitch-3', 'stitch-4', 'stitch-5'];

const STITCH_STEP_LABELS: Record<string, string> = {
  'stitch-1': 'Analyse du secteur & références design',
  'stitch-2': 'Concept visuel — couleurs & typographie',
  'stitch-3': 'Architecture des sections & navigation',
  'stitch-4': 'Génération du design avec Gemini AI',
  'stitch-5': 'Compilation HTML & aperçu final',
};

const StitchNarration = memo(({ steps }: { steps: ProgressAnnotation[] }) => {
  if (steps.length === 0) {
    return null;
  }

  // Déduplique par label (garde le dernier état — complete > in-progress)
  const byLabel = new Map<string, ProgressAnnotation>();

  for (const s of steps) {
    const existing = byLabel.get(s.label);

    if (!existing || existing.status !== 'complete') {
      byLabel.set(s.label, s);
    }
  }

  // Titre de la card (premier step qui a cardTitle)
  const cardTitle = steps.find((s) => s.cardTitle)?.cardTitle ?? 'Génération du site';

  // Est-ce que tous les stitch-X sont terminés ?
  const allDone = STITCH_STEP_KEYS.every((k) => byLabel.get(k)?.status === 'complete');

  // Seulement si on a au moins un stitch-X connu
  const hasStitchSteps = STITCH_STEP_KEYS.some((k) => byLabel.has(k));

  if (!hasStitchSteps) {
    return null;
  }

  return (
    <div className="my-4 rounded-xl border border-bolt-elements-borderColor overflow-hidden bg-bolt-elements-background-depth-1 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
        <span className="text-sm font-semibold text-bolt-elements-textPrimary truncate">{cardTitle}</span>
        {allDone ? (
          <div className="i-ph:check-circle-fill text-green-500 text-base flex-shrink-0" />
        ) : (
          <div className="i-svg-spinners:90-ring-with-bg text-base text-accent-500 flex-shrink-0" />
        )}
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2.5">
        {STITCH_STEP_KEYS.map((key) => {
          const step = byLabel.get(key);
          const status = step?.status ?? 'pending';

          return (
            <div key={key} className="flex items-center gap-2.5">
              {status === 'complete' ? (
                <div className="i-ph:check-circle-fill text-green-500 text-base flex-shrink-0" />
              ) : status === 'in-progress' ? (
                <div className="i-svg-spinners:90-ring-with-bg text-base text-accent-500 flex-shrink-0" />
              ) : (
                <div className="i-ph:circle text-base text-bolt-elements-textTertiary/30 flex-shrink-0" />
              )}
              <span
                className={`text-sm leading-snug ${
                  status === 'pending'
                    ? 'text-bolt-elements-textTertiary/50'
                    : status === 'in-progress'
                      ? 'text-bolt-elements-textPrimary font-medium'
                      : 'text-bolt-elements-textSecondary'
                }`}
              >
                {STITCH_STEP_LABELS[key]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
  messageId?: string;
  onRewind?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  model?: string;
  provider?: ProviderInfo;
  parts:
    | (TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart)[]
    | undefined;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  progressAnnotations?: ProgressAnnotation[];
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

export const AssistantMessage = memo(
  ({
    content,
    annotations,
    messageId,
    onRewind,
    onFork,
    append,
    chatMode,
    setChatMode,
    model,
    provider,
    parts,
    addToolResult,
    progressAnnotations: progressAnnotationsProp,
  }: AssistantMessageProps) => {
    const filteredAnnotations = (annotations?.filter(
      (annotation: JSONValue) =>
        annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
    ) || []) as { type: string; value: any } & { [key: string]: any }[];

    let chatSummary: string | undefined = undefined;

    if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
      chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
    }

    let codeContext: string[] | undefined = undefined;

    if (filteredAnnotations.find((annotation) => annotation.type === 'codeContext')) {
      codeContext = filteredAnnotations.find((annotation) => annotation.type === 'codeContext')?.files;
    }

    const usage: {
      completionTokens: number;
      promptTokens: number;
      totalTokens: number;
    } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

    const designCardsAll = filteredAnnotations.filter(
      (annotation) => annotation.type === 'designCards',
    ) as DesignCardsAnnotation[];
    const designCards = designCardsAll.length > 0 ? designCardsAll[designCardsAll.length - 1] : undefined;

    const toolInvocations = parts?.filter((part) => part.type === 'tool-invocation');
    const toolCallAnnotations = filteredAnnotations.filter(
      (annotation) => annotation.type === 'toolCall',
    ) as ToolCallAnnotation[];

    // Priorité : prop injectée depuis BaseChat (stream live) > annotations du message (historique)
    const progressSteps: ProgressAnnotation[] =
      progressAnnotationsProp ??
      (filteredAnnotations.filter((annotation) => annotation.type === 'progress') as ProgressAnnotation[]);

    return (
      <div className="overflow-hidden w-full">
        <>
          <div className=" flex gap-2 items-center text-sm text-bolt-elements-textSecondary mb-2">
            {(codeContext || chatSummary) && (
              <Popover side="right" align="start" trigger={<div className="i-ph:info" />}>
                {chatSummary && (
                  <div className="max-w-chat">
                    <div className="summary max-h-96 flex flex-col">
                      <h2 className="border border-bolt-elements-borderColor rounded-md p4">Summary</h2>
                      <div style={{ zoom: 0.7 }} className="overflow-y-auto m4">
                        <Markdown>{chatSummary}</Markdown>
                      </div>
                    </div>
                    {codeContext && (
                      <div className="code-context flex flex-col p4 border border-bolt-elements-borderColor rounded-md">
                        <h2>Context</h2>
                        <div className="flex gap-4 mt-4 bolt" style={{ zoom: 0.6 }}>
                          {codeContext.map((x) => {
                            const normalized = normalizedFilePath(x);
                            return (
                              <Fragment key={normalized}>
                                <code
                                  className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1.5 py-1 rounded-md text-bolt-elements-item-contentAccent hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openArtifactInWorkbench(normalized);
                                  }}
                                >
                                  {normalized}
                                </code>
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="context"></div>
              </Popover>
            )}
            <div className="flex w-full items-center justify-between">
              {usage && (
                <div>
                  Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
                </div>
              )}
              {(onRewind || onFork) && messageId && (
                <div className="flex gap-2 flex-col lg:flex-row ml-auto">
                  {onRewind && (
                    <WithTooltip tooltip="Revert to this message">
                      <button
                        onClick={() => onRewind(messageId)}
                        key="i-ph:arrow-u-up-left"
                        className="i-ph:arrow-u-up-left text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                      />
                    </WithTooltip>
                  )}
                  {onFork && (
                    <WithTooltip tooltip="Fork chat from this message">
                      <button
                        onClick={() => onFork(messageId)}
                        key="i-ph:git-fork"
                        className="i-ph:git-fork text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                      />
                    </WithTooltip>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
        <Markdown append={append} chatMode={chatMode} setChatMode={setChatMode} model={model} provider={provider} html>
          {content}
        </Markdown>
        {progressSteps.length > 0 && !designCards && <StitchNarration steps={progressSteps} />}
        {designCards && designCards.designs?.length > 0 && (
          <DesignCards
            designs={designCards.designs}
            projectId={designCards.projectId}
            designSystem={designCards.designSystem}
            append={append}
            loading={designCards.loading}
            totalExpected={designCards.totalExpected}
          />
        )}
        {toolInvocations && toolInvocations.length > 0 && (
          <ToolInvocations
            toolInvocations={toolInvocations}
            toolCallAnnotations={toolCallAnnotations}
            addToolResult={addToolResult}
          />
        )}
      </div>
    );
  },
);
