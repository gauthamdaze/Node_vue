import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Edge, Node } from '@vue-flow/core'
import {
  useWorkflowStore,
  type WorkflowNodeData,
  type WorkflowNodeType,
} from './workflow'

describe('workflow store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a node and selects it', () => {
    const store = useWorkflowStore()
    const initialCount = store.nodes.length

    store.addNode('start', { x: 10, y: 20 })

    expect(store.nodes.length).toBe(initialCount + 1)
    expect(store.selectedNode?.id).toBeDefined()
  })

  it('runs the default start -> transform -> end flow', () => {
    const store = useWorkflowStore()
    store.reset()

    store.runWorkflow()

    const endLog = store.logs.find((log) => log.type === 'end')
    expect(endLog).toBeTruthy()
    expect(endLog?.payload).toMatchObject({ message: 'HELLO' })
  })

  it('exports and re-imports workflow state', () => {
    const store = useWorkflowStore()
    store.reset()

    const snapshot = store.exportState()
    const originalLength = JSON.parse(snapshot).nodes.length as number

    store.addNode('end', { x: 0, y: 0 })
    expect(store.nodes.length).toBeGreaterThan(originalLength)

    store.importState(snapshot)
    expect(store.nodes.length).toBe(originalLength)
  })

  it('routes condition branches correctly', () => {
    const store = useWorkflowStore()

    const customNodes: Node<WorkflowNodeData>[] = [
      makeNode('start-a', 'start', { payload: '{"message":"go"}' }),
      makeNode('cond-1', 'condition', {
        field: 'message',
        operator: 'equals',
        value: 'go',
      }),
      makeNode('end-true', 'end', {}),
      makeNode('end-false', 'end', {}),
    ]

    const customEdges: Edge[] = [
      { id: 'e1', source: 'start-a', target: 'cond-1', label: 'flow' },
      {
        id: 'e2',
        source: 'cond-1',
        sourceHandle: 'true',
        target: 'end-true',
        label: 'true',
      },
      {
        id: 'e3',
        source: 'cond-1',
        sourceHandle: 'false',
        target: 'end-false',
        label: 'false',
      },
    ]

    store.nodes = customNodes as any
    store.edges = customEdges

    store.runWorkflow()

    expect(store.logs.some((log) => log.nodeId === 'end-true')).toBe(true)
    expect(store.logs.some((log) => log.nodeId === 'end-false')).toBe(false)
  })
})

function makeNode(
  id: string,
  type: WorkflowNodeType,
  config: WorkflowNodeData['config'],
): Node<WorkflowNodeData> {
  return {
    id,
    type: 'appNode',
    position: { x: 0, y: 0 },
    data: { type, label: id, config },
  }
}

