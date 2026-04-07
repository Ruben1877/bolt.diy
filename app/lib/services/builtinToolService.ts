import { type ToolSet, type Message, type DataStreamWriter, convertToCoreMessages, formatDataStreamPart } from 'ai';
import type { FileMap } from '~/lib/.server/llm/constants';
import type { ToolCallAnnotation } from '~/types/context';
import {
  TOOL_EXECUTION_APPROVAL,
  TOOL_EXECUTION_DENIED,
  TOOL_EXECUTION_ERROR,
  TOOL_NO_EXECUTE_FUNCTION,
} from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';
import { createSearchFilesTool } from './tools/searchFiles';
import { createFetchWebsiteTool } from './tools/fetchWebsite';
import { createWebSearchTool } from './tools/webSearch';
import { createGenerateImageTool } from './tools/generateImage';
import { createSecurityScanTool } from './tools/securityScan';
import { createSupabaseDocsSearchTool } from './tools/supabaseDocs';
import { createDesignInspirationTool } from './tools/designInspiration';
import { createStitchDesignTool } from './tools/stitchDesign';

const logger = createScopedLogger('builtin-tools');

const SERVER_NAME = 'builtin';

type ToolCall = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};

export class BuiltinToolService {
  private static _instance: BuiltinToolService;
  private _tools: ToolSet = {};
  private _toolsWithoutExecute: ToolSet = {};
  private _projectFiles: FileMap = {};
  private _apiKeys: Record<string, string> = {};
  private _env: Env | undefined;
  private _dataStream: DataStreamWriter | undefined;
  private _keepAlive: (() => void) | undefined;

  static getInstance(): BuiltinToolService {
    if (!BuiltinToolService._instance) {
      BuiltinToolService._instance = new BuiltinToolService();
      BuiltinToolService._instance._registerAllTools();
    }

    return BuiltinToolService._instance;
  }

  setContext(files: FileMap, apiKeys: Record<string, string>, env?: Env) {
    this._projectFiles = files;
    this._apiKeys = apiKeys;
    this._env = env;
    this._registerAllTools();
  }

  setDataStream(dataStream: DataStreamWriter) {
    this._dataStream = dataStream;
  }

  setKeepAlive(keepAlive: () => void) {
    this._keepAlive = keepAlive;
  }

  private _registerAllTools() {
    this._tools = {};
    this._toolsWithoutExecute = {};

    const tools: ToolSet = {
      search_files: createSearchFilesTool(() => this._projectFiles),
      fetch_website: createFetchWebsiteTool(),
      web_search: createWebSearchTool(
        () => this._apiKeys,
        () => this._env,
      ),
      generate_image: createGenerateImageTool(
        () => this._apiKeys,
        () => this._env,
      ),
      security_scan: createSecurityScanTool(() => this._projectFiles),
      supabase_docs_search: createSupabaseDocsSearchTool(),
      design_inspiration: createDesignInspirationTool(
        () => this._apiKeys,
        () => this._env,
      ),
      stitch_design: createStitchDesignTool(
        () => this._apiKeys,
        () => this._env,
        () => this._dataStream,
        () => this._keepAlive,
      ),
    };

    for (const [name, toolDef] of Object.entries(tools)) {
      this._tools[name] = toolDef;
      this._toolsWithoutExecute[name] = { ...toolDef, execute: undefined };
    }

    logger.debug(`Registered ${Object.keys(this._tools).length} built-in tools`);
  }

  isValidToolName(toolName: string): boolean {
    return toolName in this._tools;
  }

  processToolCall(toolCall: ToolCall, dataStream: DataStreamWriter): void {
    const { toolCallId, toolName } = toolCall;

    if (this.isValidToolName(toolName)) {
      const { description = 'Built-in tool' } = this._toolsWithoutExecute[toolName];

      dataStream.writeMessageAnnotation({
        type: 'toolCall',
        toolCallId,
        serverName: SERVER_NAME,
        toolName,
        toolDescription: description,
      } satisfies ToolCallAnnotation);
    }
  }

  async processToolInvocations(messages: Message[], dataStream: DataStreamWriter): Promise<Message[]> {
    const lastMessage = messages[messages.length - 1];
    const parts = lastMessage?.parts;

    if (!parts) {
      return messages;
    }

    const processedParts = await Promise.all(
      parts.map(async (part) => {
        if (part.type !== 'tool-invocation') {
          return part;
        }

        const { toolInvocation } = part;
        const { toolName, toolCallId } = toolInvocation;

        if (!this.isValidToolName(toolName) || toolInvocation.state !== 'result') {
          return part;
        }

        let result;

        if (toolInvocation.result === TOOL_EXECUTION_APPROVAL.APPROVE) {
          const toolInstance = this._tools[toolName];

          if (toolInstance && typeof toolInstance.execute === 'function') {
            logger.debug(`Executing built-in tool "${toolName}"`);

            try {
              result = await toolInstance.execute(toolInvocation.args, {
                messages: convertToCoreMessages(messages),
                toolCallId,
              });
            } catch (error) {
              logger.error(`Error executing tool "${toolName}":`, error);
              result = TOOL_EXECUTION_ERROR;
            }
          } else {
            result = TOOL_NO_EXECUTE_FUNCTION;
          }
        } else if (toolInvocation.result === TOOL_EXECUTION_APPROVAL.REJECT) {
          result = TOOL_EXECUTION_DENIED;
        } else {
          return part;
        }

        dataStream.write(
          formatDataStreamPart('tool_result', {
            toolCallId,
            result,
          }),
        );

        return {
          ...part,
          toolInvocation: {
            ...toolInvocation,
            result,
          },
        };
      }),
    );

    return [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }];
  }

  get tools(): ToolSet {
    return this._tools;
  }

  get toolsWithoutExecute(): ToolSet {
    return this._toolsWithoutExecute;
  }
}
