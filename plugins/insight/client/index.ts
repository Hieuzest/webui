import { Context } from '@koishijs/client'
import {} from '@koishijs/plugin-insight'
import Graph from './index.vue'
import './icons'

export default (ctx: Context) => {
  ctx.page({
    path: '/graph',
    name: '依赖图',
    icon: 'activity:network',
    order: 600,
    fields: ['insight'],
    component: Graph,
  })
}
