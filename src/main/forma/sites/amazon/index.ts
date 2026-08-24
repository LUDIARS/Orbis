import style from './style.css?raw'
import type { Forma } from '../../registry.js'

const isAmazonHost = (host: string): boolean => /(^|\.)amazon\.(co\.jp|com)$/i.test(host)

/** @implements SPEC-ORBIS-P2-FORMA */
export const amazonForma: Forma = { id: 'amazon', match: (url) => isAmazonHost(url.hostname), css: style, habitus: ['shopping'] }
