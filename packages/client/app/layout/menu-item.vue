<template>
  <el-tooltip :disabled="disabled" :content="toValue(label)" placement="bottom">
    <span class="menu-item" :class="[type, { disabled }]" @click="action(ctx.internal.createScope())">
      <k-icon class="menu-icon" :name="toValue(icon)"></k-icon>
    </span>
  </el-tooltip>
</template>

<script lang="ts" setup>

import { LegacyMenuItem, MaybeGetter, useContext } from '@koishijs/client'
import { computed } from 'vue'

const props = defineProps<LegacyMenuItem>()

const ctx = useContext()

const disabled = computed(() => {
  if (!props.action) return true
  if (!props.disabled) return false
  return toValue(props.disabled)
})

function toValue<T>(getter: MaybeGetter<T>): T {
  if (typeof getter !== 'function') return getter
  return (getter as any)(ctx.internal.createScope())
}

</script>
