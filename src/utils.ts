/** Checks if a value is class-like. */
export function isClassLike(value: any): value is { new (...args: any): any } {
	return (
		typeof value === 'function'
		&& value.prototype
		&& Object.prototype.toString.call(value.prototype) === '[object Object]'
	)
}

/** Memoizes a function call. */
export function memo<T>(fn: () => T): (() => T) {
	let ready = false
	let value: T

	return () => {
		if (!ready) {
			ready = true
			value = fn()
		}

		return value
	}
}
