import { Context } from '@koishijs/client'
import { defineComponent, h, resolveComponent } from 'vue'
import type {} from '@koishijs/plugin-config'
import { type } from './components/utils'
import Settings from './components/index.vue'
import Select from './components/select.vue'
import './icons'

export * from './components/utils'

export default (ctx: Context) => {
  ctx.slot({
    type: 'global',
    component: defineComponent(() => () => {
      return h(resolveComponent('k-slot'), { name: 'plugin-select', single: true })
    }),
  })

  ctx.slot({
    type: 'plugin-select-base',
    component: Select,
    order: -1000,
  })

  ctx.slot({
    type: 'plugin-select',
    component: Select,
    order: -1000,
  })

  ctx.page({
    path: '/plugins/:name*',
    name: '插件配置',
    icon: 'activity:plugin',
    order: 800,
    authority: 4,
    fields: ['config', 'packages', 'services'],
    component: Settings,
  })

  ctx.menu('config', [{
    id: 'config.toggle',
    type: ({ config }) => config.current?.disabled ? '' : type.value,
    icon: ({ config }) => config.current?.disabled ? 'play' : 'stop',
    label: ({ config }) => config.current?.disabled ? '启用插件' : '停用插件',
  }, {
    id: 'config.save',
    icon: ({ config }) => config.current?.disabled ? 'save' : 'check',
    label: ({ config }) => config.current?.disabled ? '保存配置' : '重载配置',
  }, {
    id: 'config.remove',
    type: 'danger',
    icon: 'trash-can',
    label: ({ config }) => config.current?.children ? '移除分组' : '移除插件',
  }, {
    id: 'config.add-plugin',
    icon: 'add-plugin',
    label: '添加插件',
  }, {
    id: 'config.add-group',
    icon: 'add-group',
    label: '添加分组',
  }])

  ctx.menu('config.tree', [{
    id: '.add-plugin',
    label: '添加插件',
  }, {
    id: '.add-group',
    label: '添加分组',
  }, {
    id: '@separator',
  }, {
    id: '.remove',
    type: 'danger',
    label: ({ config }) => config.tree?.children ? '移除分组' : '移除插件',
  }])
}
