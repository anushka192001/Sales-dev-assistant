import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Handle,
    Position,
    addEdge,
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    Connection,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertCircle, CheckCircle2, Zap, Database, Search, Mail, Phone, FileText, Globe, Settings, Edit3, Save } from 'lucide-react';

// ====================================================================================
// TYPESCRIPT INTERFACES
// ====================================================================================

interface ToolArgs {
    [key: string]: string | number | boolean | string[] | number[];
}

interface Step {
    step_id: string;
    tool_name: string;
    tool_args: ToolArgs;
    description: string;
    depends_on: string[];
    use_previous_results: boolean;
}

export interface ExecutionPlan {
    execution_type: "parallel" | "sequential";
    description: string;
    steps: Step[];
}

interface ToolNodeData {
    tool_name: string;
    description: string;
    tool_args: ToolArgs;
    updateNodeArgs: (nodeId: string, newArgs: ToolArgs) => void;
    toggleEditMode: (nodeId: string) => void;
    editingNodeId: string | null;
    isReadOnly: boolean;
    hasChanges?: boolean;
    isNew?: boolean;
    executionOrder?: number;
}

type ToolNodeType = Node<ToolNodeData>;

interface CustomEdgeData {
    onDelete: (edgeId: string) => void;
    isReadOnly: boolean;
}

type CustomEdgeType = Edge<CustomEdgeData>;

// ====================================================================================
// UTILITY FUNCTIONS
// ====================================================================================

// Tool icon mapping
const getToolIcon = (toolName: string) => {
    const name = toolName.toLowerCase();
    if (name.includes('search') || name.includes('find')) return Search;
    if (name.includes('email')) return Mail;
    if (name.includes('phone') || name.includes('call')) return Phone;
    if (name.includes('data') || name.includes('database')) return Database;
    if (name.includes('file') || name.includes('document')) return FileText;
    if (name.includes('web') || name.includes('scrape')) return Globe;
    return Settings;
};

// Tool color scheme
const getToolColor = (toolName: string) => {
    const name = toolName.toLowerCase();
    if (name.includes('search') || name.includes('find')) return { bg: 'from-blue-500 to-blue-600', border: 'border-blue-600', text: 'text-blue-100' };
    if (name.includes('email')) return { bg: 'from-purple-500 to-purple-600', border: 'border-purple-600', text: 'text-purple-100' };
    if (name.includes('phone') || name.includes('call')) return { bg: 'from-green-500 to-green-600', border: 'border-green-600', text: 'text-green-100' };
    if (name.includes('data') || name.includes('database')) return { bg: 'from-orange-500 to-orange-600', border: 'border-orange-600', text: 'text-orange-100' };
    if (name.includes('file') || name.includes('document')) return { bg: 'from-yellow-500 to-yellow-600', border: 'border-yellow-600', text: 'text-yellow-100' };
    if (name.includes('web') || name.includes('scrape')) return { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-600', text: 'text-indigo-100' };
    return { bg: 'from-gray-500 to-gray-600', border: 'border-gray-600', text: 'text-gray-100' };
};

// Detect cycle in the graph
const detectCycle = (nodes: ToolNodeType[], edges: CustomEdgeType[], newEdge: Connection): boolean => {
    const adjacencyList: { [key: string]: string[] } = {};
    nodes.forEach(node => { adjacencyList[node.id] = []; });
    edges.forEach(edge => {
        if (adjacencyList[edge.source]) {
            adjacencyList[edge.source].push(edge.target);
        }
    });
    if (newEdge.source && newEdge.target && adjacencyList[newEdge.source]) {
        adjacencyList[newEdge.source].push(newEdge.target);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;
        visited.add(nodeId);
        recursionStack.add(nodeId);
        const neighbors = adjacencyList[nodeId] || [];
        for (const neighbor of neighbors) {
            if (hasCycleDFS(neighbor)) return true;
        }
        recursionStack.delete(nodeId);
        return false;
    };

    for (const nodeId of Object.keys(adjacencyList)) {
        if (!visited.has(nodeId)) {
            if (hasCycleDFS(nodeId)) return true;
        }
    }
    return false;
};

// Calculate execution order for nodes
const calculateExecutionOrder = (nodes: ToolNodeType[], edges: CustomEdgeType[]): Map<string, number> => {
    const orderMap = new Map<string, number>();
    const adjacencyList: { [key: string]: string[] } = {};
    const inDegree: { [key: string]: number } = {};

    nodes.forEach(node => {
        adjacencyList[node.id] = [];
        inDegree[node.id] = 0;
    });

    edges.forEach(edge => {
        if (adjacencyList[edge.source]) {
            adjacencyList[edge.source].push(edge.target);
            inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
        }
    });

    const queue = nodes.filter(node => inDegree[node.id] === 0).map(n => n.id);
    let order = 1;

    while (queue.length > 0) {
        const size = queue.length;
        for (let i = 0; i < size; i++) {
            const nodeId = queue.shift()!;
            orderMap.set(nodeId, order);

            adjacencyList[nodeId].forEach(neighbor => {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            });
        }
        order++;
    }

    return orderMap;
};

// Transform plan to flow with horizontal layout
const transformPlanToFlow = (
    plan: ExecutionPlan,
    updateNodeArgsCallback: (nodeId: string, newArgs: ToolArgs) => void,
    onDeleteEdge: (edgeId: string) => void,
    toggleEditMode: (nodeId: string) => void,
    editingNodeId: string | null,
    isReadOnly: boolean,
    changedNodes: Set<string>
): { initialNodes: ToolNodeType[], initialEdges: CustomEdgeType[] } => {
    const initialNodes: ToolNodeType[] = [];
    const initialEdges: CustomEdgeType[] = [];

    // Create adjacency list for layout calculation
    const adjacencyList: { [key: string]: string[] } = {};
    const reverseAdjacencyList: { [key: string]: string[] } = {};
    const inDegree: { [key: string]: number } = {};

    plan.steps.forEach(step => {
        adjacencyList[step.step_id] = step.depends_on;
        reverseAdjacencyList[step.step_id] = [];
        inDegree[step.step_id] = step.depends_on.length;
    });

    plan.steps.forEach(step => {
        step.depends_on.forEach(dep => {
            if (reverseAdjacencyList[dep]) {
                reverseAdjacencyList[dep].push(step.step_id);
            }
        });
    });

    // Calculate layers using topological sort
    const layers: string[][] = [];
    const queue = plan.steps.filter(s => s.depends_on.length === 0).map(s => s.step_id);
    const nodeLayer: { [key: string]: number } = {};

    while (queue.length > 0) {
        const currentLayer: string[] = [];
        const size = queue.length;

        for (let i = 0; i < size; i++) {
            const nodeId = queue.shift()!;
            currentLayer.push(nodeId);
            nodeLayer[nodeId] = layers.length;

            reverseAdjacencyList[nodeId].forEach(dependent => {
                inDegree[dependent]--;
                if (inDegree[dependent] === 0) {
                    queue.push(dependent);
                }
            });
        }
        layers.push(currentLayer);
    }

    // Position nodes horizontally
    const HORIZONTAL_SPACING = 350;
    const VERTICAL_SPACING = 120;
    const START_X = 50;
    const START_Y = 50;

    plan.steps.forEach((step, index) => {
        const layer = nodeLayer[step.step_id] || 0;
        const layerNodes = layers[layer] || [];
        const positionInLayer = layerNodes.indexOf(step.step_id);
        const layerHeight = layerNodes.length * VERTICAL_SPACING;

        const x = START_X + layer * HORIZONTAL_SPACING;
        const y = START_Y + positionInLayer * VERTICAL_SPACING + (400 - layerHeight) / 2;

        initialNodes.push({
            id: step.step_id,
            type: 'tool',
            position: { x, y },
            data: {
                tool_name: step.tool_name,
                description: step.description,
                tool_args: step.tool_args,
                updateNodeArgs: updateNodeArgsCallback,
                toggleEditMode,
                editingNodeId,
                isReadOnly,
                hasChanges: changedNodes.has(step.step_id),
                executionOrder: layer + 1,
            },
        });

        step.depends_on.forEach(dependencyId => {
            initialEdges.push({
                id: `edge-${dependencyId}-${step.step_id}`,
                source: dependencyId,
                target: step.step_id,
                type: 'custom',
                animated: true,
                style: { stroke: '#4F46E5', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#4F46E5' },
                data: { onDelete: onDeleteEdge, isReadOnly },
            });
        });
    });

    return { initialNodes, initialEdges };
};

// ====================================================================================
// NODE AND EDGE COMPONENTS
// ====================================================================================

const ToolNode: React.FC<ToolNodeType> = ({ id, data }) => {
    const isEditing = data.editingNodeId === id;
    const [localArgs, setLocalArgs] = React.useState(data.tool_args);
    const [showSaveAnimation, setShowSaveAnimation] = React.useState(false);
    const Icon = getToolIcon(data.tool_name);
    const colors = getToolColor(data.tool_name);

    React.useEffect(() => {
        setLocalArgs(data.tool_args);
    }, [data.tool_args]);

    const handleSave = () => {
        data.updateNodeArgs(id, localArgs);
        data.toggleEditMode(id);
        setShowSaveAnimation(true);
        setTimeout(() => setShowSaveAnimation(false), 1000);
    };

    const handleCancel = () => {
        setLocalArgs(data.tool_args);
        data.toggleEditMode(id);
    };

    return (
        <div
            className={`
                relative rounded-xl shadow-lg transition-all duration-300 min-w-[280px] max-w-[320px]
                ${isEditing ? 'ring-4 ring-blue-400 ring-opacity-50 scale-105' : ''}
                ${data.hasChanges ? 'ring-2 ring-green-400' : ''}
                ${!data.isReadOnly && !isEditing ? 'hover:shadow-xl hover:scale-102 cursor-pointer' : ''}
            `}
            onClick={() => !data.isReadOnly && !isEditing && data.toggleEditMode(id)}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-indigo-500 border-2 border-white"
            />

            {/* Header */}
            <div className={`bg-gradient-to-r ${colors.bg} rounded-t-xl px-4 py-3 ${colors.text}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <h3 className="font-semibold text-sm">{data.tool_name}</h3>
                    </div>
                    {data.executionOrder && (
                        <div className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-medium">
                            Step {data.executionOrder}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-b-xl p-4">
                <p className="text-xs text-gray-600 mb-3">{data.description}</p>

                {data.hasChanges && !isEditing && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Modified</span>
                    </div>
                )}

                {isEditing ? (
                    <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Edit3 className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700">Edit Arguments</span>
                            </div>
                            {Object.entries(localArgs).map(([key, value]) => (
                                <div key={key} className="mb-2">
                                    <label className="text-xs font-medium text-gray-700 block mb-1">
                                        {key}:
                                    </label>
                                    <input
                                        type="text"
                                        value={Array.isArray(value) ? value.join(', ') : String(value)}
                                        onChange={(e) => setLocalArgs(prev => ({
                                            ...prev,
                                            [key]: e.target.value.includes(',') ?
                                                e.target.value.split(',').map(s => s.trim()) :
                                                e.target.value
                                        }))}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-md hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-1"
                            >
                                <Save className="w-3 h-3" />
                                Save
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 transition-all duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    !data.isReadOnly && (
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            Click to edit
                        </div>
                    )
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-indigo-500 border-2 border-white"
            />

            {/* Save animation */}
            {showSaveAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomEdge: React.FC<any> = (props) => {
    const [edgePath, labelX, labelY] = getBezierPath(props);

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={props.markerEnd}
                style={{
                    ...props.style,
                    strokeDasharray: props.animated ? '5 5' : 'none',
                    animation: props.animated ? 'dash 1s linear infinite' : 'none'
                }}
            />
            {!props.data?.isReadOnly && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        <button
                            className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-all duration-200 hover:scale-110 flex items-center justify-center text-xs font-bold"
                            onClick={(event) => {
                                event.stopPropagation();
                                props.data.onDelete(props.id);
                            }}
                            title="Delete connection"
                        >
                            ×
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

const nodeTypes = { tool: ToolNode };
const edgeTypes = { custom: CustomEdge };

// ====================================================================================
// MAIN WORKFLOW EDITOR COMPONENT
// ====================================================================================

interface WorkflowEditorProps {
    initialPlan: ExecutionPlan;
    onExportPlan: (plan: ExecutionPlan) => void;
    isReadOnly?: boolean;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ initialPlan, onExportPlan, isReadOnly = false }) => {
    const [nodes, setNodes] = useState<ToolNodeType[]>([]);
    const [edges, setEdges] = useState<CustomEdgeType[]>([]);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [changedNodes, setChangedNodes] = useState<Set<string>>(new Set());
    const [showSaveNotification, setShowSaveNotification] = useState(false);

    const updateNodeArgs = useCallback((nodeId: string, newArgs: ToolArgs) => {
        if (isReadOnly) return;
        setNodes((nds) => nds.map((node) =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, tool_args: newArgs, hasChanges: true } }
                : node
        ));
        setChangedNodes(prev => new Set(prev).add(nodeId));
    }, [isReadOnly]);

    const toggleEditMode = useCallback((nodeId: string) => {
        if (isReadOnly) return;
        setEditingNodeId(prev => (prev === nodeId ? null : nodeId));
    }, [isReadOnly]);

    const onDeleteEdge = useCallback((edgeId: string) => {
        if (isReadOnly) return;
        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    }, [isReadOnly]);

    useEffect(() => {
        if (initialPlan) {
            const { initialNodes, initialEdges } = transformPlanToFlow(
                initialPlan, updateNodeArgs, onDeleteEdge, toggleEditMode, editingNodeId, isReadOnly, changedNodes
            );

            // Calculate execution order
            const orderMap = calculateExecutionOrder(initialNodes, initialEdges);
            const nodesWithOrder = initialNodes.map(node => ({
                ...node,
                data: { ...node.data, executionOrder: orderMap.get(node.id) }
            }));

            setNodes(nodesWithOrder);
            setEdges(initialEdges);
        }
    }, [initialPlan, isReadOnly]);

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                data: { ...node.data, editingNodeId, hasChanges: changedNodes.has(node.id) }
            }))
        );
    }, [editingNodeId, changedNodes]);

    const onNodesChange: OnNodesChange = useCallback((changes) => {
        if (isReadOnly) return;
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, [isReadOnly]);

    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        if (isReadOnly) return;
        setEdges((eds) => applyEdgeChanges(changes, eds));
    }, [isReadOnly]);

    const onConnect: OnConnect = useCallback((params) => {
        if (isReadOnly || !params.source || !params.target) return;

        const wouldCreateCycle = detectCycle(nodes, edges, params);
        if (wouldCreateCycle) {
            alert('Cannot create this connection: it would create a cycle in the workflow');
            return;
        }

        const newEdge: CustomEdgeType = {
            ...params,
            id: `edge-${params.source}-${params.target}`,
            type: 'custom',
            source: params.source,
            target: params.target,
            animated: true,
            style: { stroke: '#4F46E5', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#4F46E5' },
            data: { onDelete: onDeleteEdge, isReadOnly }
        };
        setEdges((eds) => addEdge(newEdge, eds));
    }, [isReadOnly, onDeleteEdge, nodes, edges]);

    const isValidConnection = useCallback((connection: Connection) => {
        if (isReadOnly) return false;
        if (connection.source === connection.target) return false;
        const existingConnection = edges.find(
            (edge) => edge.source === connection.source && edge.target === connection.target
        );
        if (existingConnection) return false;
        const wouldCreateCycle = detectCycle(nodes, edges, connection);
        if (wouldCreateCycle) return false;
        return true;
    }, [nodes, edges, isReadOnly]);

    const exportCurrentPlan = () => {
        const updatedSteps = nodes.map(node => {
            const dependencies = edges
                .filter(edge => edge.target === node.id)
                .map(edge => edge.source as string);

            return {
                step_id: node.id,
                tool_name: node.data.tool_name,
                tool_args: node.data.tool_args,
                description: node.data.description,
                depends_on: dependencies,
                use_previous_results: dependencies.length > 0
            };
        });

        const updatedPlan: ExecutionPlan = {
            ...initialPlan,
            steps: updatedSteps
        };

        onExportPlan(updatedPlan);
        setShowSaveNotification(true);
        setTimeout(() => setShowSaveNotification(false), 3000);
    };

    return (
        <div className="h-full w-full relative bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-inner">
            <style>{`
                @keyframes dash {
                    to { stroke-dashoffset: -10; }
                }
                .animate-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={!isReadOnly}
                nodesConnectable={!isReadOnly}
                elementsSelectable={!isReadOnly}
                className="bg-pattern"
            >
                <Controls className="bg-white rounded-lg shadow-md" />
                <Background color="#E5E7EB" gap={16} />
            </ReactFlow>

            {!isReadOnly && (
                <div className="absolute top-4 right-4 z-10 space-y-3">
                    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Workflow Actions</h3>

                        {changedNodes.size > 0 && (
                            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                <div className="flex items-center gap-2 text-xs">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <span className="text-amber-700 font-medium">
                                        {changedNodes.size} unsaved change{changedNodes.size > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={exportCurrentPlan}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save & Execute
                        </button>

                        <div className="mt-3 space-y-1 text-xs text-gray-600">
                            <p className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Click nodes to edit parameters
                            </p>
                            <p className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Drag handles to create connections
                            </p>
                            <p className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                Click × on connections to delete
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Save notification */}
            {showSaveNotification && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Workflow saved successfully!</span>
                </div>
            )}
        </div>
    );
};

export default WorkflowEditor;