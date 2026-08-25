import type { Forma } from '../../registry.js'

const isGoogle = (host: string): boolean => /(^|\.)google\.(?:com|[a-z]{2,3}|(?:co|com)\.[a-z]{2})$/i.test(host)

/** @implements SPEC-ORBIS-P6-EXPLORATIO Default search engine Forma. */
export const googleForma: Forma = { id: 'google', match: (url) => isGoogle(url.hostname) }
