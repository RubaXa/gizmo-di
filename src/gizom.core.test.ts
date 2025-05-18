import { beforeEach, describe, expect, it, vitest } from 'vitest'

import { Gizmo, type GizmoToken, globalGizmo } from './gizmo'

let TEST_TOKEN: GizmoToken<(val: string) => number>
let gizmoTest: Gizmo

beforeEach(() => {
	TEST_TOKEN = Gizmo.token('TestToken')
	gizmoTest = globalGizmo.sub()
})

describe('token', () => {
	it('methods', () => {
		expect(Object.keys(TEST_TOKEN)).toEqual(['toString', 'map', 'inject'])
	})

	it('default', () => {
		const di = new Gizmo()
		const DEFAULT_TOKEN = Gizmo.token('Def', () => Math.random() + 1000)

		expect(di.get(DEFAULT_TOKEN)).toBeGreaterThanOrEqual(1000)
		expect(di.get(DEFAULT_TOKEN)).toBe(di.get(DEFAULT_TOKEN))

		di.set(DEFAULT_TOKEN, () => -1)
		expect(di.get(DEFAULT_TOKEN)).toBe(-1)
	})
})

describe('container', () => {
	describe('lazy', () => {
		describe('promise as factory', () => {
			it('promise', async () => {
				const TOKEN = Gizmo.tokenLazy<{ value: string }>('LAZY_PROMISE_TOKEN')
				const factory = Gizmo.lazy(Promise.resolve({ value: 'lazy-promise' }))

				gizmoTest.set(TOKEN, factory)

				expect(gizmoTest.get(TOKEN)?.value).toBeInstanceOf(Promise)
				expect(await gizmoTest.get(TOKEN)?.value).toBe('lazy-promise')
			})

			it('promise with default', async () => {
				const TOKEN = Gizmo.token('LAZY_PROMISE_WITH_DEFAULT_TOKEN')
				gizmoTest.set(TOKEN, Gizmo.lazy(Promise.resolve({ default: 'lazy-promise-with-default' })))
				expect(await gizmoTest.get(TOKEN)).toBe('lazy-promise-with-default')
			})
		})

		describe('factory', () => {
			it('promise', async () => {
				const TOKEN = Gizmo.token('LAZY_FACTORY_PROMISE_TOKEN')
				gizmoTest.set(TOKEN, Gizmo.lazy(() => Promise.resolve('lazy-factory-promise')))
				expect(await gizmoTest.get(TOKEN)).toBe('lazy-factory-promise')
			})

			it('promise with default', async () => {
				const TOKEN = Gizmo.token('LAZY_FACTORY_PROMISE_WITH_DEFAULT_TOKEN')
				gizmoTest.set(TOKEN, Gizmo.lazy(() => Promise.resolve({ default: 'lazy-factory-promise-with-default' })))
				expect(await gizmoTest.get(TOKEN)).toBe('lazy-factory-promise-with-default')
			})
		})
	})

	it('delete', () => {
		expect(gizmoTest.has(TEST_TOKEN)).toBeFalsy()

		gizmoTest.set(TEST_TOKEN, () => () => 1)
		expect(gizmoTest.has(TEST_TOKEN)).toBeTruthy()

		gizmoTest.delete(TEST_TOKEN)
		expect(gizmoTest.has(TEST_TOKEN)).toBeFalsy()
	})

	it('clear', () => {
		expect(gizmoTest.has(TEST_TOKEN)).toBeFalsy()

		gizmoTest.set(TEST_TOKEN, () => () => 1)
		expect(gizmoTest.has(TEST_TOKEN)).toBeTruthy()

		gizmoTest.clear()
		expect(gizmoTest.has(TEST_TOKEN)).toBeFalsy()
	})

	describe('get + set', () => {
		it('undefined', () => {
			expect(globalGizmo.get(TEST_TOKEN)).toBeUndefined()
		})

		it('exists', () => {
			globalGizmo.set(TEST_TOKEN, () => (val) => +val)
			expect(globalGizmo.get(TEST_TOKEN)?.('123')).toBe(123)
		})
	})

	describe('resolve + set', () => {
		it('undefined', () => {
			expect(() => globalGizmo.resolve(TEST_TOKEN)).toThrowError(
				'[gizmo] Resolve "TestToken" token failed',
			)
		})

		it('exists', () => {
			globalGizmo.set(TEST_TOKEN, () => (val) => +val)
			expect(globalGizmo.resolve(TEST_TOKEN)('123')).toBe(123)
		})
	})

	describe('mode', () => {
		describe('singleton', () => {
			it('root (singleton) -> sub', () => {
				const root = new Gizmo()
				const sub = root.sub()
				const RANDOM_TOKEN = Gizmo.token<number>()
				const onCreated = vitest.fn()

				root.set(RANDOM_TOKEN, () => Math.random(), {
					onCreated,
				})

				expect(root.has(RANDOM_TOKEN)).toBeTruthy()
				expect(sub.has(RANDOM_TOKEN)).toBeTruthy()

				expect(sub.resolve(RANDOM_TOKEN)).toBeGreaterThanOrEqual(0)
				expect(root.resolve(RANDOM_TOKEN)).toBe(sub.resolve(RANDOM_TOKEN))

				expect(onCreated).toHaveBeenCalledTimes(1)
				expect(onCreated).toHaveBeenCalledWith(sub.get(RANDOM_TOKEN))
			})

			it('root -> sub (singleton)', () => {
				const root = new Gizmo()
				const sub = root.sub()
				const RANDOM_TOKEN = Gizmo.token<number>()

				sub.set(RANDOM_TOKEN, () => Math.random())

				expect(sub.resolve(RANDOM_TOKEN)).toBeGreaterThanOrEqual(0)
				expect(sub.resolve(RANDOM_TOKEN)).toBe(sub.resolve(RANDOM_TOKEN))
			})

			it('root (singleton) -> sub (singleton)', () => {
				const root = new Gizmo()
				const sub = root.sub()
				const RANDOM_TOKEN = Gizmo.token<number>()

				root.set(RANDOM_TOKEN, () => Math.random() + 1000)
				sub.set(RANDOM_TOKEN, () => Math.random())

				expect(sub.resolve(RANDOM_TOKEN)).toBeGreaterThanOrEqual(1000)
				expect(root.resolve(RANDOM_TOKEN)).toBe(sub.resolve(RANDOM_TOKEN))
			})

			it('root (scoped) -> sub', () => {
				const root = new Gizmo()
				const sub = root.sub()
				const RANDOM_TOKEN = Gizmo.token<number>('RAND')
				const onCreated = vitest.fn()

				root.set(RANDOM_TOKEN, () => Math.random(), { mode: 'scoped', onCreated })

				expect(sub.resolve(RANDOM_TOKEN)).toBe(sub.resolve(RANDOM_TOKEN))
				expect(root.resolve(RANDOM_TOKEN)).toBe(root.resolve(RANDOM_TOKEN))
				expect(root.resolve(RANDOM_TOKEN)).not.toBe(sub.resolve(RANDOM_TOKEN))

				expect(onCreated).toHaveBeenCalledTimes(2)
				expect(onCreated).toHaveBeenNthCalledWith(1, sub.get(RANDOM_TOKEN))
				expect(onCreated).toHaveBeenNthCalledWith(2, root.get(RANDOM_TOKEN))
			})

			it('root (singleton) -> sub (scoped)', () => {
				const root = new Gizmo()
				const sub = root.sub()
				const RANDOM_TOKEN = Gizmo.token<number>()

				root.set(RANDOM_TOKEN, () => Math.random() + 1000, { mode: 'singleton' })
				sub.set(RANDOM_TOKEN, () => Math.random(), { mode: 'scoped' })

				expect(root.resolve(RANDOM_TOKEN)).toBeGreaterThanOrEqual(1000)
				expect(sub.resolve(RANDOM_TOKEN)).toBeLessThanOrEqual(1)
				expect(root.resolve(RANDOM_TOKEN)).not.toBe(sub.resolve(RANDOM_TOKEN))
			})

			it('super (scoped) -> root (singleton) -> sub (singleton)', () => {
				const sup = new Gizmo()
				const root = sup.sub()
				const sub = root.sub()
				const RANDOM_TOKEN = Gizmo.token<number>()

				sup.set(RANDOM_TOKEN, () => Math.random() - 1000, { mode: 'scoped' })
				root.set(RANDOM_TOKEN, () => Math.random() + 1000)
				sub.set(RANDOM_TOKEN, () => Math.random())

				expect(sub.resolve(RANDOM_TOKEN)).toBeGreaterThanOrEqual(1000)
				expect(root.resolve(RANDOM_TOKEN)).toBe(sub.resolve(RANDOM_TOKEN))
			})
		})

		it('scoped', () => {
			const root = new Gizmo()
			const sub = root.sub()
			const RANDOM_TOKEN = Gizmo.token<number>()

			root.set(RANDOM_TOKEN, () => Math.random(), { mode: 'scoped' })

			expect(root.resolve(RANDOM_TOKEN)).not.toBe(sub.resolve(RANDOM_TOKEN))
			expect(sub.resolve(RANDOM_TOKEN)).toBe(sub.resolve(RANDOM_TOKEN))
		})

		it('transient', () => {
			const root = new Gizmo()
			const sub = root.sub()
			const RANDOM_TOKEN = Gizmo.token<number>()

			root.set(RANDOM_TOKEN, () => Math.random(), { mode: 'transient' })

			expect(root.resolve(RANDOM_TOKEN)).not.toBe(sub.resolve(RANDOM_TOKEN))
			expect(sub.resolve(RANDOM_TOKEN)).not.toBe(sub.resolve(RANDOM_TOKEN))
		})
	})

	it('detect cycles', () => {
		class Baz {
			value = QUX_TOKEN.inject()
		}

		const root = new Gizmo()
		const FOO_TOKEN = Gizmo.token<string>('Foo')
		const BAR_TOKEN = Gizmo.token<string>('Bar')
		const BAZ_TOKEN = Gizmo.token<Baz>('Baz')
		const QUX_TOKEN = Gizmo.token<string>('Qux')

		root.set(FOO_TOKEN, root.provide((val: string) => val, BAR_TOKEN))
		root.set(BAR_TOKEN, () => root.resolve(BAZ_TOKEN).value)
		root.set(BAZ_TOKEN, () => new Baz())
		root.set(QUX_TOKEN, () => root.get(BAR_TOKEN))

		expect(() => root.get(FOO_TOKEN)).toThrowError(`[gizmo] Cyclic dependency "Bar → Baz → Qux" detected`)
	})
})

describe('provide', () => {
	it('out of container', () => {
		const injection = Gizmo.provide(() => 'foo')
		expect(injection).toThrowError(`Can't provide dependency outside of container`)
	})

	it('deps and map', () => {
		const CONFIG_TOKEN = Gizmo.token<{ host: string }>()
		const PAGE_TOKEN = Gizmo.token<string>()
		const SHARE_URL_TOKEN = Gizmo.token<string>()

		gizmoTest.set(CONFIG_TOKEN, () => ({ host: 'rubaxa.org' }))
		gizmoTest.set(PAGE_TOKEN, () => 'board')
		gizmoTest.set(
			SHARE_URL_TOKEN,
			Gizmo.provide(
				(host: string, page: string) => `https://${host}/${page}`,
				CONFIG_TOKEN.map(({ host }) => host),
				PAGE_TOKEN,
			),
		)

		expect(gizmoTest.get(SHARE_URL_TOKEN)).toBe('https://rubaxa.org/board')
	})

	it('class', () => {
		class Foo {
			constructor(public fn: (val: string) => number) {}
		}
		const FOO_TOKEN = Gizmo.token<Foo>()

		gizmoTest.set(TEST_TOKEN, () => (val: string) => +val)
		gizmoTest.set(FOO_TOKEN, Gizmo.provide(Foo, TEST_TOKEN))

		expect(gizmoTest.get(FOO_TOKEN)?.fn('123')).toBe(123)
	})
})

describe('inject', () => {
	it('out of container', () => {
		expect(() => TEST_TOKEN.inject()).toThrowError(
			`[gizmo] Can't inject "TestToken" token outside of Gizmo#set or Gizmo.provide`,
		)
	})

	describe('class', () => {
		const fooGizmo = new Gizmo()
		const FOO_TOKEN = Gizmo.token<Foo>('foo')
		const TEST_TOKEN = Gizmo.token<(val: string) => number>()

		@Gizmo.injectable()
		class Foo {
			test = TEST_TOKEN.inject()

			clone() {
				return new Foo()
			}
		}

		fooGizmo.set(FOO_TOKEN, () => new Foo())
		fooGizmo.set(TEST_TOKEN, () => (val) => +val)

		it('out out container', () => {
			expect(() => new Foo()).toThrowError(`Can't inject "unknown" token outside of Gizmo#set or Gizmo.provide`)
		})

		it('correct', () => {
			expect(fooGizmo.get(FOO_TOKEN)).toBeInstanceOf(Foo)
			expect(fooGizmo.get(FOO_TOKEN)).toBe(fooGizmo.resolve(FOO_TOKEN))
			expect(fooGizmo.get(FOO_TOKEN)?.test('777')).toBe(777)
		})

		it('clone', () => {
			expect(fooGizmo.get(FOO_TOKEN)?.clone()).toBeInstanceOf(Foo)
			expect(fooGizmo.get(FOO_TOKEN)?.clone().test('333')).toBe(333)
		})
	})

	it('function', () => {
		const RANDOM_TOKEN = Gizmo.token<() => number>('random')
		const FOO_TOKEN = Gizmo.token<() => number>('foo')
		const sub = gizmoTest.sub()

		gizmoTest.set(RANDOM_TOKEN, () => () => Math.random() + 10)
		sub.set(FOO_TOKEN, () => () => {
			const random = RANDOM_TOKEN.inject()
			return random()
		})

		expect(gizmoTest.resolve(RANDOM_TOKEN)()).toBeGreaterThanOrEqual(10)
		expect(gizmoTest.resolve(RANDOM_TOKEN)()).not.toBe(gizmoTest.resolve(RANDOM_TOKEN)())
	})
})
