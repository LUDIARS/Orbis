/** @implements SPEC-ORBIS-P2-HABITUS */
export type HabitusId = 'desktop' | 'mobile' | 'shopping'

export interface HabitusPreset {
  id: HabitusId
  userAgent: string | null
  width: number | null
  height: number | null
  deviceScaleFactor: number | null
  partition: string
  touch: boolean
}
