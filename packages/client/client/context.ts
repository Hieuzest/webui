import * as cordis from 'cordis'
import { Schema, SchemaBase } from '@koishijs/components'
import { Dict, Intersect, remove } from 'cosmokit'
import {
  App, Component, createApp, defineComponent, h, inject, markRaw, MaybeRefOrGetter,
  onBeforeUnmount, provide, reactive, resolveComponent, shallowReactive, toValue,
} from 'vue'
import { activities, Activity } from './activity'
import { SlotOptions } from './components'
import { useColorMode, useConfig } from './config'
import { extensions, LoadResult } from './loader'
import { ActionContext } from '.'

export type Plugin = cordis.Plugin<Context>

export namespace Plugin {
  export type Function<T = any> = cordis.Plugin.Function<T, Context>
  export type Constructor<T = any> = cordis.Plugin.Constructor<T, Context>
  export type Object<S = any, T = any> = cordis.Plugin.Object<S, T, Context>
}

export type EffectScope = cordis.EffectScope<Context>
export type ForkScope = cordis.ForkScope<Context>
export type MainScope = cordis.MainScope<Context>
export type Service = cordis.Service<Context>

export const Service = cordis.Service<Context>

const config = useConfig()
const mode = useColorMode()

// layout api

export interface ThemeOptions {
  id: string
  name: string | Dict<string>
  components?: Dict<Component>
}

export type MaybeGetter<T> = T | ((scope: Flatten<ActionContext>) => T)

export interface Events<C extends Context> extends cordis.Events<C> {
  'activity'(activity: Activity): boolean
}

export interface Context {
  [Context.events]: Events<this>
}

export function useContext() {
  const parent = inject('cordis') as Context
  const fork = parent.plugin(() => {})
  onBeforeUnmount(() => fork.dispose())
  return fork.ctx
}

export interface ActionOptions {
  disabled?: (scope: Flatten<ActionContext>) => boolean
  action: (scope: Flatten<ActionContext>) => any
}

export type LegacyMenuItem = Partial<ActionOptions> & Omit<MenuItem, 'id'>

export interface MenuItem {
  id: string
  label?: MaybeGetter<string>
  type?: MaybeGetter<string>
  icon?: MaybeGetter<string>
  order?: number
}

interface SettingOptions extends Ordered {
  id: string
  title?: string
  disabled?: () => boolean
  schema?: Schema
  component?: Component
}

interface Ordered {
  order?: number
}

function insert<T extends Ordered>(list: T[], item: T) {
  markRaw(item)
  const index = list.findIndex(a => a.order < item.order)
  if (index >= 0) {
    list.splice(index, 0, item)
  } else {
    list.push(item)
  }
}

type Store<S extends {}> = { [K in keyof S]?: MaybeRefOrGetter<S[K]> }

type Flatten<S extends {}> = Intersect<{
  [K in keyof S]: K extends `${infer L}.${infer R}`
    ? { [P in L]: Flatten<{ [P in R]: S[K] }> }
    : { [P in K]: S[K] }
}[keyof S]>

class Internal {
  extensions = extensions
  activities = activities
  routeCache = routeCache
  scope = shallowReactive<Store<ActionContext>>({})
  menus = reactive<Dict<MenuItem[]>>({})
  actions = reactive<Dict<ActionOptions>>({})
  views = reactive<Dict<SlotOptions[]>>({})
  themes = reactive<Dict<ThemeOptions>>({})
  settings = reactive<Dict<SettingOptions[]>>({})
  activeMenus = reactive<{ id: string; styles: Partial<CSSStyleDeclaration> }[]>([])

  createScope(prefix = '') {
    return new Proxy({}, {
      get: (target, key) => {
        if (typeof key === 'symbol') return target[key]
        key = prefix + key
        if (key in this.scope) return toValue(this.scope[key])
        const _prefix = key + '.'
        if (Object.keys(this.scope).some(k => k.startsWith(_prefix))) {
          return this.createScope(key + '.')
        }
      },
    })
  }
}

export function useMenu<K extends keyof ActionContext>(id: K) {
  const ctx = useContext()
  return (event: MouseEvent, value: MaybeRefOrGetter<ActionContext[K]>) => {
    ctx.define(id, value)
    event.preventDefault()
    const { clientX, clientY } = event
    ctx.internal.activeMenus.splice(0, Infinity, { id, styles: { left: clientX + 'px', top: clientY + 'px' } })
  }
}

export const routeCache = reactive<Record<keyof any, string>>({})

export class Context extends cordis.Context {
  app: App
  extension: LoadResult
  internal = new Internal()

  constructor() {
    super()
    this.app = createApp(defineComponent({
      setup() {
        return () => [
          h(resolveComponent('k-slot'), { name: 'root', single: true }),
          h(resolveComponent('k-slot'), { name: 'global' }),
        ]
      },
    }))
    this.app.provide('cordis', this)
  }

  wrapComponent(component: Component) {
    if (!component) return
    const caller = this[Context.current] || this
    return defineComponent((props, { slots }) => {
      provide('cordis', caller)
      return () => h(component, props, slots)
    })
  }

  /** @deprecated */
  addView(options: SlotOptions) {
    return this.slot(options)
  }

  /** @deprecated */
  addPage(options: Activity.Options) {
    return this.page(options)
  }

  slot(options: SlotOptions) {
    options.order ??= 0
    options.component = this.wrapComponent(options.component)
    if (options.when) options.disabled = () => !options.when()
    const list = this.internal.views[options.type] ||= []
    insert(list, options)
    return this.scope.collect('view', () => remove(list, options))
  }

  page(options: Activity.Options) {
    options.component = this.wrapComponent(options.component)
    const activity = new Activity(this, options)
    return this.scope.collect('page', () => activity.dispose())
  }

  schema(extension: SchemaBase.Extension) {
    SchemaBase.extensions.add(extension)
    extension.component = this.wrapComponent(extension.component)
    return this.scope.collect('schema', () => SchemaBase.extensions.delete(extension))
  }

  action(id: string, options: ActionOptions) {
    markRaw(options)
    this.internal.actions[id] = options
    return this.scope.collect('actions', () => delete this.internal.actions[id])
  }

  menu(id: string, items: MenuItem[]) {
    const list = this.internal.menus[id] ||= []
    items.forEach(item => insert(list, item))
    return this.scope.collect('menus', () => {
      items.forEach(item => remove(list, item))
      return true
    })
  }

  define<K extends keyof ActionContext>(key: K, value: MaybeRefOrGetter<ActionContext[K]>) {
    this.internal.scope[key] = value as any
    return this.scope.collect('activate', () => delete this.internal.scope[key])
  }

  settings(options: SettingOptions) {
    markRaw(options)
    options.order ??= 0
    options.component = this.wrapComponent(options.component)
    const list = this.internal.settings[options.id] ||= []
    insert(list, options)
    if (options.schema) {
      try {
        options.schema(config.value, { autofix: true })
      } catch (error) {
        console.error(error)
      }
    }
    return this.scope.collect('settings', () => remove(list, options))
  }

  theme(options: ThemeOptions) {
    markRaw(options)
    this.internal.themes[options.id] = options
    for (const [type, component] of Object.entries(options.components || {})) {
      this.slot({
        type,
        disabled: () => config.value.theme[mode.value] !== options.id,
        component,
      })
    }
    return this.scope.collect('view', () => delete this.internal.themes[options.id])
  }
}

markRaw(cordis.Context.prototype)
markRaw(cordis.EffectScope.prototype)
