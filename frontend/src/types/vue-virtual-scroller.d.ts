declare module 'vue-virtual-scroller' {
  import { DefineComponent } from 'vue'

  export const RecycleScroller: DefineComponent<{
    items: any[]
    itemSize?: number | string
    keyField?: string
    direction?: 'vertical' | 'horizontal'
    listTag?: string
    itemTag?: string
    listClass?: string | object | any[]
    itemClass?: string | object | any[]
    gridItems?: number
    skipHover?: boolean
    buffer?: number
    pageMode?: boolean
    prerender?: number
    emitUpdate?: boolean
  }>

  export const DynamicScroller: DefineComponent<{
    items: any[]
    minItemSize?: number | string
    direction?: 'vertical' | 'horizontal'
    keyField?: string
    listTag?: string
    itemTag?: string
    listClass?: string | object | any[]
    itemClass?: string | object | any[]
    buffer?: number
    pageMode?: boolean
    prerender?: number
    emitUpdate?: boolean
  }>

  export const DynamicScrollerItem: DefineComponent<{
    item: any
    active?: boolean
    sizeDependencies?: any[]
    watchData?: boolean
    tag?: string
    emitResize?: boolean
    onResize?: () => void
  }>
}