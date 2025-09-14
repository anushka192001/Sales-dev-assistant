import React from 'react';
import { Message } from '../types/api';
import { SearchResultsView } from './SearchContactsResultsView';
import { EmailGeneratedView } from './EmailGeneratedView';
import { TextResponseView } from './TextResponseView';
import { CadenceCreatedView } from './CadenceCreatedView';
import SearchCompaniesResultView from './SearchCompaniesResultsView';
import { MultiToolOutputView } from './MultiToolOutput';

interface ToolOutputProps {
  message: Message;
  onGenerateEmail: (company: string, contact: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onSwitchTab?: () => void;
}

export const ToolOutput: React.FC<ToolOutputProps> = ({
  message,
  onGenerateEmail,
  onScrollToMessage,
  onSwitchTab
}) => {

  // Handle multi-tool response
  if (message.responseType === 'multi_tool_response') {
    return (
      <MultiToolOutputView
        message={message}
        onGenerateEmail={onGenerateEmail}
        onScrollToMessage={onScrollToMessage}
        onSwitchTab={onSwitchTab}
        //@ts-ignore
        initialTabIndex={message.selectedTabIndex}
      />
    );
  }

  // Handle single tool response
  if (message.responseType === 'tool_response' && message.toolOutputs && message.toolOutputs.length === 1) {
    const toolOutput = message.toolOutputs[0];
    const toolData = toolOutput.data;
    
    switch (toolOutput.toolName) {
      case 'search_leads':
        return (
          <SearchResultsView
            message={toolOutput.message || message.content}
            data={toolData}
            onGenerateEmail={onGenerateEmail}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
      case 'search_companies':
        return (
          <SearchCompaniesResultView
            message={toolOutput.message || message.content}
            data={toolData}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
      case 'generate_email':
        return (
          <EmailGeneratedView
            message={toolOutput.message || message.content}
            //@ts-ignore
            data={toolData}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
      case 'create_cadence':
        return (
          <CadenceCreatedView
            message={toolOutput.message || message.content}
            //@ts-ignore
            data={toolData}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
            onSwitchTab={onSwitchTab}
          />
        );
      default:
        return (
          <TextResponseView 
            message={message.content}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
    }
  }

  // Fallback for backward compatibility - check if data has contacts/companies directly
  const hasBothContactsAndCompanies =
    message.responseType === 'tool_response' &&
    message.data?.contacts &&
    message.data?.companies;

  if (hasBothContactsAndCompanies) {
    return (
      <div className="space-y-6">
        <SearchResultsView
          message="Contacts Found"
          //@ts-ignore
          data={{ contacts: message.data.contacts }}
          onGenerateEmail={onGenerateEmail}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
        />
        <SearchCompaniesResultView
          message="Companies Found"
          data={{ companies: message.data.companies }}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
        />
      </div>
    );
  }

  // Legacy single tool response handling
  if (message.responseType === 'tool_response') {
    switch (message.toolName) {
      case 'search_leads':
        return (
          <SearchResultsView
            message={message.content}
            data={message.data!}
            onGenerateEmail={onGenerateEmail}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
      case 'search_companies':
        return (
          <SearchCompaniesResultView
            message={message.content}
            data={message.data!}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
      case 'generate_email':
        return (
          <EmailGeneratedView
            message={message.content}
            //@ts-ignore
            data={message.data}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
      case 'create_cadence':
        return (
          <CadenceCreatedView
            message={message.content}
            //@ts-ignore
            data={message.data!}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
            onSwitchTab={onSwitchTab}
          />
        );
      default:
        return (
          <TextResponseView 
            message={message.content}
            onScrollToMessage={onScrollToMessage}
            messageId={message.id}
          />
        );
    }
  }

  return (
    <TextResponseView 
      message={message.content}
      onScrollToMessage={onScrollToMessage}
      messageId={message.id}
    />
  );
};