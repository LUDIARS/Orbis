import { curaNew } from './cura-new.js'
import { fenestraAlwaysOnTopToggle } from './fenestra-always-on-top-toggle.js'
import { fenestraMinimizeOthers } from './fenestra-minimize-others.js'
import { fenestraMinimize } from './fenestra-minimize.js'
import { fenestraMaximizeToggle } from './fenestra-maximize-toggle.js'
import { fenestraOpacityCycle } from './fenestra-opacity-cycle.js'
import { pageBack } from './page-back.js'
import { pageClose } from './page-close.js'
import { pageForward } from './page-forward.js'
import { pageNew } from './page-new.js'
import { pageReload } from './page-reload.js'
import { indagatioOpen } from './indagatio-open.js'
import { nexusLayoutToggle } from './nexus-layout-toggle.js'
import { habitusSetDesktop } from './habitus-set-desktop.js'
import { habitusSetMobile } from './habitus-set-mobile.js'
import { habitusSetShopping } from './habitus-set-shopping.js'
import { comparatioToggle } from './comparatio-toggle.js'
import { habitusCycle } from './habitus-cycle.js'
import { rotaOpen } from './rota-open.js'
import type { Action, ActionContext, ActionId } from './types.js'

const actions: Record<ActionId, Action> = {
  'page.back': pageBack,
  'page.forward': pageForward,
  'page.reload': pageReload,
  'page.new': pageNew,
  'page.close': pageClose,
  'cura.new': curaNew,
  'fenestra.alwaysOnTop.toggle': fenestraAlwaysOnTopToggle,
  'fenestra.minimizeOthers': fenestraMinimizeOthers,
  'fenestra.minimize': fenestraMinimize,
  'fenestra.maximize.toggle': fenestraMaximizeToggle,
  'fenestra.opacity.cycle': fenestraOpacityCycle,
  'indagatio.open': indagatioOpen,
  'nexus.layout.toggle': nexusLayoutToggle,
  'habitus.set:desktop': habitusSetDesktop,
  'habitus.set:mobile': habitusSetMobile,
  'habitus.set:shopping': habitusSetShopping,
  'comparatio.toggle': comparatioToggle,
  'habitus.cycle': habitusCycle,
  'rota.open': rotaOpen
}

/** @implements SPEC-ORBIS-P0-ACTIONS */
export const executeAction = (id: ActionId, context: ActionContext): void | Promise<void> => actions[id](context)
export const isActionId = (value: string): value is ActionId => Object.hasOwn(actions, value)
export const actionIds = Object.freeze(Object.keys(actions) as ActionId[])
