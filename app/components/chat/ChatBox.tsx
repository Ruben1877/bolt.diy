import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { classNames } from '~/utils/classNames';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { SendButton } from './SendButton.client';
import { IconButton } from '~/components/ui/IconButton';
import { toast } from 'react-toastify';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { ColorSchemeDialog } from '~/components/ui/ColorSchemeDialog';

interface ChatBoxProps {
  isModelSettingsCollapsed: boolean;
  setIsModelSettingsCollapsed: (collapsed: boolean) => void;
  provider: any;
  providerList: any[];
  modelList: any[];
  apiKeys: Record<string, string>;
  isModelLoading: string | undefined;
  onApiKeysChange: (providerName: string, apiKey: string) => void;
  uploadedFiles: File[];
  imageDataList: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
  input: string;
  handlePaste: (e: React.ClipboardEvent) => void;
  TEXTAREA_MIN_HEIGHT: number;
  TEXTAREA_MAX_HEIGHT: number;
  isStreaming: boolean;
  handleSendMessage: (event: React.UIEvent, messageInput?: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  chatStarted: boolean;
  exportChat?: () => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  setProvider?: ((provider: any) => void) | undefined;
  model?: string | undefined;
  setModel?: ((model: string) => void) | undefined;
  setUploadedFiles?: ((files: File[]) => void) | undefined;
  setImageDataList?: ((dataList: string[]) => void) | undefined;
  handleInputChange?: ((event: React.ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  handleStop?: (() => void) | undefined;
  enhancingPrompt?: boolean | undefined;
  enhancePrompt?: (() => void) | undefined;
  onWebSearchResult?: (result: string) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: ((element: ElementInfo | null) => void) | undefined;
}

export const ChatBox: React.FC<ChatBoxProps> = (props) => {
  return (
    <div
      className={classNames(
        'relative w-full max-w-chat mx-auto z-prompt',
      )}
    >
      <div
        className={classNames(
          'relative bg-bolt-elements-background-depth-1 rounded-2xl',
          'border border-bolt-elements-borderColor',
          'shadow-[0_2px_20px_rgba(0,0,0,0.04)]',
          'transition-shadow duration-300',
          'focus-within:shadow-[0_2px_30px_rgba(99,102,241,0.08)]',
          'focus-within:border-accent-400/40',
        )}
      >
        <FilePreview
          files={props.uploadedFiles}
          imageDataList={props.imageDataList}
          onRemove={(index) => {
            props.setUploadedFiles?.(props.uploadedFiles.filter((_, i) => i !== index));
            props.setImageDataList?.(props.imageDataList.filter((_, i) => i !== index));
          }}
        />
        <ClientOnly>
          {() => (
            <ScreenshotStateManager
              setUploadedFiles={props.setUploadedFiles}
              setImageDataList={props.setImageDataList}
              uploadedFiles={props.uploadedFiles}
              imageDataList={props.imageDataList}
            />
          )}
        </ClientOnly>
        {props.selectedElement && (
          <div className="flex mx-3 mt-3 gap-2 items-center justify-between rounded-lg border border-bolt-elements-borderColor text-bolt-elements-textPrimary py-1.5 px-3 font-medium text-xs bg-bolt-elements-background-depth-2">
            <div className="flex gap-2 items-center lowercase">
              <code className="bg-accent-500 rounded px-1.5 py-0.5 text-white text-[11px]">
                {props?.selectedElement?.tagName}
              </code>
              selected for inspection
            </div>
            <button
              className="bg-transparent text-accent-500 hover:text-accent-600 transition-colors"
              onClick={() => props.setSelectedElement?.(null)}
            >
              Clear
            </button>
          </div>
        )}
        <textarea
          ref={props.textareaRef}
          className={classNames(
            'w-full pl-4 pt-4 pr-16 pb-2 outline-none resize-none',
            'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
            'bg-transparent text-sm leading-relaxed',
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid var(--bolt-elements-borderColorActive)';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid var(--bolt-elements-borderColorActive)';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

            const files = Array.from(e.dataTransfer.files);
            files.forEach((file) => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (ev) => {
                  const base64Image = ev.target?.result as string;
                  props.setUploadedFiles?.([...props.uploadedFiles, file]);
                  props.setImageDataList?.([...props.imageDataList, base64Image]);
                };
                reader.readAsDataURL(file);
              }
            });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (event.shiftKey) {
                return;
              }

              event.preventDefault();

              if (props.isStreaming) {
                props.handleStop?.();
                return;
              }

              if (event.nativeEvent.isComposing) {
                return;
              }

              props.handleSendMessage?.(event);
            }
          }}
          value={props.input}
          onChange={(event) => {
            props.handleInputChange?.(event);
          }}
          onPaste={props.handlePaste}
          style={{
            minHeight: props.TEXTAREA_MIN_HEIGHT,
            maxHeight: props.TEXTAREA_MAX_HEIGHT,
          }}
          placeholder={
            props.chatStarted
              ? 'Apportez des modifications...'
              : 'Décrivez votre prochain projet...'
          }
          translate="no"
        />
        <ClientOnly>
          {() => (
            <SendButton
              show={props.input.length > 0 || props.isStreaming || props.uploadedFiles.length > 0}
              isStreaming={props.isStreaming}
              disabled={!props.providerList || props.providerList.length === 0}
              onClick={(event) => {
                if (props.isStreaming) {
                  props.handleStop?.();
                  return;
                }

                if (props.input.length > 0 || props.uploadedFiles.length > 0) {
                  props.handleSendMessage?.(event);
                }
              }}
            />
          )}
        </ClientOnly>
        <div className="flex items-center gap-1 px-3 pb-3">
          <IconButton
            title="Joindre une image"
            className="transition-all text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary"
            onClick={() => props.handleFileUpload()}
          >
            <div className="i-ph:paperclip text-lg"></div>
          </IconButton>
          <IconButton
            title="Améliorer le prompt"
            disabled={props.input.length === 0 || props.enhancingPrompt}
            className={classNames(
              'transition-all text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary',
              props.enhancingPrompt ? 'opacity-100' : '',
            )}
            onClick={() => {
              props.enhancePrompt?.();
              toast.success('Prompt amélioré !');
            }}
          >
            {props.enhancingPrompt ? (
              <div className="i-svg-spinners:90-ring-with-bg text-accent-500 text-lg animate-spin"></div>
            ) : (
              <div className="i-bolt:stars text-lg"></div>
            )}
          </IconButton>
          <ColorSchemeDialog designScheme={props.designScheme} setDesignScheme={props.setDesignScheme} />
          <SpeechRecognitionButton
            isListening={props.isListening}
            onStart={props.startListening}
            onStop={props.stopListening}
            disabled={props.isStreaming}
          />
          <div className="flex-1" />
          {props.input.length > 3 && (
            <div className="text-[11px] text-bolt-elements-textTertiary">
              <kbd className="px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2 text-bolt-elements-textTertiary border border-bolt-elements-borderColor">Shift</kbd>
              {' + '}
              <kbd className="px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2 text-bolt-elements-textTertiary border border-bolt-elements-borderColor">Entrée</kbd>
              {' nouvelle ligne'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
