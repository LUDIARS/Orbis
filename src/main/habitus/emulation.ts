import type { WebContents } from 'electron'
import type { HabitusPreset } from './types.js'

/** @implements SPEC-ORBIS-P2-HABITUS */
export async function applyEmulation(webContents: WebContents, preset: HabitusPreset): Promise<void> {
  if (!webContents.debugger.isAttached()) webContents.debugger.attach('1.3')
  if (preset.width && preset.height && preset.deviceScaleFactor) {
    await webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
      width: preset.width, height: preset.height, deviceScaleFactor: preset.deviceScaleFactor,
      mobile: true
    })
  } else {
    await webContents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride')
  }
  await webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: preset.touch })
}

/** @implements SPEC-ORBIS-P2-HABITUS */
export async function clearEmulation(webContents: WebContents): Promise<void> {
  if (!webContents.debugger.isAttached()) return
  await webContents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride')
  await webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false })
}
