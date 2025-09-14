import React, { useState } from 'react';
import { ChevronDown, Bot, Zap } from 'lucide-react';
import { AVAILABLE_MODELS, ModelOption, getModelById } from '../config/models';

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    disabled?: boolean;
    compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    selectedModel,
    onModelChange,
    disabled = false,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentModel = getModelById(selectedModel);

    const handleModelSelect = (modelId: string) => {
        onModelChange(modelId);
        setIsOpen(false);
    };

    const getProviderIcon = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'openai':
                return '🤖';
            case 'anthropic':
                return '🧠';
            case 'mistral':
                return '⚡';
            default:
                return '🔮';
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'openai':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'anthropic':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'mistral':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
            flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all duration-200
            ${disabled
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                            : 'hover:bg-gray-50 cursor-pointer bg-white border-gray-300'
                        }
          `}
                    title={disabled ? "Cannot change model during conversation" : `Current model: ${currentModel?.name}`}
                >
                    <span className="text-xs">{getProviderIcon(currentModel?.provider || '')}</span>
                    <span className="font-medium truncate max-w-16">
                        {currentModel?.name.split(' ')[0] || 'Model'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                </button>

                {isOpen && !disabled && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                            <div className="p-2">
                                <div className="text-xs font-medium text-gray-500 mb-2 px-2">Select Model</div>
                                {AVAILABLE_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => handleModelSelect(model.id)}
                                        className={`
                      w-full text-left px-2 py-2 rounded-md transition-colors text-xs
                      ${model.id === selectedModel
                                                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                                : 'hover:bg-gray-50 text-gray-700'
                                            }
                    `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{getProviderIcon(model.provider)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{model.name}</div>
                                            </div>
                                            {model.isDefault && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-1 rounded">Default</span>
                                            )}
                                        </div>
                                        {model.description && (
                                            <div className="text-gray-500 text-xs mt-1 line-clamp-2">{model.description}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 min-w-0
          ${disabled
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                        : 'hover:bg-gray-50 cursor-pointer bg-white border-gray-300'
                    }
        `}
                title={disabled ? "Cannot change model during conversation" : "Select AI model"}
            >
                <div className={`w-2 h-2 rounded-full ${currentModel ? getProviderColor(currentModel.provider) : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-gray-900 truncate">
                        {currentModel?.name || 'Select Model'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                        {currentModel?.provider || 'No provider'}
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {isOpen && !disabled && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-96 overflow-y-auto">
                        <div className="p-3">
                            <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Bot className="w-4 h-4" />
                                Choose AI Model
                            </div>
                            <div className="space-y-2">
                                {AVAILABLE_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => handleModelSelect(model.id)}
                                        className={`
                      w-full text-left p-3 rounded-lg transition-all duration-200 border
                      ${model.id === selectedModel
                                                ? `${getProviderColor(model.provider)} border-current`
                                                : 'hover:bg-gray-50 text-gray-700 border-gray-200'
                                            }
                    `}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-lg">{getProviderIcon(model.provider)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-sm">{model.name}</div>
                                                    {model.isDefault && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                {model.description && (
                                                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                        {model.description}
                                                    </div>
                                                )}
                                            </div>
                                            {model.id === selectedModel && (
                                                <Zap className="w-4 h-4 text-current flex-shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};