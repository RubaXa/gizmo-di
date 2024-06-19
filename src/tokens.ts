import { Gizmo } from './gizmo'

/** Type representing the base logger */
export type GizmoBaseLogger = Record<
	'debug' | 'info' | 'warn' | 'error' | 'fatal',
	(message: string, data?: Record<string, unknown>) => void
>

/** Base Gizmo-token for Logger */
export const LOGGER_TOKEN = Gizmo.token<GizmoBaseLogger>('Logger', () => ({
	...console,
	fatal: console.error,
}))

/** Global time */
export const GLOBAL_TIME_TOKEN = Gizmo.token<{ now: () => number }>('GlobalTime', () => Date)

/** Basic browser storages */
export const BROWSER_STORAGES_TOKEN = Gizmo.token<Record<'local' | 'session' | 'runtime', Storage>>(
	'BrowserStorages',
	() => ({
		local: localStorage,
		session: sessionStorage,
		runtime: sessionStorage,
	}),
)
