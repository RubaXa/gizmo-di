import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Gizmo } from './gizmo'

describe('gizmo onCreated and onDeleted hooks', () => {
	let gizmo: Gizmo

	beforeEach(() => {
		gizmo = new Gizmo()
	})

	it('should call onCreated for singleton scope', () => {
		const onCreated = vi.fn()
		const token = Gizmo.token('singletonToken', () => 'singletonValue')

		gizmo.set(token, () => 'singletonValue', { mode: 'singleton', onCreated })

		const value = gizmo.resolve(token)
		expect(value).toBe('singletonValue')
		expect(onCreated).toHaveBeenCalledWith('singletonValue')
	})

	it('should call onDeleted for singleton scope', () => {
		const onDeleted = vi.fn()
		const token = Gizmo.token('singletonToken', () => 'singletonValue')

		gizmo.set(token, () => 'singletonValue', { mode: 'singleton', onDeleted })

		gizmo.resolve(token)
		gizmo.delete(token)

		expect(onDeleted).toHaveBeenCalledWith('singletonValue')
	})

	it('should call onCreated for scoped scope', () => {
		const onCreated = vi.fn()
		const token = Gizmo.token('scopedToken', () => 'scopedValue')

		gizmo.set(token, () => 'scopedValue', { mode: 'scoped', onCreated })

		const value = gizmo.resolve(token)
		expect(value).toBe('scopedValue')
		expect(onCreated).toHaveBeenCalledWith('scopedValue')
	})

	it('should call onDeleted for scoped scope', () => {
		const onDeleted = vi.fn()
		const token = Gizmo.token('scopedToken', () => 'scopedValue')

		gizmo.set(token, () => 'scopedValue', { mode: 'scoped', onDeleted })

		gizmo.resolve(token)
		gizmo.delete(token)

		expect(onDeleted).toHaveBeenCalledWith('scopedValue')
	})

	it('should call onCreated for transient scope', () => {
		const onCreated = vi.fn()
		const token = Gizmo.token('transientToken', () => 'transientValue')

		gizmo.set(token, () => 'transientValue', { mode: 'transient', onCreated })

		const value = gizmo.resolve(token)
		expect(value).toBe('transientValue')
		expect(onCreated).toHaveBeenCalledWith('transientValue')
	})

	it('should not call onDeleted for transient scope', () => {
		const onDeleted = vi.fn()
		const token = Gizmo.token('transientToken', () => 'transientValue')

		gizmo.set(token, () => 'transientValue', { mode: 'transient', onDeleted })

		gizmo.resolve(token)
		gizmo.delete(token)

		expect(onDeleted).not.toHaveBeenCalled()
	})

	it('should call onCreated for singleton scope in sub-container', () => {
		const onCreated = vi.fn()
		const token = Gizmo.token('singletonToken', () => 'singletonValue')

		gizmo.set(token, () => 'singletonValue', { mode: 'singleton', onCreated })

		const subGizmo = gizmo.sub()
		const value = subGizmo.resolve(token)
		expect(value).toBe('singletonValue')
		expect(onCreated).toHaveBeenCalledWith('singletonValue')
	})

	it('should call onDeleted for singleton scope in sub-container', () => {
		const onDeleted = vi.fn()
		const token = Gizmo.token('singletonToken', () => 'singletonValue')

		gizmo.set(token, () => 'singletonValue', { mode: 'singleton', onDeleted })

		const subGizmo = gizmo.sub()
		subGizmo.resolve(token)
		gizmo.delete(token)

		expect(onDeleted).toHaveBeenCalledWith('singletonValue')
	})

	it('should call onCreated for scoped scope in sub-container', () => {
		const onCreated = vi.fn()
		const token = Gizmo.token('scopedToken', () => 'scopedValue')

		gizmo.set(token, () => 'scopedValue', { mode: 'scoped', onCreated })

		const subGizmo = gizmo.sub()
		const value = subGizmo.resolve(token)
		expect(value).toBe('scopedValue')
		expect(onCreated).toHaveBeenCalledWith('scopedValue')
	})

	it('should call onDeleted for scoped scope in sub-container', () => {
		const onDeleted = vi.fn()
		const token = Gizmo.token('scopedToken', () => 'scopedValue')

		gizmo.set(token, () => 'scopedValue', { mode: 'scoped', onDeleted })

		const subGizmo = gizmo.sub()
		subGizmo.resolve(token)
		subGizmo.delete(token)

		expect(onDeleted).toHaveBeenCalledWith('scopedValue')
	})
})
