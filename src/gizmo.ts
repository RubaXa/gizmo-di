import { isClassLike, memo } from './utils'

type ArrayToTokens<TList extends any[]> = {
	[Idx in keyof TList]: GizmoToken<TList[Idx]> | GizmoTokenSub<TList[Idx]>;
}

type DepTokenArgs<T> = T extends { new (...args: infer CArgs): any }
	? ArrayToTokens<CArgs>
	: T extends (...args: infer FArgs) => any
		? ArrayToTokens<FArgs>
		: never

type DepType<T> = T extends { new (...args: any[]): infer CType }
	? CType
	: T extends (...args: any[]) => infer FType
		? FType
		: never

const GIZMO_TOKEN_TYPE = Symbol('gizmo.token.type')
const GIZMO_TOKEN_OWNER = Symbol('gizmo.token.owner')
const GIZMO_TOKEN_MAP_FN = Symbol('gizmo.token.map.fn')

/** Gizmo Token */
export interface GizmoToken<Type = unknown> {
	/** Hidden method to store the type/default */
	[GIZMO_TOKEN_TYPE]?: () => Type

	/** Inject a token relative to the active container */
	inject: () => Type

	/** Method to map the token to a subordinate for `provide` */
	map: <TOut>(fn: (thing: Type, gizmo: Gizmo) => TOut) => GizmoTokenSub<TOut>

	/** Get token description */
	toString: () => string
	[Symbol.toStringTag]: string
}

/** Subordinate token */
interface GizmoTokenSub<TOut> {
	[GIZMO_TOKEN_OWNER]: GizmoToken<any>
	[GIZMO_TOKEN_MAP_FN]: (thing: any, gizmo: Gizmo) => TOut
	toString: () => string
	[Symbol.toStringTag]: string
}

/** Token set options */
export type InferGizmoToken<T> = T extends GizmoToken<infer Type> ? Type : never

/** Token mode */
export type GizmoTokenMode = 'singleton' | 'scoped' | 'transient'

/** Опции установки токена */
interface GizmoSetOptions<Type> {
	mode?: GizmoTokenMode
	onCreated?: (value: Type) => void
}

/** Token descriptor */
interface GizmoTokenDescriptor<Type> {
	factory: (ownGizmo: Gizmo) => Type
	options: GizmoSetOptions<Type>
}

/** Active Gizmo container for `inject` */
let activeGizmo: Gizmo | undefined

/** Set active Gizmo container */
function inActiveGizmo<T extends Gizmo, R>(next: T, fn: () => R): R {
	const prevGizmo = activeGizmo
	activeGizmo = next

	try {
		return fn()
	} catch (err) {
		throw err
	} finally {
		activeGizmo = prevGizmo
	}
}

/** Tracked dependency chain (to detect cycles) */
const trackedGizmoDeps: GizmoToken<any>[] = []

/** Tracked dependency cycles */
function trackDeps<T extends GizmoToken<any>, R>(token: T, fn: () => R): R {
	const tracking = !trackedGizmoDeps.length
	const idx = trackedGizmoDeps.indexOf(token)

	if (idx > -1) {
		const deps = trackedGizmoDeps.slice(idx).join(' → ')
		trackedGizmoDeps.length = 0
		throw new Error(`[gizmo] Cyclic dependency "${deps}" detected`)
	}

	trackedGizmoDeps.push(token)

	try {
		return fn()
	} catch (error) {
		throw error
	} finally {
		if (tracking) {
			trackedGizmoDeps.length = 0
		}
	}
}

/** Gizmo (DI container) */
export class Gizmo {
	/** Create a token */
	static token<Type>(description = 'unknown', factory?: () => Type): GizmoToken<Type> {
		const owner: GizmoToken<Type> = {
			[GIZMO_TOKEN_TYPE]: factory && memo(factory),

			toString: () => description,
			[Symbol.toStringTag]: description,

			map: (fn) => ({
				toString: () => `map(${description})`,
				[Symbol.toStringTag]: `map(${description})`,

				[GIZMO_TOKEN_OWNER]: owner,
				[GIZMO_TOKEN_MAP_FN]: fn as any,
			}),

			inject: () => {
				if (!activeGizmo) {
					throw new Error(`[gizmo] Can't inject "${owner}" token outside of Gizmo#set or Gizmo.provide`)
				}

				return activeGizmo.resolve(owner)
			},
		}

		return owner
	}

	/**
	 * Decorator to ensure proper `GizmoToken.inject` functionality inside classes.
	 * IMPORTANT: This is a very fragile implementation, working only for classes created within `Gizmo.provide`
	 */
	static injectable() {
		let injectedGizmo: Gizmo | undefined

		return function <Instance, Args extends any[]>(Constructor: { new (...args: Args): Instance }) {
			const newConstructor: any = function (...args: Args) {
				injectedGizmo ||= activeGizmo
				return inActiveGizmo(injectedGizmo!, () => new Constructor(...args))
			}

			newConstructor.prototype = Constructor.prototype

			return newConstructor as { new (...args: Args): Instance }
		}
	}

	/** Describe a factory to obtain dependencies */
	static provide<Dep extends Function>(dep: Dep, ...args: DepTokenArgs<Dep>) {
		return <Type extends DepType<Dep>>(): Type => {
			if (!activeGizmo) {
				throw new Error(`[gizmo] Can't provide dependency outside of container`)
			}

			const resolver = <Type>(token: GizmoToken<Type> | GizmoTokenSub<Type>) => {
				if (GIZMO_TOKEN_OWNER in token) {
					const thing = activeGizmo!.resolve(token[GIZMO_TOKEN_OWNER])
					return token[GIZMO_TOKEN_MAP_FN](thing, activeGizmo!)
				}

				return activeGizmo!.resolve(token)
			}

			if (isClassLike(dep)) {
				// eslint-disable-next-line new-cap
				return new dep(...args.map(resolver))
			}

			return dep(...args.map(resolver))
		}
	}

	/** Cached token values */
	private values = new Map<GizmoToken<any>, any>()

	/** Token descriptors (factory and options) */
	private descriptors = new Map<GizmoToken<any>, GizmoTokenDescriptor<any>>()

	/** LEGO */
	constructor(private parent?: Gizmo) {}

	token = Gizmo.token
	provide = Gizmo.provide

	/** Create a sub-container  */
	sub = () => new Gizmo(this)

	/** Set a factory for a token */
	set<Type>(token: GizmoToken<Type>, factory: () => Type, options: GizmoSetOptions<Type> = {}) {
		this.descriptors.set(token, {
			options,
			factory: (ownGizmo) => inActiveGizmo(ownGizmo, () => {
				let value = factory()

				// TODO: Привести в порядок и сделать wrap
				if (typeof value === 'function') {
					const original = value

					value = ((...args: any[]) => inActiveGizmo(
						ownGizmo,
						() => original(...args),
					)) as Type
				}

				return value
			}),
		})

		return () => this.resolve(token)
	}

	/** Check for token presence */
	has(token: GizmoToken<any>): boolean {
		return !!(this.descriptors.get(token) ?? this.parent?.has(token))
	}

	/** Get the value by token */
	get<Type>(token: GizmoToken<Type>): Type | undefined {
		if (this.values.has(token)) {
			return this.values.get(token)
		}

		// Find the first non-`singleton` descriptor
		// eslint-disable-next-line ts/no-this-alias
		let ownerContainer: Gizmo = this
		let cursorContainer: Gizmo | undefined = ownerContainer
		let descriptor = this.descriptors.get(token)
		let mode = descriptor?.options.mode

		do {
			cursorContainer = cursorContainer.parent

			const nextDescriptor = cursorContainer?.descriptors.get(token)
			const nextMode = nextDescriptor?.options.mode

			if (!descriptor && nextMode) {
				mode = nextMode
				descriptor = nextDescriptor
			}

			if (mode === 'transient' || mode === 'scoped') {
				return trackDeps(token, () => {
					const value = descriptor?.factory(this)

					if (mode === 'scoped') {
						this.values.set(token, value)
					}

					descriptor?.options.onCreated?.(value)

					return value
				})
			}

			if (nextDescriptor && (!nextMode || nextMode === 'singleton')) {
				descriptor = nextDescriptor
				ownerContainer = cursorContainer!
			}
		} while (cursorContainer)

		// Found a parent token descriptor
		if (descriptor) {
			if (ownerContainer.values.has(token)) {
				return ownerContainer.values.get(token)
			}

			return trackDeps(token, () => {
				const value = descriptor.factory(ownerContainer)

				ownerContainer.values.set(token, value)
				descriptor.options.onCreated?.(value)

				return value
			})
		}

		// Try to return the default value
		return trackDeps(token, () => token[GIZMO_TOKEN_TYPE]?.())
	}

	/** Get the value by token (throws an error if absent) */
	resolve<Type>(token: GizmoToken<Type>): Type {
		if (!this.descriptors.has(token) && !this.parent?.has(token) && !token[GIZMO_TOKEN_TYPE]) {
			throw new Error(`[gizmo] Resolve "${token}" token failed`)
		}

		return this.get(token)!
	}

	/** Delete a token from the container */
	delete<Type>(token: GizmoToken<Type>): void {
		this.values.delete(token)
		this.descriptors.delete(token)
	}

	/** Clear the container */
	clear(): void {
		this.values.clear()
		this.descriptors.clear()
	}
}

/** Global Gizmo container */
export const globalGizmo = new Gizmo()
