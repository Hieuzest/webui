import { Context, icons } from '@koishijs/client'
import {} from '@koishijs/plugin-admin'
import Activity from './icons/activity.vue'
import Plus from './icons/plus.vue'
import TrashCan from './icons/trash-can.vue'
import UserGroup from './group.vue'

icons.register('plus', Plus)
icons.register('trash-can', TrashCan)
icons.register('activity:group', Activity)

export default (ctx: Context) => {
  ctx.page({
    path: '/admin/:path*',
    name: '权限管理',
    icon: 'activity:group',
    order: 500,
    authority: 4,
    fields: ['admin'],
    component: UserGroup,
  })
}
