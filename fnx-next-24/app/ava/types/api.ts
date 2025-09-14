// types/api.ts

export interface ProgressStep {
  text: string;
  timestamp: number;
}

export interface ToolOutput {
  toolName: string;
  data: any;
  message?: string;
}

export interface PlanReviewData {
  plan: {
    execution_type: string;
    description: string;
    steps: Array<{
      step_id: string;
      tool_name: string;
      tool_args: any;
      description: string;
      depends_on: string[];
      use_previous_results: boolean;
    }>;
  };
  message: string;
  session_id: string;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  progressSteps?: ProgressStep[];
  responseType?: 'text_response' | 'tool_response' | 'multi_tool_response' | 'plan_review';
  toolName?: string;
  data?: any;
  toolOutputs?: ToolOutput[];
  suggested_actions?: any[];
  planReviewData?: PlanReviewData;
}