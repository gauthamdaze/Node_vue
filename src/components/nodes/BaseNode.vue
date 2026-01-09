<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import type { WorkflowNodeData } from '../../stores/workflow'

const props = defineProps<NodeProps<WorkflowNodeData>>()

const accent = computed(() => {
  switch (props.data.type) {
    case 'start':
      return '#22c55e'
    case 'transform':
      return '#6366f1'
    case 'condition':
      return '#f59e0b'
    case 'end':
      return '#ef4444'
    default:
      return '#0ea5e9'
  }
})

const description = computed(() => {
  if (props.data.type === 'transform')
    return `${(props.data.config as any).operation ?? 'transform'} on ${(props.data.config as any).field ?? 'value'}`
  if (props.data.type === 'condition')
    return `if ${(props.data.config as any).field ?? 'field'} ${(props.data.config as any).operator ?? ''}`
  return props.data.label
})

const hasTarget = computed(() => props.data.type !== 'start')
const hasSource = computed(() => props.data.type !== 'end')
</script>

<template>
  <div class="node" :style="{ borderColor: accent }">
    <div class="node__header">
      <div class="node__dot" :style="{ background: accent }" />
      <div class="node__title">{{ data.label }}</div>
    </div>
    <div class="node__body">
      <p class="node__desc">{{ description }}</p>
    </div>

    <Handle
      v-if="hasTarget"
      type="target"
      :position="Position.Left"
      class="handle handle--target"
    />
    <template v-if="data.type === 'condition'">
      <Handle
        id="true"
        type="source"
        :position="Position.Right"
        class="handle handle--source"
      >
        <span class="handle__label">true</span>
      </Handle>
      <Handle
        id="false"
        type="source"
        :position="Position.Bottom"
        class="handle handle--source"
      >
        <span class="handle__label">false</span>
      </Handle>
    </template>
    <Handle
      v-else-if="hasSource"
      type="source"
      :position="Position.Right"
      class="handle handle--source"
    />
  </div>
</template>

<style scoped>
.node {
  min-width: 180px;
  background: #0f172a;
  color: #e2e8f0;
  border: 2px solid #1e293b;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.45);
  padding: 12px 14px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.node:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 38px rgba(15, 23, 42, 0.52);
}
.node__header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.node__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.node__title {
  font-size: 15px;
}
.node__body {
  margin-top: 6px;
}
.node__desc {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}
.handle {
  width: 10px;
  height: 10px;
  border-radius: 6px;
  background: #cbd5e1;
  border: 1px solid #1e293b;
}
.handle--source {
  background: #e2e8f0;
}
.handle__label {
  color: #0f172a;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  background: #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}
</style>

