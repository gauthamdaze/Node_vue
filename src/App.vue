<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { VueFlow, useVueFlow, type Edge, type Node, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { storeToRefs } from 'pinia'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import BaseNode from './components/nodes/BaseNode.vue'
import {
  useWorkflowStore,
  type ConditionConfig,
  type StartConfig,
  type TransformConfig,
  type WorkflowNodeType,
} from './stores/workflow'

const store = useWorkflowStore()
const { project, onConnect, fitView } = useVueFlow()
const nodeTypes = { appNode: BaseNode }
const importInput = ref<HTMLInputElement | null>(null)
const importError = ref('')
const { selectedNode } = storeToRefs(store)

const palette = [
  {
    type: 'start',
    title: 'Start Node',
    copy: 'Define the initial payload for your workflow.',
  },
  {
    type: 'transform',
    title: 'Transform',
    copy: 'Uppercase, append text, or multiply numeric fields.',
  },
  {
    type: 'condition',
    title: 'If / Else',
    copy: 'Branch the flow based on a simple condition.',
  },
  {
    type: 'end',
    title: 'End',
    copy: 'Collect the final payload at the terminus.',
  },
]

onMounted(() => {
  fitView({ padding: 0.2 })
})

onConnect((connection) => {
  store.addEdge(connection)
})

function onNodeClick(event: { node: Node }) {
  store.selectNode(event.node.id)
}

function onNodeDragStop(event: NodeDragEvent) {
  store.updateNodePosition(event.node.id, event.node.position)
}

function onEdgesDelete(edges: Edge[]) {
  edges.forEach((edge) => store.removeEdge(edge.id))
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const type = event.dataTransfer?.getData('application/node-type') as
    | WorkflowNodeType
    | undefined
  if (!type) return
  const position = project({ x: event.clientX, y: event.clientY })
  store.addNode(type, position)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
}

function handleDragStart(event: DragEvent, type: WorkflowNodeType) {
  event.dataTransfer?.setData('application/node-type', type)
  event.dataTransfer?.setData('text/plain', type)
  event.dataTransfer?.setDragImage(createGhost(type), 0, 0)
}

function createGhost(type: WorkflowNodeType) {
  const ghost = document.createElement('div')
  ghost.textContent = `+ ${type}`
  ghost.style.cssText =
    'padding:6px 10px;background:#0f172a;color:#e2e8f0;border-radius:10px;border:1px solid #1e293b;box-shadow:0 10px 30px rgba(0,0,0,.35);'
  document.body.appendChild(ghost)
  setTimeout(() => document.body.removeChild(ghost), 0)
  return ghost
}

function addNodeFromPalette(type: WorkflowNodeType) {
  const fallbackPosition = project({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
  store.addNode(type, fallbackPosition)
}

function updateLabel(value: string) {
  const node = selectedNode.value
  if (!node) return
  store.updateNodeData(node.id, { label: value })
}

function updateStartConfig(patch: Partial<StartConfig>) {
  const node = selectedNode.value
  if (!node) return
  store.updateNodeConfig(node.id, patch)
}

function updateTransformConfig(patch: Partial<TransformConfig>) {
  const node = selectedNode.value
  if (!node) return
  store.updateNodeConfig(node.id, patch)
}

function updateConditionConfig(patch: Partial<ConditionConfig>) {
  const node = selectedNode.value
  if (!node) return
  store.updateNodeConfig(node.id, patch)
}

function runWorkflow() {
  store.runWorkflow()
}

function exportWorkflow() {
  const blob = new Blob([store.exportState()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'workflow.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importInput.value?.click()
}

async function handleImport(event: Event) {
  importError.value = ''
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    store.importState(text)
  } catch (error) {
    importError.value =
      error instanceof Error ? error.message : 'Unable to import file'
  } finally {
    target.value = ''
  }
}

function clearFlow() {
  store.reset()
  fitView({ padding: 0.2 })
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand__dot" />
        <div>
          <div class="brand__title">Gautham's Flow Builder</div>
          <p class="brand__subtitle">Drag, connect, configure, and run</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost" type="button" @click="clearFlow">Reset</button>
        <button class="btn ghost" type="button" @click="exportWorkflow">
          Export JSON
        </button>
        <button class="btn ghost" type="button" @click="triggerImport">
          Import JSON
        </button>
        <button class="btn primary" type="button" @click="runWorkflow">
          ▶ Run Workflow
        </button>
      </div>
    </header>

    <div class="layout">
      <aside class="panel palette">
        <div class="panel__header">
          <div>
            <div class="panel__title">Node palette</div>
            <p class="panel__subtitle">Drag a node into the canvas</p>
          </div>
        </div>
        <div class="palette__grid">
          <div
            v-for="item in palette"
            :key="item.type"
            class="palette__card"
            draggable="true"
            @dragstart="(e) => handleDragStart(e, item.type as WorkflowNodeType)"
          >
            <div class="palette__title">{{ item.title }}</div>
            <p class="palette__copy">{{ item.copy }}</p>
            <div class="palette__actions">
              <span class="pill">{{ item.type }}</span>
              <button
                class="btn tiny"
                type="button"
                @click="addNodeFromPalette(item.type as WorkflowNodeType)"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main class="canvas" @drop="onDrop" @dragover="onDragOver">
        <VueFlow
          v-model:nodes="store.nodes"
          v-model:edges="store.edges"
          :node-types="nodeTypes"
          :default-edge-options="{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#cbd5e1', strokeWidth: 2 },
          }"
          :min-zoom="0.35"
          :max-zoom="1.6"
          :fit-view="true"
          class="flow"
          @node-click="onNodeClick"
          @pane-click="store.clearSelection"
          @node-drag-stop="onNodeDragStop"
          @edges-delete="onEdgesDelete"
        >
          <Background pattern-color="#1f2937" :gap="16" />
          <MiniMap pannable zoomable />
          <Controls position="bottom-right" />
        </VueFlow>
      </main>

      <aside class="panel inspector">
        <div class="panel__header">
          <div>
            <div class="panel__title">Configuration</div>
            <p class="panel__subtitle">
              {{ selectedNode ? 'Edit the selected node' : 'Select a node to edit' }}
            </p>
          </div>
        </div>

        <div v-if="selectedNode" class="config">
          <label class="field">
            <span>Label</span>
            <input
              :value="selectedNode.data.label"
              type="text"
              placeholder="Node name"
              @input="updateLabel(($event.target as HTMLInputElement).value)"
            />
          </label>

          <template v-if="selectedNode.data.type === 'start'">
            <label class="field">
              <span>Initial payload (JSON)</span>
              <textarea
                rows="5"
                :value="(selectedNode.data.config as StartConfig).payload"
                @input="
                  updateStartConfig({
                    payload: ($event.target as HTMLTextAreaElement).value,
                  })
                "
              />
            </label>
          </template>

          <template v-else-if="selectedNode.data.type === 'transform'">
            <label class="field">
              <span>Operation</span>
              <select
                :value="(selectedNode.data.config as TransformConfig).operation"
                @change="
                  updateTransformConfig({
                    operation: ($event.target as HTMLSelectElement)
                      .value as TransformConfig['operation'],
                  })
                "
              >
                <option value="uppercase">Uppercase</option>
                <option value="append">Append text</option>
                <option value="multiply">Multiply number</option>
              </select>
            </label>
            <label class="field">
              <span>Field</span>
              <input
                :value="(selectedNode.data.config as TransformConfig).field"
                type="text"
                placeholder="message"
                @input="
                  updateTransformConfig({
                    field: ($event.target as HTMLInputElement).value,
                  })
                "
              />
            </label>
            <label
              v-if="(selectedNode.data.config as TransformConfig).operation === 'append'"
              class="field"
            >
              <span>Append text</span>
              <input
                :value="(selectedNode.data.config as TransformConfig).appendText"
                type="text"
                placeholder="!!!"
                @input="
                  updateTransformConfig({
                    appendText: ($event.target as HTMLInputElement).value,
                  })
                "
              />
            </label>
            <label
              v-if="
                (selectedNode.data.config as TransformConfig).operation === 'multiply'
              "
              class="field"
            >
              <span>Factor</span>
              <input
                :value="(selectedNode.data.config as TransformConfig).factor ?? 1"
                type="number"
                min="0"
                step="0.1"
                @input="
                  updateTransformConfig({
                    factor: Number(($event.target as HTMLInputElement).value),
                  })
                "
              />
            </label>
          </template>

          <template v-else-if="selectedNode.data.type === 'condition'">
            <label class="field">
              <span>Field</span>
              <input
                :value="(selectedNode.data.config as ConditionConfig).field"
                type="text"
                placeholder="field name"
                @input="
                  updateConditionConfig({
                    field: ($event.target as HTMLInputElement).value,
                  })
                "
              />
            </label>
            <label class="field">
              <span>Operator</span>
              <select
                :value="(selectedNode.data.config as ConditionConfig).operator"
                @change="
                  updateConditionConfig({
                    operator: ($event.target as HTMLSelectElement)
                      .value as ConditionConfig['operator'],
                  })
                "
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
                <option value="exists">Exists</option>
              </select>
            </label>
            <label
              v-if="(selectedNode.data.config as ConditionConfig).operator !== 'exists'"
              class="field"
            >
              <span>Value</span>
              <input
                :value="(selectedNode.data.config as ConditionConfig).value ?? ''"
                type="text"
                placeholder="compare against..."
                @input="
                  updateConditionConfig({
                    value: ($event.target as HTMLInputElement).value,
                  })
                "
              />
            </label>
            <p class="hint">
              Connect from <strong>true</strong> / <strong>false</strong> handles to
              branch.
            </p>
          </template>

          <template v-else-if="selectedNode.data.type === 'end'">
            <p class="hint">No configuration required. This node collects the payload.</p>
          </template>
        </div>
        <div v-else class="empty">
          <p>Select a node on the canvas to configure it.</p>
        </div>

        <div class="panel__header mt">
          <div>
            <div class="panel__title">Execution log</div>
            <p class="panel__subtitle">
              {{ store.logs.length ? 'Last run' : 'Run the workflow to see logs' }}
            </p>
          </div>
        </div>
        <div class="logs" v-if="store.logs.length">
          <div v-for="(log, index) in store.logs" :key="log.nodeId + index" class="log">
            <div class="log__header">
              <span class="pill">{{ log.nodeLabel }}</span>
              <span class="log__note">{{ log.note ?? 'Visited' }}</span>
            </div>
            <pre class="log__payload">{{ JSON.stringify(log.payload, null, 2) }}</pre>
          </div>
        </div>
        <div v-else class="empty">
          <p>No runs yet.</p>
        </div>
      </aside>
    </div>

    <input
      ref="importInput"
      type="file"
      accept="application/json"
      class="hidden"
      @change="handleImport"
    />
    <p v-if="importError" class="error">{{ importError }}</p>
  </div>
</template>
