export type ContextAnnotation =
  | {
      type: 'codeContext';
      files: string[];
    }
  | {
      type: 'chatSummary';
      summary: string;
      chatId: string;
    };

export type ProgressAnnotation = {
  type: 'progress';
  label: string;
  status: 'in-progress' | 'complete';
  order: number;
  message: string;
};

export type ToolCallAnnotation = {
  type: 'toolCall';
  toolCallId: string;
  serverName: string;
  toolName: string;
  toolDescription: string;
};

export type DesignSystemAnnotation = {
  name: string;
  palette: Array<{ label: string; hex: string }>;
  typography: {
    style: string;
    fonts: string[];
  };
  features: string[];
};

export type DesignCardsAnnotation = {
  type: 'designCards';
  projectId?: string;
  designs: Array<{
    option: number;
    title: string;
    imageUrl: string;
    htmlUrl: string;
    screenId?: string;
  }>;
  designSystem?: DesignSystemAnnotation;
  loading?: boolean;
  totalExpected?: number;
};
