import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import {
  addEdge as addEdgeUtil,
  type Connection,
  type Edge,
  type Node,
  type XYPosition,
} from '@vue-flow/core'

export type WorkflowNodeType = 'start' | 'transform' | 'condition' | 'end'

export type StartConfig = {
  payload: string
}

export type TransformConfig = {
  operation: 'uppercase' | 'append' | 'multiply'
  field: string
  appendText?: string
  factor?: number
}

export type ConditionConfig = {
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists'
  value?: string
}

export type WorkflowNodeData = {
  type: WorkflowNodeType
  label: string
  config: StartConfig | TransformConfig | ConditionConfig | Record<string, unknown>
}

export type ExecutionLogEntry = {
  nodeId: string
  nodeLabel: string
  type: WorkflowNodeType
  payload: unknown
  note?: string
}

type FlowNode = Node<WorkflowNodeData> & { data: WorkflowNodeData }

type WorkflowSnapshot = {
  nodes: FlowNode[]
  edges: Edge[]
}

const defaultNodes: FlowNode[] = [
  {
    id: 'start-1',
    type: 'appNode',
    position: { x: 120, y: 80 },
    data: {
      type: 'start',
      label: 'Start',
      config: { payload: '{"message":"hello"}' },
    },
  },
  {
    id: 'transform-1',
    type: 'appNode',
    position: { x: 360, y: 80 },
    data: {
      type: 'transform',
      label: 'Transform',
      config: { operation: 'uppercase', field: 'message', appendText: '!' },
    },
  },
  {
    id: 'end-1',
    type: 'appNode',
    position: { x: 600, y: 80 },
    data: {
      type: 'end',
      label: 'End',
      config: {},
    },
  },
]

const defaultEdges: Edge[] = [
  {
    id: 'e-start-transform',
    source: 'start-1',
    target: 'transform-1',
    label: 'flow',
    animated: true,
  },
  {
    id: 'e-transform-end',
    source: 'transform-1',
    target: 'end-1',
    label: 'flow',
  },
]

const MAX_NODES = 200
const MAX_EDGES = 400
const MAX_LABEL_LENGTH = 120
const MAX_PAYLOAD_LENGTH = 5000
const ALLOWED_NODE_TYPES: WorkflowNodeType[] = ['start', 'transform', 'condition', 'end']
const ALLOWED_TRANSFORMS: TransformConfig['operation'][] = ['uppercase', 'append', 'multiply']
const ALLOWED_OPERATORS: ConditionConfig['operator'][] = ['equals', 'contains', 'greater', 'less', 'exists']

const DEFAULT_LABELS: Record<WorkflowNodeType, string> = {
  start: 'Start',
  transform: 'Transform',
  condition: 'If / Else',
  end: 'End',
}

function typeLabel(type: WorkflowNodeType) {
  return DEFAULT_LABELS[type] ?? 'Node'
}

function sanitizeLabel(label: unknown, fallback: string) {
  if (typeof label !== 'string') return fallback
  const trimmed = label.trim()
  return trimmed ? trimmed.slice(0, MAX_LABEL_LENGTH) : fallback
}

function sanitizePosition(position: unknown): XYPosition {
  const x = Number((position as any)?.x)
  const y = Number((position as any)?.y)
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  return { x: 0, y: 0 }
}

function sanitizeStartConfig(config: unknown): StartConfig {
  const payload =
    typeof (config as any)?.payload === 'string'
      ? (config as any).payload.slice(0, MAX_PAYLOAD_LENGTH)
      : '{"message":"hello"}'
  return { payload }
}

function sanitizeTransformConfig(config: unknown): TransformConfig {
  const cfg = (config ?? {}) as Record<string, unknown>
  const operation = ALLOWED_TRANSFORMS.includes(cfg.operation as TransformConfig['operation'])
    ? (cfg.operation as TransformConfig['operation'])
    : 'uppercase'
  const field =
    typeof cfg.field === 'string' && cfg.field.trim()
      ? cfg.field.trim().slice(0, 64)
      : 'message'
  const appendText =
    typeof cfg.appendText === 'string' ? (cfg.appendText as string).slice(0, 200) : undefined
  const factor =
    Number.isFinite(cfg.factor) && typeof cfg.factor === 'number'
      ? (cfg.factor as number)
      : undefined
  return { operation, field, appendText, factor }
}

function sanitizeConditionConfig(config: unknown): ConditionConfig {
  const cfg = (config ?? {}) as Record<string, unknown>
  const field =
    typeof cfg.field === 'string' && cfg.field.trim()
      ? cfg.field.trim().slice(0, 64)
      : 'field'
  const operator = ALLOWED_OPERATORS.includes(cfg.operator as ConditionConfig['operator'])
    ? (cfg.operator as ConditionConfig['operator'])
    : 'equals'
  const value =
    cfg.value !== undefined && cfg.value !== null ? String(cfg.value).slice(0, 200) : undefined
  return { field, operator, value }
}

function sanitizeConfig(type: WorkflowNodeType, config: unknown) {
  if (type === 'start') return sanitizeStartConfig(config)
  if (type === 'transform') return sanitizeTransformConfig(config)
  if (type === 'condition') return sanitizeConditionConfig(config)
  return {}
}

function validateNode(raw: unknown): FlowNode | null {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof (raw as any).id === 'string' ? (raw as any).id.slice(0, 64) : null
  if (!id) return null

  const data = (raw as any).data ?? {}
  const type = (data as any).type as WorkflowNodeType
  if (!ALLOWED_NODE_TYPES.includes(type)) return null

  const label = sanitizeLabel((data as any).label, typeLabel(type))
  const position = sanitizePosition((raw as any).position)
  const config = sanitizeConfig(type, (data as any).config)

  return {
    id,
    type: 'appNode',
    position,
    data: {
      type,
      label,
      config,
    },
  }
}

function validateEdge(raw: unknown, nodeIds: Set<string>): Edge | null {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof (raw as any).id === 'string' ? (raw as any).id.slice(0, 64) : null
  const source =
    typeof (raw as any).source === 'string' && nodeIds.has((raw as any).source)
      ? ((raw as any).source as string)
      : null
  const target =
    typeof (raw as any).target === 'string' && nodeIds.has((raw as any).target)
      ? ((raw as any).target as string)
      : null
  if (!id || !source || !target) return null

  const label =
    typeof (raw as any).label === 'string' ? ((raw as any).label as string).slice(0, 60) : undefined
  const sourceHandle =
    typeof (raw as any).sourceHandle === 'string' ? ((raw as any).sourceHandle as string) : undefined
  const targetHandle =
    typeof (raw as any).targetHandle === 'string' ? ((raw as any).targetHandle as string) : undefined

  return {
    id,
    source,
    target,
    label,
    sourceHandle,
    targetHandle,
    animated: Boolean((raw as any).animated),
  }
}

export const useWorkflowStore = defineStore('workflow', () => {
  const nodes = ref<FlowNode[]>([...defaultNodes])
  const edges = ref<Edge[]>([...defaultEdges])
  const selectedNodeId = ref<string | null>(null)
  const logs = ref<ExecutionLogEntry[]>([])

  const selectedNode = computed(() =>
    nodes.value.find((node) => node.id === selectedNodeId.value) ?? null,
  )

  function clearSelection() {
    selectedNodeId.value = null
  }

  function selectNode(id: string) {
    selectedNodeId.value = id
  }

  function createNodeConfig(type: WorkflowNodeType) {
    if (type === 'start') return { payload: '{"message":"hello"}' } satisfies StartConfig
    if (type === 'transform')
      return {
        operation: 'uppercase',
        field: 'message',
        appendText: '!',
        factor: 2,
      } satisfies TransformConfig
    if (type === 'condition')
      return {
        field: 'message',
        operator: 'contains',
        value: 'hello',
      } satisfies ConditionConfig
    return {}
  }

  function addNode(type: WorkflowNodeType, position: XYPosition) {
    const id = `${type}-${nanoid(6)}`
    const node: FlowNode = {
      id,
      type: 'appNode',
      position,
      data: {
        type,
        label: typeLabel(type),
        config: createNodeConfig(type),
      },
    }
    nodes.value = [...nodes.value, node]
    selectedNodeId.value = id
  }

  function updateNodePosition(id: string, position: XYPosition) {
    nodes.value = nodes.value.map((node): FlowNode =>
      node.id === id ? { ...node, position } : node,
    )
  }

  function updateNodeData(id: string, data: Partial<WorkflowNodeData>) {
    nodes.value = nodes.value.map((node): FlowNode =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node,
    )
  }

  function updateNodeConfig(id: string, config: Record<string, unknown>) {
    nodes.value = nodes.value.map((node): FlowNode =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              config: { ...node.data.config, ...config },
            },
          }
        : node,
    )
  }

  function addEdge(connection: Edge | Connection) {
    edges.value = addEdgeUtil(connection, edges.value) as Edge[]
  }

  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((edge) => edge.id !== edgeId)
  }

  function reset() {
    nodes.value = [...defaultNodes]
    edges.value = [...defaultEdges]
    selectedNodeId.value = null
    logs.value = []
  }

  function exportState() {
    const payload: WorkflowSnapshot = {
      nodes: nodes.value,
      edges: edges.value,
    }
    return JSON.stringify(payload, null, 2)
  }

  function importState(json: string) {
    try {
      const parsed = JSON.parse(json) as WorkflowSnapshot
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges))
        throw new Error('Invalid workflow file')

      if (parsed.nodes.length > MAX_NODES) throw new Error('Too many nodes in workflow file')
      if (parsed.edges.length > MAX_EDGES) throw new Error('Too many edges in workflow file')

      const sanitizedNodes: FlowNode[] = []
      for (const raw of parsed.nodes) {
        const node = validateNode(raw)
        if (node) sanitizedNodes.push(node)
      }
      if (!sanitizedNodes.length) throw new Error('No valid nodes found in workflow file')

      const nodeIds = new Set(sanitizedNodes.map((node) => node.id))
      const sanitizedEdges: Edge[] = []
      for (const raw of parsed.edges) {
        const edge = validateEdge(raw, nodeIds)
        if (edge) sanitizedEdges.push(edge)
      }

      nodes.value = sanitizedNodes
      edges.value = sanitizedEdges
      selectedNodeId.value = null
      logs.value = []
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unable to import workflow',
      )
    }
  }

  function clonePayload<T>(payload: T): T {
    try {
      // structuredClone is available in modern runtimes; fallback to JSON for safety
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return structuredClone(payload)
    } catch {
      return JSON.parse(JSON.stringify(payload)) as T
    }
  }

  function applyTransform(
    payload: any,
    config: TransformConfig,
  ): { payload: any; note?: string } {
    const next = clonePayload(payload)
    const field = config.field || 'message'
    const currentValue = (next as Record<string, unknown>)[field]
    if (config.operation === 'uppercase' && typeof currentValue === 'string') {
      ;(next as Record<string, unknown>)[field] = currentValue.toUpperCase()
      return { payload: next, note: `uppercased ${field}` }
    }
    if (config.operation === 'append' && typeof currentValue === 'string') {
      ;(next as Record<string, unknown>)[field] = `${currentValue}${config.appendText ?? ''}`
      return { payload: next, note: `appended text on ${field}` }
    }
    if (config.operation === 'multiply' && typeof currentValue === 'number') {
      ;(next as Record<string, unknown>)[field] =
        currentValue * (config.factor ?? 1)
      return { payload: next, note: `multiplied ${field}` }
    }
    return {
      payload: next,
      note: 'No transformation applied (type mismatch)',
    }
  }

  function evaluateCondition(payload: any, config: ConditionConfig) {
    const value = (payload as Record<string, unknown>)[config.field]
    switch (config.operator) {
      case 'equals':
        return `${value ?? ''}` === `${config.value ?? ''}`
      case 'contains':
        return typeof value === 'string' && !!config.value
          ? value.includes(config.value)
          : false
      case 'greater':
        return Number(value) > Number(config.value)
      case 'less':
        return Number(value) < Number(config.value)
      case 'exists':
        return value !== undefined && value !== null
      default:
        return false
    }
  }

  function runWorkflow() {
    const startNodes = nodes.value.filter((n) => n.data.type === 'start')
    logs.value = []

    if (startNodes.length === 0) {
      logs.value.push({
        nodeId: 'system',
        nodeLabel: 'System',
        type: 'start',
        payload: {},
        note: 'No start node found',
      })
      return
    }

    const nodeMap = new Map(nodes.value.map((node) => [node.id, node]))
    const adjacency = edges.value.reduce<Map<string, Edge[]>>((acc, edge) => {
      const bucket = acc.get(edge.source) ?? []
      bucket.push(edge)
      acc.set(edge.source, bucket)
      return acc
    }, new Map())

    type QueueItem = { nodeId: string; payload: any }
    const queue: QueueItem[] = []

    for (const start of startNodes) {
      let payload: unknown = {}
      try {
        const raw = (start.data.config as StartConfig)?.payload
        payload = raw ? JSON.parse(raw) : {}
      } catch {
        payload = {}
        logs.value.push({
          nodeId: start.id,
          nodeLabel: start.data.label,
          type: start.data.type,
          payload,
          note: 'Invalid JSON payload, using empty object',
        })
      }
      queue.push({ nodeId: start.id, payload })
    }

    const visitCount = new Map<string, number>()
    const stepLimit = 200
    let steps = 0

    while (queue.length && steps < stepLimit) {
      steps += 1
      const { nodeId, payload } = queue.shift() as QueueItem
      const node = nodeMap.get(nodeId)
      if (!node) continue

      const visits = (visitCount.get(nodeId) ?? 0) + 1
      visitCount.set(nodeId, visits)
      if (visits > 15) {
        logs.value.push({
          nodeId,
          nodeLabel: node.data.label,
          type: node.data.type,
          payload,
          note: 'Stopped to avoid potential loop',
        })
        continue
      }

      if (node.data.type === 'transform') {
        const result = applyTransform(
          payload,
          node.data.config as TransformConfig,
        )
        logs.value.push({
          nodeId,
          nodeLabel: node.data.label,
          type: node.data.type,
          payload: result.payload,
          note: result.note,
        })
        const outEdges = adjacency.get(nodeId) ?? []
        outEdges.forEach((edge) =>
          queue.push({ nodeId: edge.target, payload: result.payload }),
        )
        continue
      }

      if (node.data.type === 'condition') {
        const outcome = evaluateCondition(
          payload,
          node.data.config as ConditionConfig,
        )
        logs.value.push({
          nodeId,
          nodeLabel: node.data.label,
          type: node.data.type,
          payload,
          note: `Condition evaluated ${outcome ? 'true' : 'false'}`,
        })
        const outEdges = adjacency.get(nodeId) ?? []
        const filtered = outEdges.filter((edge) =>
          outcome
            ? edge.sourceHandle === 'true' || edge.label === 'true'
            : edge.sourceHandle === 'false' || edge.label === 'false',
        )
        const nextEdges = filtered.length ? filtered : outEdges
        nextEdges.forEach((edge) =>
          queue.push({ nodeId: edge.target, payload }),
        )
        continue
      }

      logs.value.push({
        nodeId,
        nodeLabel: node.data.label,
        type: node.data.type,
        payload,
      })

      const outEdges = adjacency.get(nodeId) ?? []
      outEdges.forEach((edge) => queue.push({ nodeId: edge.target, payload }))
    }

    if (steps >= stepLimit) {
      logs.value.push({
        nodeId: 'system',
        nodeLabel: 'System',
        type: 'end',
        payload: {},
        note: 'Execution halted: step limit reached',
      })
    }
  }

  return {
    nodes,
    edges,
    logs,
    selectedNode,
    addNode,
    addEdge,
    removeEdge,
    selectNode,
    clearSelection,
    updateNodePosition,
    updateNodeData,
    updateNodeConfig,
    exportState,
    importState,
    runWorkflow,
    reset,
  }
})

