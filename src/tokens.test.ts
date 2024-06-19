import { expect, it } from 'vitest'
import { globalGizmo } from './gizmo'
import { BROWSER_STORAGES_TOKEN, GLOBAL_TIME_TOKEN, LOGGER_TOKEN } from './tokens'

it('lOGGER_TOKEN', () => {
	expect(globalGizmo.resolve(LOGGER_TOKEN).info).toBe(console.info)
})

it('gLOBAL_TIME_TOKEN', () => {
	expect(globalGizmo.resolve(GLOBAL_TIME_TOKEN).now).toBeTypeOf('function')
})

it('bROWSER_STORAGES_TOKEN', () => {
	globalThis.localStorage = {} as Storage
	globalThis.sessionStorage = {} as Storage

	expect(globalGizmo.resolve(BROWSER_STORAGES_TOKEN)).toEqual({
		local: globalThis.localStorage,
		session: globalThis.sessionStorage,
		runtime: globalThis.sessionStorage,
	})
})
