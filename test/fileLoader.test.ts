import { randomUUID } from "crypto"
import fs from "fs"
import os from "os"
import path from "path"

import { test } from "tap"

import { ConfigSchema, loadConfig, fileLoader } from "../src/index"

const TestConfig = {
	optionalProperties: {
		name: { type: "string" },
		db: {
			optionalProperties: {
				host: { type: "string" },
				port: { type: "int32" },
				ssl: { type: "boolean" },
			},
		},
		foo: {
			elements: { type: "int32" },
		},
		sendgrid: {
			properties: {
				key: { type: "string" },
			},
		},
	},
} as const

type TestConfigSchema = ConfigSchema<typeof TestConfig>

const TEST_CONFIG = {
	name: "app_name",
	db: {
		host: "localhost",
		port: 5432,
	},
}
const TEST_CONFIG_2 = {
	db: {
		ssl: true,
	},
	foo: [1, 2, 3],
}
const TEST_CONFIG_3 = {
	db: {
		host: "host.com",
		port: 5444,
		ssl: false,
	},
	sendgrid: { key: "<sendgrid_key>" },
}

function tmpdir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), "cfg"))
}

function rm(filepath: string) {
	const dir = fs.lstatSync(filepath).isDirectory()
		? filepath
		: path.dirname(filepath)
	const files = fs.readdirSync(dir)

	for (const f of files) {
		fs.rmSync(path.join(dir, f))
	}

	fs.rmdirSync(dir)
}

test("specific file only", async (t) => {
	let cfgPath: string

	t.before(() => {
		cfgPath = path.join(tmpdir(), randomUUID().toString())
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG))

		process.env["APPLICATION_CONFIG"] = cfgPath
	})

	t.teardown(() => {
		rm(cfgPath)
		delete process.env["APPLICATION_CONFIG"]
	})

	t.test("should load the config via specific loader", async (t) => {
		const cfg = fileLoader()()

		t.match(cfg, TEST_CONFIG)
	})

	t.test("should load the config via aggregate loader", async (t) => {
		const cfg: TestConfigSchema = loadConfig(TestConfig)

		t.match(cfg, TEST_CONFIG)
	})
})

test("application.json only", async (t) => {
	let cfgPath: string

	t.before(() => {
		cfgPath = path.join(tmpdir(), "application.json")
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG))
	})

	t.teardown(() => rm(cfgPath))

	t.test("should load the config via specific loader", async (t) => {
		const cfg = fileLoader({
			targetDir: path.dirname(cfgPath),
		})()

		t.match(cfg, TEST_CONFIG)
	})

	t.test("should load the config via aggregate loader", async (t) => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, {
			targetDir: path.dirname(cfgPath),
		})

		t.match(cfg, TEST_CONFIG)
	})
})

test("default.application.json only", async (t) => {
	let cfgPath: string

	t.before(() => {
		cfgPath = path.join(tmpdir(), "default.application.json")
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG))
	})

	t.teardown(() => rm(cfgPath))

	t.test("should load the config via specific loader", async (t) => {
		const cfg = fileLoader({
			targetDir: path.dirname(cfgPath),
		})()

		t.match(cfg, TEST_CONFIG)
	})

	t.test("should load the config via aggregate loader", async (t) => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, {
			targetDir: path.dirname(cfgPath),
		})

		t.match(cfg, TEST_CONFIG)
	})
})

test("default.application.json along with application.json", async (t) => {
	let targetDir: string
	const expected = {
		name: "app_name",
		db: {
			host: "localhost",
			port: 5432,
			ssl: true,
		},
		foo: [1, 2, 3],
	}

	t.before(() => {
		targetDir = tmpdir()
		fs.writeFileSync(
			path.join(targetDir, "default.application.json"),
			JSON.stringify(TEST_CONFIG)
		)
		fs.writeFileSync(
			path.join(targetDir, "application.json"),
			JSON.stringify(TEST_CONFIG_2)
		)
	})

	t.teardown(() => rm(targetDir))

	t.test("should load the config via specific loader", async (t) => {
		const cfg = fileLoader({ targetDir })()

		t.match(cfg, expected)
	})

	t.test("should load the config via aggregate loader", async (t) => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, { targetDir })

		t.match(cfg, expected)
	})
})

test("all files", async (t) => {
	let targetDir: string
	let cfgPath: string

	const expected = {
		name: "app_name",
		db: {
			host: "host.com",
			port: 5444,
			ssl: false,
		},
		foo: [1, 2, 3],
		sendgrid: {
			key: "<sendgrid_key>",
		},
	}

	t.before(() => {
		targetDir = tmpdir()
		fs.writeFileSync(
			path.join(targetDir, "default.application.json"),
			JSON.stringify(TEST_CONFIG)
		)
		fs.writeFileSync(
			path.join(targetDir, "application.json"),
			JSON.stringify(TEST_CONFIG_2)
		)

		cfgPath = path.join(tmpdir(), randomUUID().toString())
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG_3))
	})

	t.teardown(() => {
		rm(targetDir)
		rm(cfgPath)
	})

	t.test("should load the config via specific loader", async (t) => {
		const cfg = fileLoader({
			targetDir,
			configPath: cfgPath,
		})()

		t.match(cfg, expected)
	})

	t.test("should load the config via aggregate loader", async (t) => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, {
			targetDir,
			configPath: cfgPath,
		})

		t.match(cfg, expected)
	})
})
