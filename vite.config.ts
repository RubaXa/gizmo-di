/// <reference types="vitest" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import camelCase from 'camelcase'

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			formats: ['cjs'],
			name: camelCase('packageName', { pascalCase: true }),
			fileName: 'index',
		},
	},
	plugins: [
	],
	test: {},
})
