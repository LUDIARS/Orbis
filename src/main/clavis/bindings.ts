import type { ActionId } from '../actions/types.js'
export interface Binding { accelerator: string; actionId: ActionId; global: boolean }
export const defaultBindings: Binding[] = [
  { accelerator: 'CommandOrControl+Shift+T', actionId: 'fenestra.alwaysOnTop.toggle', global: true },
  { accelerator: 'CommandOrControl+Shift+M', actionId: 'fenestra.minimizeOthers', global: true },
  { accelerator: 'CommandOrControl+Shift+O', actionId: 'fenestra.opacity.cycle', global: true },
  { accelerator: 'CommandOrControl+Shift+N', actionId: 'cura.new', global: false }
]
export const bindingForAccelerator = (accelerator: string): Binding | undefined => defaultBindings.find((binding) => binding.accelerator === accelerator)
