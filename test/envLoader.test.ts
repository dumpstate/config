import assert from "node:assert/strict"

import { envLoader, loadConfig } from "../src/index"

const TestConfig = {
	properties: {
		db: {
			properties: {
				host: { type: "string" },
				port: { type: "int32" },
			},
			optionalProperties: {
				ssl: { type: "boolean" },
			},
		},
		fooBar: {
			properties: {
				foo: { type: "string" },
				bar: { type: "boolean" },
			},
		},
	},
	optionalProperties: {
		env: { type: "string" },
	},
} as const

describe("envLoader", () => {
	const expected = {
		db: {
			host: "localhost",
			port: 5432,
			ssl: true,
		},
		fooBar: {
			foo: "foo",
			bar: false,
		},
	}

	before(() => {
		process.env["FOO__DB__HOST"] = "localhost"
		process.env["FOO__DB__PORT"] = "5432"
		process.env["FOO__DB__SSL"] = "true"
		process.env["FOO__FOO_BAR__FOO"] = "foo"
		process.env["FOO__FOO_BAR__BAR"] = "false"
	})

	after(() => {
		delete process.env["FOO__DB__HOST"]
		delete process.env["FOO__DB__PORT"]
		delete process.env["FOO__DB__SSL"]
		delete process.env["FOO__FOO_BAR__FOO"]
		delete process.env["FOO__FOO_BAR__BAR"]
	})

	it("loads empty object when no app name", async () => {
		assert.equal(Object.keys(envLoader()()).length, 0)
	})

	it("loads empty object when empty app name", async () => {
		assert.equal(Object.keys(envLoader({ appName: "" })()).length, 0)
	})

	it("loads config", async () => {
		const cfg = envLoader({ appName: "foo" })()

		assert.deepEqual(cfg, expected)
	})

	it("loads config via aggregate loader", async () => {
		const cfg = loadConfig(TestConfig, { appName: "foo" })

		assert.deepEqual(cfg, expected)
	})

	it("loads config when name with hypen", async () => {
		before(() => {
			process.env["FOO_BAR__DB__HOST"] = "localhost"
			process.env["FOO_BAR__DB__PORT"] = "5432"
			process.env["FOO_BAR__DB__SSL"] = "true"
			process.env["FOO_BAR__FOO_BAR__FOO"] = "foo"
			process.env["FOO_BAR__FOO_BAR__BAR"] = "false"
		})

		after(() => {
			delete process.env["FOO_BAR__DB__HOST"]
			delete process.env["FOO_BAR__DB__PORT"]
			delete process.env["FOO_BAR__DB__SSL"]
			delete process.env["FOO_BAR__FOO_BAR__FOO"]
			delete process.env["FOO_BAR__FOO_BAR__BAR"]
		})

		it("loads", async () => {
			const cfg = envLoader({ appName: "foo-bar" })()

			assert.deepEqual(cfg, expected)
		})

		it("loads via aggregate loader", async () => {
			const cfg = loadConfig(TestConfig, { appName: "foo-bar" })

			assert.deepEqual(cfg, expected)
		})
	})

	it("should not append NODE_ENV", async () => {
		let initialEnv: string | undefined

		before(() => {
			initialEnv = process.env["NODE_ENV"]
			process.env["NODE_ENV"] = "development"
		})

		after(() => {
			if (initialEnv) {
				process.env["NODE_ENV"] = initialEnv
			} else {
				delete process.env["NODE_ENV"]
			}
		})

		it("ignores env", async () => {
			const cfg = loadConfig(TestConfig, { appName: "foo" })

			assert.equal(cfg.env, undefined)
		})
	})

	it("raise validation error on invalid config", async () => {
		before(() => {
			process.env["FOO__DB__SSL"] = "foo"
		})

		it("raises on invalid", async () => {
			assert.rejects(async () =>
				loadConfig(TestConfig, { appName: "foo" }),
			),
				{},
				"config validation error"
		})
	})
})
