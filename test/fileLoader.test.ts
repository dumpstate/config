import { randomUUID } from "crypto"
import fs from "fs"
import assert from "node:assert/strict"
import os from "os"
import path from "path"

import { ConfigSchemaType, loadConfig, fileLoader } from "../src/index"

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

type TestConfigSchema = ConfigSchemaType<typeof TestConfig>

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

describe("specific file only", () => {
	let cfgPath: string

	before(() => {
		cfgPath = path.join(tmpdir(), randomUUID().toString())
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG))

		process.env["APPLICATION_CONFIG"] = cfgPath
	})

	after(() => {
		rm(cfgPath)
		delete process.env["APPLICATION_CONFIG"]
	})

	it("should load the config via specific loader", async () => {
		const cfg = fileLoader()()

		assert.deepEqual(cfg, TEST_CONFIG)
	})

	it("should load the config via aggregate loader", async () => {
		const cfg: TestConfigSchema = loadConfig(TestConfig)

		assert.deepEqual(cfg, TEST_CONFIG)
	})
})

describe("application.json only", async () => {
	let cfgPath: string

	before(() => {
		cfgPath = path.join(tmpdir(), "application.json")
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG))
	})

	after(() => rm(cfgPath))

	it("should load the config via specific loader", async () => {
		const cfg = fileLoader({
			targetDir: path.dirname(cfgPath),
		})()

		assert.deepEqual(cfg, TEST_CONFIG)
	})

	it("should load the config via aggregate loader", async () => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, {
			targetDir: path.dirname(cfgPath),
		})

		assert.deepEqual(cfg, TEST_CONFIG)
	})
})

describe("default.application.json only", async () => {
	let cfgPath: string

	before(() => {
		cfgPath = path.join(tmpdir(), "default.application.json")
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG))
	})

	after(() => rm(cfgPath))

	it("should load the config via specific loader", async () => {
		const cfg = fileLoader({
			targetDir: path.dirname(cfgPath),
		})()

		assert.deepEqual(cfg, TEST_CONFIG)
	})

	it("should load the config via aggregate loader", async () => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, {
			targetDir: path.dirname(cfgPath),
		})

		assert.deepEqual(cfg, TEST_CONFIG)
	})
})

describe("default.application.json along with application.json", async () => {
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

	before(() => {
		targetDir = tmpdir()
		fs.writeFileSync(
			path.join(targetDir, "default.application.json"),
			JSON.stringify(TEST_CONFIG),
		)
		fs.writeFileSync(
			path.join(targetDir, "application.json"),
			JSON.stringify(TEST_CONFIG_2),
		)
	})

	after(() => rm(targetDir))

	it("should load the config via specific loader", async () => {
		const cfg = fileLoader({ targetDir })()

		assert.deepEqual(cfg, expected)
	})

	it("should load the config via aggregate loader", async () => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, { targetDir })

		assert.deepEqual(cfg, expected)
	})
})

describe("all files", async () => {
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

	before(() => {
		targetDir = tmpdir()
		fs.writeFileSync(
			path.join(targetDir, "default.application.json"),
			JSON.stringify(TEST_CONFIG),
		)
		fs.writeFileSync(
			path.join(targetDir, "application.json"),
			JSON.stringify(TEST_CONFIG_2),
		)

		cfgPath = path.join(tmpdir(), randomUUID().toString())
		fs.writeFileSync(cfgPath, JSON.stringify(TEST_CONFIG_3))
	})

	after(() => {
		rm(targetDir)
		rm(cfgPath)
	})

	it("should load the config via specific loader", async () => {
		const cfg = fileLoader({
			targetDir,
			configPath: cfgPath,
		})()

		assert.deepEqual(cfg, expected)
	})

	it("should load the config via aggregate loader", async () => {
		const cfg: TestConfigSchema = loadConfig(TestConfig, {
			targetDir,
			configPath: cfgPath,
		})

		assert.deepEqual(cfg, expected)
	})
})
