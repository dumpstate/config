import { test } from "tap"

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

test("envLoader", async (t) => {
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

	t.before(() => {
		process.env["FOO__DB__HOST"] = "localhost"
		process.env["FOO__DB__PORT"] = "5432"
		process.env["FOO__DB__SSL"] = "true"
		process.env["FOO__FOO_BAR__FOO"] = "foo"
		process.env["FOO__FOO_BAR__BAR"] = "false"
	})

	t.teardown(() => {
		delete process.env["FOO__DB__HOST"]
		delete process.env["FOO__DB__PORT"]
		delete process.env["FOO__DB__SSL"]
		delete process.env["FOO__FOO_BAR__FOO"]
		delete process.env["FOO__FOO_BAR__BAR"]
	})

	t.test("loads empty object when no app name", async (t) => {
		t.equal(Object.keys(envLoader()()).length, 0)
	})

	t.test("loads empty object when empty app name", async (t) => {
		t.equal(Object.keys(envLoader({ appName: "" })()).length, 0)
	})

	t.test("loads config", async (t) => {
		const cfg = envLoader({ appName: "foo" })()

		t.match(cfg, expected)
	})

	t.test("loads config via aggregate loader", async (t) => {
		const cfg = loadConfig(TestConfig, { appName: "foo" })

		t.match(cfg, expected)
	})

	t.test("loads config when name with hypen", async (t) => {
		t.before(() => {
			process.env["FOO_BAR__DB__HOST"] = "localhost"
			process.env["FOO_BAR__DB__PORT"] = "5432"
			process.env["FOO_BAR__DB__SSL"] = "true"
			process.env["FOO_BAR__FOO_BAR__FOO"] = "foo"
			process.env["FOO_BAR__FOO_BAR__BAR"] = "false"
		})

		t.teardown(() => {
			delete process.env["FOO_BAR__DB__HOST"]
			delete process.env["FOO_BAR__DB__PORT"]
			delete process.env["FOO_BAR__DB__SSL"]
			delete process.env["FOO_BAR__FOO_BAR__FOO"]
			delete process.env["FOO_BAR__FOO_BAR__BAR"]
		})

		t.test("loads", async (t) => {
			const cfg = envLoader({ appName: "foo-bar" })()

			t.match(cfg, expected)
		})

		t.test("loads via aggregate loader", async (t) => {
			const cfg = loadConfig(TestConfig, { appName: "foo-bar" })

			t.match(cfg, expected)
		})
	})

	t.test("should not append NODE_ENV", async (t) => {
		let initialEnv: string | undefined

		t.before(() => {
			initialEnv = process.env["NODE_ENV"]
			process.env["NODE_ENV"] = "development"
		})

		t.teardown(() => {
			if (initialEnv) {
				process.env["NODE_ENV"] = initialEnv
			} else {
				delete process.env["NODE_ENV"]
			}
		})

		t.test("ignores env", async (t) => {
			const cfg = loadConfig(TestConfig, { appName: "foo" })

			t.equal(cfg.env, undefined)
		})
	})

	t.test("raise validation error on invalid config", async (t) => {
		t.before(() => {
			process.env["FOO__DB__SSL"] = "foo"
		})

		t.test("raises on invalid", async (t) => {
			t.rejects(async () => loadConfig(TestConfig, { appName: "foo" })),
				{},
				"config validation error"
		})
	})
})
