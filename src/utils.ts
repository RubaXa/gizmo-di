/** Проверка на класс (ну такое) */
export function isClassLike(value: any): value is { new (...args: any): any } {
	return (
		typeof value === 'function'
		&& value.prototype
		&& Object.prototype.toString.call(value.prototype) === '[object Object]'
	)
}

/** Мемоизация вызова функции */
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
