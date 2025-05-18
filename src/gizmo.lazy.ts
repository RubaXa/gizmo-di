export const GIZMO_LAZY_VALUE = Symbol('gizmo.lazy.value')

/**
 * Represents a lazily loaded instance where all properties and methods
 * of the original type `T` are accessed asynchronously.
 */
export type GizmoLazy<T> = {
	[P in keyof T]: T[P] extends (...args: infer Args) => infer RetVal
		? (...args: Args) => Promise<RetVal extends Promise<infer Res> ? Res : RetVal>
		: Promise<T[P]>;
}

/** Creates a lazy, asynchronous proxy facade for type `T` */
export function createGizmoLazy<T>(module: () => Promise<T>): GizmoLazy<T> {
	return new Proxy({} as GizmoLazy<T> & { [GIZMO_LAZY_VALUE]: Promise<T> }, {
		get(target, propKey, _receiver) {
			target[GIZMO_LAZY_VALUE] ??= module()

			return target[GIZMO_LAZY_VALUE].then((value) => {
				const member = (value as any)[propKey]

				if (typeof member === 'function') {
					return (...args: any[]) => {
						try {
							const result = member.apply(value, args)
							return Promise.resolve(result)
						} catch (error) {
							return Promise.reject(error)
						}
					}
				}

				return member
			})
		},
	})
}
