export interface ModelOption {
    id: string;
    name: string;
    provider: string;
    description?: string;
    isDefault?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
    {
        id: 'openai/gpt-4o',
        name: 'Clodura-fast',
        provider: 'OpenAI',
        description: 'Fast model with excellent reasoning',
        isDefault: true,
    },
    {
        id: 'anthropic/claude-sonnet-4',
        name: 'Clodura-Pro',
        provider: 'Anthropic',
        description: 'Most intelligent model with excellent reasoning',
    },
    {
        id: 'mistralai/mistral-small-3.2-24b-instruct',
        name: 'Clodura Base',
        provider: 'Mistral',
        description: 'Efficient Base model for general tasks',
    },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS.find(model => model.isDefault) || AVAILABLE_MODELS[0];

export const getModelById = (id: string): ModelOption | undefined => {
    return AVAILABLE_MODELS.find(model => model.id === id);
};

export const getModelDisplayName = (id: string): string => {
    const model = getModelById(id);
    return model ? `${model.name}` : id;
};

export const isValidModel = (id: string): boolean => {
    return AVAILABLE_MODELS.some(model => model.id === id);
};

export const validateAndGetModel = (id: string): ModelOption => {
    const model = getModelById(id);
    if (!model) {
        console.warn(`Invalid model ID: ${id}, falling back to default`);
        return DEFAULT_MODEL;
    }
    return model;
};