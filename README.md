Gizmo 🕋
--------
Gizmo is a lightweight dependency injection (DI) container designed to simplify dependency management in your TypeScript projects. It is particularly useful for managing and injecting dependencies in large applications, ensuring that components are easily testable and maintainable.

```sh
npm i --save gizmo-di
```

---

### Features

- 🏷️ **Token-Based Dependency Resolution**: Uses tokens to identify and resolve dependencies, providing flexibility and type safety.
- 📦 **Sub-Containers**: Allows creation of sub-containers for hierarchical dependency management.
- 💉 **Dependency Injection**: Based on active containers.
- ⚙️ **Supports `singleton`, `scoped`, and `transient`** modes for controlling dependency lifecycles.
- 🔄 **Lifecycle Hooks**: `onCreated` and `onDeleted` for managing dependency lifecycle events.
- ⏳ **Lazy Loading**: Asynchronously loads dependencies to enhance performance by created modules only when they are required.
- 🛡️ **Reliability**: Type Inference & Checking, Cyclic Dependency Detection and Error Tolerance

---

### Examples

1. [**Logger**](./EXAMPLES.md#logger)
1. [**Inject**](./EXAMPLES.md#inject)

---

### API

#### `Gizmo.token<Type>([description[, factory]])`

Creates a new Gizmo token.

**Parameters**:
- **description**: `string` — A string description for the token. (optional, but very recommended)
- **factory**: `() => Type` — A factory function to create the token's default value.

**Returns**: A `GizmoToken<Type>` instance.

```ts
/** Config token with description & default */
const CONFIG_TOKEN = Gizmo.token(`Config`, () => ({
	debug: false,
	host: '127.0.0.1',
}))
```

---

#### `Gizmo.provide<Dep>(dep, ...args)`

Provides a dependency using the active Gizmo container.

**Parameters**
- **dep**: `Dep` — a function or class to be used as the dependency.
- **args**: `DepTokenArgs<Dep>` — the arguments to be passed to the dependency.

**Returns**: `() => DepType<Dep>` — a function that provides the dependency.

**Throws**: Error if the call outside of container.

```ts
const LOGGER_TOKEN = Gizmo.token('Logger', Gizmo.provide(
	({ debug }: InferGizmoToken<typeof CONFIG_TOKEN>) => (debug
		? console.info
		: (...args: any[]) => {}
	),
	CONFIG_TOKEN,
))
```

---

#### `Gizmo.lazy<Type>(factory)`

Creates a lazy-loaded factory for a token.

**Parameters**:
- **factory**: `() => Promise<Type> | Promise<Type>` — A function or promise that resolves to the token's value.

**Returns**: A function that returns a promise resolving to the token's value.

```ts
// on demand
globalGizmo.set(LAZY_MODULE_TOKEN, Gizmo.lazy(() => import('@some/module')))

// and promise
globalGizmo.set(PROMISE_TOKEN, Gizmo.lazy(import('@some/module')))
```

---

### `Gizmo` instance methods

#### `set<Type>(token, factory, [options])`

Set a factory for a given token and store the factory method and options.

**Parameters**
- **token**: `GizmoToken<Type>` — the token to associate with the factory.
- **factory**: `() => Type` — the factory function to create the token's value.
- **options**: `GizmoSetOptions<Type>` (optional)
  - **mode**: `singleton | scoped | transient` (optional).
  - **onCreated**: `(value: Type) => void` (optional) — a hook called when a token's value is created.
  - **onDeleted**: `(value: Type) => void` (optional) — a hook called when a token's value is deleted.

**Returns**: `() => Type` — function to resolve the token.

```ts
// Singleton
container.set(CONFIG_TOKEN, () => ({ debug: true }), {
	onCreated: (config) => console.log('Config created:', config),
})

// Transient
container.set(HTTP_CLIENT, () => new HttpClient(), { mode: 'transient' })
```

---

#### `has(token)`

Check if a token is present in the container.

**Parameters**
- **token**: `GizmoToken<any>` — the token to check.

**Returns**: `boolean` — `true` if the token is present, otherwise `false`.

```ts
const exists = container.has(CONFIG_TOKEN)
```

---

#### `get<Type>(token)`

Get the value associated with a token. If not cached, it resolves the value using the factory.

**Parameters**
- **token**: `GizmoToken<Type>` — the token to get the value for.

**Returns**: `Type | undefined` — the resolved value or `undefined` if not found and no default is provided.

```ts
const config = container.get(CONFIG_TOKEN)
```

---

#### `resolve<Type>(token)`

Get the value associated with a token, throws an error if not found.

**Parameters**
- **token**: `GizmoToken<Type>` — the token to resolve.

**Returns**: `Type` — the resolved value.

**Throws**: Error if the token cannot be resolved.

```ts
const config = container.resolve(CONFIG_TOKEN)
```

---

#### `sub()`

Creates a sub-container.

**Returns**: `Gizmo` instance

```ts
const projectGizmo = globalGizmo.sub()
```

---

#### `delete<Type>(token)`

Remove a token and its value from the container.

**Parameters**
- **token**: GizmoToken<Type> — the token to delete.

**Returns**: `void`

```ts
container.delete(CONFIG_TOKEN)
```

#### `clear()`

Clear all tokens and values from the container.

**Returns**: `void`

```ts
container.clear()
```

---

### Types / Utils

### `GizmoToken`

#### `inject(): Type`

Injects a dependency based on the active Gizmo container.

**Returns**: `Type` — the resolved dependency instance.

```ts
const HTTP_CLIENT_TOKEN = Gizmo.token<HttpClient>('HttpClient')
const HTTP_CLIENT_CONFIG_TOKEN = Gizmo.token('HttpClientConfig', () => ({ apiBaseUrl: 'http://127.0.0.1/api/v1' }))

class HttpClient {
	private config = HTTP_CLIENT_CONFIG_TOKEN.inject()
}

container.set(HTTP_CLIENT_TOKEN, () => new HttpClient())
```

---

#### `map<TOut>(fn)`

Transforms a token into a subordinate token for injectable (`Gizmo#provide`).

**Parameters**
- **fn**: `fn: (value: Type) => TOut` — A function that defines the transformation

**Returns**: `GizmoTokenSub<TOut>` — Subordinate token type

```ts
container.set(LOGGER_TOKEN, Gizmo.provide(
	(debug: boolean) => debug ? console.info : (...args: any[]) => {},
	CONFIG_TOKEN.map(({ debug }) => debug),
))
```

---

### `InferGizmoToken<Token>`

Utility type to infer the type from a `GizmoToken<Type>`.

---

### `GizmoTokenMode`

Represents token modes.

**Values**
- `singleton`
- `scoped`
- `transient`

```ts
/* eslint no-self-compare:"off" */
const randomValue = () => ({ value: Math.random() })
const RANDOM_TOKEN = Gizmo.token<{ value: number }>('random')

const first = new Gizmo()
const second = first.sub()
const third = second.sub()
const four = four.sub()

// Singleton
first.set(RANDOM_TOKEN, randomValue)
second.set(RANDOM_TOKEN, randomValue)

// Scoped
third.set(RANDOM_TOKEN, randomValue, { mode: 'scoped' })

// Transient
four.set(RANDOM_TOKEN, randomValue, { mode: 'transient' })

// TESTS: Transient
four.resolve(RANDOM_TOKEN).value !== four.resolve(RANDOM_TOKEN).value // "four" not equal "four"

// TESTS: Scoped
third.resolve(RANDOM_TOKEN).value !== four.resolve(RANDOM_TOKEN).value // "third" not equal "four"
third.resolve(RANDOM_TOKEN).value === third.resolve(RANDOM_TOKEN).value // "third" equal "third"

// TESTS: Singleton
second.resolve(RANDOM_TOKEN).value === first.resolve(RANDOM_TOKEN).value // "second" equal "first"
second.resolve(RANDOM_TOKEN).value !== third.resolve(RANDOM_TOKEN).value // "second" not equal "third"
```

---

### Conclusion

Gizmo provides a structured and efficient way to manage dependencies in your TypeScript projects. By leveraging tokens and different dependency scopes, you can create scalable and maintainable applications. Integrate Gizmo into your project to simplify dependency management and improve code testability.
