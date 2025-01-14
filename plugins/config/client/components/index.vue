<template>
  <k-layout menu="config">
    <template #header>
      <!-- root -->
      <template v-if="!current.path">
        {{ current.label }}
      </template>

      <!-- group -->
      <template v-else-if="current.children">
        分组 <k-alias :current="current"></k-alias>
      </template>

      <!-- plugin -->
      <template v-else>
        <template v-if="!current.label">
          <el-select v-model="current.target" filterable placeholder="插件选择">
            <el-option
              v-for="name in Object.values(store.packages).slice(1).map(value => value.shortname).sort()"
              :key="name" :label="name" :value="name"
            ></el-option>
          </el-select>
        </template>
        <template v-else>
          <span class="label">{{ current.label }}</span>
          <k-alias :current="current"></k-alias>
        </template>
      </template>
    </template>

    <template #left>
      <tree-view v-model="path"></tree-view>
    </template>

    <k-content class="plugin-view" :key="path">
      <global-settings v-if="!current.path" :current="current" v-model="config"></global-settings>
      <group-settings v-else-if="current.children" v-model="config" :current="current"></group-settings>
      <plugin-settings v-else :current="current" v-model="config"></plugin-settings>
    </k-content>

    <el-dialog
      v-model="showRemove"
      title="确认移除"
      destroy-on-close
      @closed="remove = null"
    >
      <template v-if="remove">
        确定要移除{{ remove.children ? `分组 ${remove.alias}` : `插件 ${remove.label}` }} 吗？此操作不可撤销！
      </template>
      <template #footer>
        <el-button @click="showRemove = false">取消</el-button>
        <el-button type="danger" @click="(showRemove = false, removeItem(remove.path))">确定</el-button>
      </template>
    </el-dialog>
  </k-layout>
</template>

<script setup lang="ts">

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clone, message, send, store, useContext } from '@koishijs/client'
import { Tree, addItem, hasCoreDeps, current, name, plugins, removeItem, select, splitPath } from './utils'
import GlobalSettings from './global.vue'
import GroupSettings from './group.vue'
import TreeView from './tree.vue'
import PluginSettings from './plugin.vue'
import KAlias from './alias.vue'

const route = useRoute()
const router = useRouter()

const path = computed<string>({
  get() {
    const name = route.path.slice(9)
    return name in plugins.value.paths ? name : ''
  },
  set(name) {
    if (!(name in plugins.value.paths)) name = ''
    router.replace('/plugins/' + name)
  },
})

const config = ref()

const remove = ref<Tree>()
const showRemove = ref(false)

watch(remove, (value) => {
  if (value) showRemove.value = true
})

watch(() => plugins.value.paths[path.value], (value) => {
  current.value = value
  config.value = clone(value.config)
}, { immediate: true })

const ctx = useContext()

ctx.define('config.current', current)

ctx.action('config.remove', {
  disabled: () => !current.value.path,
  action: () => remove.value = current.value,
})

ctx.action('config.add-plugin', {
  disabled: () => current.value.path && !current.value.children,
  action: () => select.value = current.value,
})

ctx.action('config.add-group', {
  disabled: () => current.value.path && !current.value.children,
  action: () => addItem(current.value.path, 'group', 'group'),
})

ctx.action('config.tree.remove', {
  disabled: ({ config }) => !config.tree.path,
  action: ({ config }) => remove.value = config.tree,
})

ctx.action('config.tree.add-plugin', {
  disabled: ({ config }) => config.tree.path && !config.tree.children,
  action: ({ config }) => select.value = config.tree,
})

ctx.action('config.tree.add-group', {
  disabled: ({ config }) => config.tree.path && !config.tree.children,
  action: ({ config }) => addItem(config.tree.path, 'group', 'group'),
})

ctx.action('config.save', {
  disabled: () => !name.value && current.value.label !== 'group' && !!current.value.path,
  action: async () => {
    const { disabled, path } = current.value
    if (!path) return send('manager/app-reload', config.value)
    try {
      await execute(disabled ? 'unload' : 'reload')
      message.success(disabled ? '配置已保存。' : '配置已重载。')
    } catch (error) {
      message.error('操作失败，请检查日志！')
    }
  },
})

ctx.action('config.toggle', {
  disabled: () => !name.value && current.value.label !== 'group' || hasCoreDeps(current.value),
  action: async () => {
    const { disabled, label } = current.value
    try {
      await execute(disabled ? 'reload' : 'unload')
      message.success((label === 'group' ? '分组' : '插件') + (disabled ? '已启用。' : '已停用。'))
    } catch (error) {
      message.error('操作失败，请检查日志！')
    }
  },
})

async function execute(event: 'unload' | 'reload') {
  await send(`manager/${event}`, current.value.path, config.value, current.value.target)
  if (current.value.target) {
    const segments = splitPath(current.value.path)
    segments[segments.length - 1] = current.value.target
    router.replace('/plugins/' + segments.join('/'))
  }
}

</script>

<style lang="scss">

.end {
  margin-right: 0.5rem;
}

.config-header {
  font-size: 1.375rem;
  margin: 0 0 2rem;
  line-height: 2rem;

  .k-button {
    float: right;
  }
}

.plugin-view .k-content > *:first-child {
  margin-top: 0;
}

</style>
