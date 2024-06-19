### Logger

```ts
import {
	Gizmo,
	LOGGER_TOKEN, // Pre-defined token
} from 'gizmo-di'

/** Project DI-container */
const projectGizmo = new Gizmo()

// Setting up a token's value factory
projectGizmo.set(LOGGER_TOKEN, () => ({
	...console,
	fatal: console,
}))

// Resolve token
const logger = projectGizmo.get(LOGGER_TOKEN)

// Usage
logger.info('App ready')
```

---

### Inject

```ts
import { BROWSER_STORAGES_TOKEN, Gizmo, LOGGER_TOKEN, globalGizmo } from 'gizmo-di'

/** Your DI-container with global-parent */
const container = globalGizmo.sub() // or `new Gizmo()` — without parent

/** Project configuration token */
export const CONFIG_TOKEN = Gizmo.token(
	'ConfigToken', // ← Token description
	() => ({ debug: true }), // ← Default value factory
)

/** HttpClient token */
export const HTTP_CLIENT_TOKEN = Gizmo.token<HttpClient>('HttpClient') // without default

/** HttpClient storage token */
export const HTTP_CLIENT_STORAGE_TOKEN = Gizmo.token<Storage>('HttpClientStorage')

/**
 * Http Client, features:
 *  - logging
 *  - caching
 */
class HttpClient {
	private logger = Gizmo.inject(LOGGER_TOKEN) // ← Dependency Injection
	private storage = Gizmo.inject(HTTP_CLIENT_STORAGE_TOKEN)

	async get(url: URL) {
		const cacheKey = url.toString()
		const cache = this.storage.getItem(cacheKey)
		if (cache) {
			this.logger.error(`[HttpClient] Get "${url}" from cache`, { cache })
			return cache
		}

		this.logger.error(`[HttpClient] Send "${url}" request`)

		try {
			const response = await fetch(url)
			const result = await response.json()

			this.logger.error(`[HttpClient] Get "${url}" successfully`, { result })
			this.storage.setItem(cacheKey, result)

			return result
		} catch (error) {
			this.logger.error(`[HttpClient] Get "${url}" failed`, { error })
			throw error
		}
	}
}

// Setup HttpClient storage dependency
container.set(HTTP_CLIENT_STORAGE_TOKEN, Gizmo.provide(
	({ session }: InferGizmoToken<typeof BROWSER_STORAGES_TOKEN>) => session, // ← Factory
	BROWSER_STORAGES_TOKEN, // ← First argument
))

/** Public Object for quick access to dependencies */
export const appGizmo = {
	/** Configuration */
	getConfig: container.set(CONFIG_TOKEN, () => ({ debug: process.env.NODE_ENV !== 'production' })),

	/** Logger by config */
	getLogger: container.set(LOGGER_TOKEN, Gizmo.provide(
		({ debug }: InferGizmoToken<typeof CONFIG_TOKEN>) => {
			if (!debug) {
				return Object.fromEntries(['debug', 'info', 'warn', 'error', 'fatal'].map((key) => [
					key,
					() => {},
				]))
			}

			return { ...console, fatal: console.error }
		}),
	CONFIG_TOKEN,
	),

	/** Http Client */
	getHttpClient: container.set(HTTP_CLIENT, () => new HttpClient()),
}
```
