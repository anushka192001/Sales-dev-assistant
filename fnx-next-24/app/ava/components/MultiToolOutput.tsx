import React, { useState, useEffect } from 'react';
import { Building2, Users, Search, Zap, ChevronRight, ArrowLeft, Mail, Workflow } from 'lucide-react';
import { Message, ToolOutput } from '../types/api';
import { SearchResultsView } from './SearchContactsResultsView';
import SearchCompaniesResultView from './SearchCompaniesResultsView';
import { EmailGeneratedView } from './EmailGeneratedView';
import { CadenceCreatedView } from './CadenceCreatedView';
import { TextResponseView } from './TextResponseView';

interface MultiToolOutputViewProps {
  message: Message;
  onGenerateEmail: (company: string, contact: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onSwitchTab?: () => void;
  initialTabIndex?: number;
}

// Tool icon mapping
const getToolIcon = (toolName: string) => {
  switch (toolName) {
    case 'search_companies':
      return Building2;
    case 'search_leads':
      return Users;
    case 'suggest_email':
      return Mail;
    case 'create_cadence':
      return Workflow;
    default:
      return Zap;
  }
};

// Tool display name mapping
const getToolDisplayName = (toolName: string) => {
  switch (toolName) {
    case 'search_companies':
      return 'Companies';
    case 'search_leads':
      return 'Contacts';
    case 'generate_email':
      return 'Email';
    case 'create_cadence':
      return 'Cadence';
    default:
      return toolName;
  }
};

// Tool color theme mapping for Tailwind classes
const getToolTheme = (toolName: string) => {
  switch (toolName) {
    case 'search_companies':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
        accent: 'text-blue-500',
        tab: 'border-blue-500 bg-white text-blue-700',
        tabHover: 'hover:text-blue-600 hover:bg-blue-50',
        badge: 'bg-blue-100 text-blue-700'
      };
    case 'search_leads':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600',
        accent: 'text-green-500',
        tab: 'border-green-500 bg-white text-green-700',
        tabHover: 'hover:text-green-600 hover:bg-green-50',
        badge: 'bg-green-100 text-green-700'
      };
    case 'generate_email':
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        icon: 'text-purple-600',
        accent: 'text-purple-500',
        tab: 'border-purple-500 bg-white text-purple-700',
        tabHover: 'hover:text-purple-600 hover:bg-purple-50',
        badge: 'bg-purple-100 text-purple-700'
      };
    case 'create_cadence':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        accent: 'text-orange-500',
        tab: 'border-orange-500 bg-white text-orange-700',
        tabHover: 'hover:text-orange-600 hover:bg-orange-50',
        badge: 'bg-orange-100 text-orange-700'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-600',
        accent: 'text-gray-500',
        tab: 'border-gray-500 bg-white text-gray-700',
        tabHover: 'hover:text-gray-600 hover:bg-gray-50',
        badge: 'bg-gray-100 text-gray-700'
      };
  }
};

export const MultiToolOutputView: React.FC<MultiToolOutputViewProps> = ({
  message,
  onGenerateEmail,
  onScrollToMessage,
  onSwitchTab,
  initialTabIndex = 0
}) => {
  const [activeTab, setActiveTab] = useState(initialTabIndex);
  const toolOutputs = message.toolOutputs || [];
  console.log("message",message)

  // Update active tab when initialTabIndex changes
  useEffect(() => {
    if (initialTabIndex !== undefined && initialTabIndex >= 0 && initialTabIndex < toolOutputs.length) {
      setActiveTab(initialTabIndex);
    }
  }, [initialTabIndex, toolOutputs.length]);

  console.log("MultiToolOutputView rendered with message:", message);

  // const renderToolOutput = (toolOutput: ToolOutput) => {
  //   switch (toolOutput.toolName) {
  //     case 'search_leads':
  //       return (
  //         <SearchResultsView
  //           message={toolOutput.message}
  //           //Issue here probs
  //           data={toolOutput.data}
  //           onGenerateEmail={onGenerateEmail}
  //           onScrollToMessage={onScrollToMessage}
  //           messageId={message.id}
  //         />
  //       );

  //     case 'search_companies':
  //       return (
  //         <SearchCompaniesResultView
  //           message={toolOutput.message}
  //           data={toolOutput.data}
  //           onScrollToMessage={onScrollToMessage}
  //           messageId={message.id}
  //         />
  //       );

  //     case 'suggest_email':
  //       return (
  //         <EmailGeneratedView
  //           message={toolOutput.message}
  //           data={toolOutput.data}
  //           onScrollToMessage={onScrollToMessage}
  //           messageId={message.id}
  //         />
  //       );

  //     case 'create_cadence':
  //       return (
  //         <CadenceCreatedView
  //           message={toolOutput.message}
  //           data={toolOutput.data}
  //           onScrollToMessage={onScrollToMessage}
  //           messageId={message.id}
  //           onSwitchTab={onSwitchTab}
  //         />
  //       );

  //     default:
  //       return (
  //         <TextResponseView
  //           message={toolOutput.message}
  //           onScrollToMessage={onScrollToMessage}
  //           messageId={message.id}
  //         />
  //       );
  //   }
  // };

  const renderToolOutput = (toolOutput: ToolOutput) => {
  console.log(toolOutput,"check in render tool outpit")
  // const hasBoth = toolOutput.data?.contacts && toolOutput.data?.companies;

  // if (hasBoth) {
  //   return (
  //     <div className="space-y-6">
  //       <SearchResultsView
  //         message="Contacts Found"
  //         //@ts-ignore
  //         data={{ contacts: toolOutput.data.contacts }}
  //         onGenerateEmail={onGenerateEmail}
  //         onScrollToMessage={onScrollToMessage}
  //         messageId={message.id}
  //       />
  //       <SearchCompaniesResultView
  //         message="Companies Found"
  //         data={{ companies: toolOutput.data.companies }}
  //         onScrollToMessage={onScrollToMessage}
  //         messageId={message.id}
  //       />
  //     </div>
  //   );
  // }

  switch (toolOutput.toolName) {
    case 'search_leads':
      return (
        <SearchResultsView
          message={toolOutput.message}
          data={toolOutput.data}
          onGenerateEmail={onGenerateEmail}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
        />
      );
    case 'search_companies':
      return (
        <SearchCompaniesResultView
          message={toolOutput.message}
          data={toolOutput.data}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
        />
      );
    case 'generate_email':
      return (
        <EmailGeneratedView
          message={toolOutput.message}
          data={toolOutput.data}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
        />
      );
    case 'create_cadence':
      return (
        <CadenceCreatedView
          message={toolOutput.message}
          data={toolOutput.data}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
          onSwitchTab={onSwitchTab}
        />
      );
    default:
      return (
        <TextResponseView
          message={toolOutput.message}
          onScrollToMessage={onScrollToMessage}
          messageId={message.id}
        />
      );
  }
};


  if (toolOutputs.length === 0) {
    return (
      <TextResponseView
        message={message.content}
        onScrollToMessage={onScrollToMessage}
        messageId={message.id}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tool Results</h3>
              <p className="text-sm text-gray-600">
                {toolOutputs.length} operations completed successfully
              </p>
            </div>
          </div>
          {/* {onScrollToMessage && (
            <button
              onClick={() => onScrollToMessage(message.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to message
            </button>
          )} */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-slate-200 overflow-x-auto">
        <div className="flex min-w-max">
          {toolOutputs.map((toolOutput, index) => {
            const Icon = getToolIcon(toolOutput.toolName);
            const theme = getToolTheme(toolOutput.toolName);
            const isActive = activeTab === index;
            
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                  flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 relative
                  ${isActive 
                    ? theme.tab + ' shadow-sm' 
                    : `border-transparent text-gray-600 ${theme.tabHover}`
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? theme.icon : 'text-gray-400'}`} />
                <span>{getToolDisplayName(toolOutput.toolName)}</span>
                
                {/* Data count badge */}
                {toolOutput.data && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full font-medium
                    ${isActive 
                      ? theme.badge
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {toolOutput.data.companies?.length || 
                     toolOutput.data.contacts?.length || 
                     'Data'}
                  </span>
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <ChevronRight className={`w-3 h-3 ${theme.accent} ml-auto`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {toolOutputs[activeTab] && (
          <div className="space-y-4">
            {/* Tab content header */}
            <div className={`
              p-4 rounded-lg border
              ${(() => {
                const theme = getToolTheme(toolOutputs[activeTab].toolName);
                return `${theme.bg} ${theme.border}`;
              })()}
            `}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {(() => {
                  const Icon = getToolIcon(toolOutputs[activeTab].toolName);
                  const theme = getToolTheme(toolOutputs[activeTab].toolName);
                  return <Icon className={`w-4 h-4 ${theme.icon}`} />;
                })()}
                <span className={getToolTheme(toolOutputs[activeTab].toolName).text}>
                  {getToolDisplayName(toolOutputs[activeTab].toolName)} Results
                </span>
              </div>
              <p className={`text-xs mt-1 ${getToolTheme(toolOutputs[activeTab].toolName).icon}`}>
                Generated at: {message.timestamp?.toLocaleString()}
              </p>
            </div>

            {/* Actual tool output content */}
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              {renderToolOutput(toolOutputs[activeTab])}
            </div>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Total Results:
            </span>
            {toolOutputs.map((output, index) => (
              <span key={index} className="flex items-center gap-1">
                {(() => {
                  const Icon = getToolIcon(output.toolName);
                  const theme = getToolTheme(output.toolName);
                  return <Icon className={`w-3 h-3 ${theme.accent}`} />;
                })()}
                <span className="font-medium text-gray-700">
                  {output.data?.companies?.length || 
                   output.data?.contacts?.length || 
                   0}
                </span>
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-500">
            Tab {activeTab + 1} of {toolOutputs.length}
          </div>
        </div>
      </div>
    </div>
  );
};