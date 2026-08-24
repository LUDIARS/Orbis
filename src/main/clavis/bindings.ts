import type { ActionId } from '../actions/types.js'
/** @implements SPEC-ORBIS-P3-CLAVIS */
export interface Binding { accelerator: string; actionId: ActionId; global: boolean }
export const defaultBindings: Binding[] = [
  { accelerator: 'CommandOrControl+Shift+Space', actionId: 'rota.open', global: true },
  { accelerator: 'CommandOrControl+Shift+T', actionId: 'fenestra.alwaysOnTop.toggle', global: true },
  { accelerator: 'CommandOrControl+Shift+M', actionId: 'fenestra.minimizeOthers', global: true },
  { accelerator: 'CommandOrControl+Shift+O', actionId: 'fenestra.opacity.cycle', global: true },
  { accelerator: 'CommandOrControl+Shift+N', actionId: 'cura.new', global: false },
  { accelerator: 'CommandOrControl+Shift+F', actionId: 'indagatio.open', global: false },
  { accelerator: 'CommandOrControl+Shift+H', actionId: 'habitus.cycle', global: false }
]

const modifierOrder = ['CommandOrControl', 'Shift', 'Alt'] as const
const modifierAliases: Record<string, typeof modifierOrder[number]> = {
  commandorcontrol: 'CommandOrControl',
  ctrl: 'CommandOrControl',
  control: 'CommandOrControl',
  cmd: 'CommandOrControl',
  command: 'CommandOrControl',
  meta: 'CommandOrControl',
  shift: 'Shift',
  alt: 'Alt',
  option: 'Alt'
}

/** @implements SPEC-ORBIS-P3-CLAVIS */
export const normalizeAccelerator = (accelerator: string): string => {
  const modifiers = new Set<typeof modifierOrder[number]>()
  const keys: string[] = []
  for (const value of accelerator.split('+').map((part) => part.trim()).filter(Boolean)) {
    const modifier = modifierAliases[value.toLowerCase()]
    if (modifier) modifiers.add(modifier)
    else keys.push(value.toLowerCase() === 'spacebar' ? 'Space' : value.length === 1 ? value.toUpperCase() : value)
  }
  return [...modifierOrder.filter((modifier) => modifiers.has(modifier)), ...keys].join('+')
}

/** @implements SPEC-ORBIS-P3-CLAVIS */
export const isValidAccelerator = (accelerator: string): boolean => {
  const parts = normalizeAccelerator(accelerator).split('+')
  const keys = parts.filter((part) => !modifierOrder.includes(part as typeof modifierOrder[number]))
  return keys.length === 1 && keys[0].length > 0 && !['Control', 'Meta', 'Shift', 'Alt'].includes(keys[0])
}

/** @implements SPEC-ORBIS-P0-CLAVIS */
export const bindingForAccelerator = (accelerator: string): Binding | undefined => defaultBindings.find((binding) => binding.accelerator === normalizeAccelerator(accelerator))
