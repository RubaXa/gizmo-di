### Logger

```ts
import { Gizmo } from 'gizmo-di'

/** Project DI-container */
const projectGizmo = new Gizmo()

/** Logger token with description */
const LOGGER_TOKEN = Gizmo.token<Console>('LoggerToken')

// Setting up a token's value factory
projectGizmo.set(LOGGER_TOKEN, () => console)

// Resolve token
const logger = projectGizmo.get(LOGGER_TOKEN)

// Usage
logger.info('App ready')
```

---

### Inject

```ts
import { Gizmo, globalGizmo } from 'gizmo-di'

/** Your DI-container with global-parent */
const container = globalGizmo.sub() // or `new Gizmo()` — without parent

/** Project configuration token */
export const CONFIG_TOKEN = Gizmo.token(
	'ConfigToken', // ← Token description
	() => ({ debug: true }), // ← Default value factory
)

/** Logger token */
export const LOGGER_TOKEN = Gizmo.token<Pick<Console, 'info'>>('LoggerToken', () => console)

/** Browser Storages token */
export const BROWSER_STORAGES_TOKEN = Gizmo.token('BrowserStorages', () => ({
	local: localStorage,
	session: localSession,
}))

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
	private logger = LOGGER_TOKEN.inject() // ← Dependency Injection
	private storage = HTTP_CLIENT_STORAGE_TOKEN.inject()

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
				return { info: () => {} }
			}

			return console
		}),
	CONFIG_TOKEN,
	),

	/** Http Client */
	getHttpClient: container.set(HTTP_CLIENT, () => new HttpClient()),
}
```
