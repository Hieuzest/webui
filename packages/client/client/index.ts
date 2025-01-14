import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { global } from './data'
import install, { Dict } from './components'
import Overlay from './components/chat/overlay.vue'
import { config } from './config'
import { initTask } from './loader'
import { Context, routeCache } from './context'
import { createI18n } from 'vue-i18n'
import { watchEffect } from 'vue'

declare module '@koishijs/plugin-console' {
  export interface ClientConfig {
    messages?: Dict<string>
    unsupported?: string[]
  }
}

export * from './activity'
export * from './components'
export * from './config'
export * from './context'
export * from './loader'
export * from './data'
export * from './utils'

export default install

export interface ActionContext {}

export interface Config {
  theme: Config.Theme
  locale?: string
}

export namespace Config {
  export interface Theme {
    mode: 'auto' | 'dark' | 'light'
    dark: string
    light: string
  }
}

export const root = new Context()

export const router = createRouter({
  history: createWebHistory(global.uiPath),
  linkActiveClass: 'active',
  routes: [],
})

router.afterEach((route) => {
  const { name, fullPath } = router.currentRoute.value
  routeCache[name] = fullPath
  if (route.meta.activity) {
    document.title = `${route.meta.activity.name} | ${global.messages?.title || 'Koishi 控制台'}`
  }
})

export const i18n = createI18n({
  legacy: false,
  fallbackLocale: 'zh-CN',
})

watchEffect(() => {
  i18n.global.locale.value = config.value.locale
})

root.app.use(install)
root.app.use(i18n)
root.app.use(router)

root.slot({
  type: 'global',
  component: Overlay,
})

root.on('activity', data => !data)

router.beforeEach(async (to, from) => {
  if (to.matched.length) return

  if (from === START_LOCATION) {
    await initTask
    to = router.resolve(to)
    if (to.matched.length) return to
  }

  return {
    path: '/',
    query: { redirect: to.fullPath },
  }
})
