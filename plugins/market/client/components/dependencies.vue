<template>
  <k-layout main="page-deps" :menu="menu">
    <table class="table-head">
      <colgroup>
        <col width="auto">
        <col width="15%">
        <col width="30%">
        <col width="15%">
      </colgroup>
      <thead>
        <tr>
          <th>依赖名称</th>
          <th>本地版本</th>
          <th>目标版本</th>
          <th>操作</th>
        </tr>
      </thead>
    </table>
    <el-scrollbar class="body-container">
      <table class="table-body">
        <colgroup>
          <col width="auto">
          <col width="15%">
          <col width="30%">
          <col width="15%">
        </colgroup>
        <tbody>
          <package-view v-for="name in names" :key="name" :name="name"></package-view>
        </tbody>
      </table>
    </el-scrollbar>
  </k-layout>
</template>

<script lang="ts" setup>

import { computed } from 'vue'
import { store } from '@koishijs/client'
import { config, refresh, hasUpdate } from '../utils'
import { install } from './utils'
import PackageView from './package.vue'

const names = computed(() => {
  return Object
    .keys(store.dependencies)
    .filter(name => !store.dependencies[name].workspace)
    .sort((a, b) => a > b ? 1 : -1)
})

const updates = computed(() => names.value.filter(hasUpdate))

const menu = computed(() => [{
  icon: 'rocket',
  label: '全部更新',
  disabled: !updates.value.length,
  async action() {
    for (const name of updates.value) {
      const versions = store.registry[name]
      config.value.override[name] = Object.keys(versions)[0]
    }
  },
}, {
  icon: 'check',
  label: '应用更改',
  disabled: !Object.keys(config.value.override).length,
  async action() {
    return install(config.value.override)
  },
}, refresh.value])

</script>

<style lang="scss">

.page-deps {
  display: flex;
  flex-flow: column;

  .body-container {
    transform: translateY(1px);
    margin-top: -1px;
  }

  table {
    tr:first-child {
      border-top: none;
    }
  }

  tbody {
    tr {
      transition: 0.3s ease;
    }

    tr:hover {
      background-color: var(--k-hover-bg);
    }
  }

  @media (max-width: 768px) {
    td {
      padding: 0.5em 0.5em;
    }
  }
}

</style>
