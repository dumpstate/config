import fs from "fs"
import path from "path"

import { camelCase, merge, set } from "lodash"
import Ajv, { AnySchema, JTDDataType } from "ajv/dist/jtd"

const DEFAULT_SEPARATOR = "__"
const DEFAULT_CONFIG_DIR = "config"

interface EnvLoaderOpts {
	readonly appName: string
	readonly separator?: string
}

export function envLoader(opts: EnvLoaderOpts) {
	const { appName } = opts
	if (appName.length === 0) {
		throw new Error(`Invalid application name: ${appName}`)
	}

	let { separator } = opts
	if (!separator) {
		separator = DEFAULT_SEPARATOR
	}

	const appPrefix = appName.toUpperCase()
	const regex = new RegExp(`^${appPrefix}${separator}`, "g")

	return () => {
		const appKeys = Object.keys(process.env)
			.filter((key) => key.startsWith(`${appPrefix}${separator}`))
			.map((key) => [
				key
					.replace(regex, "")
					.split(separator as string)
					.map(camelCase)
					.join("."),
				process.env[key],
			])
			.reduce((acc, [key, value]) => set(acc, key as string, value), {})

		set(appKeys, "env", process.env["NODE_ENV"])

		return appKeys
	}
}

interface FileLoaderOpts {
	readonly targetDir?: string
}

export function fileLoader(opts: FileLoaderOpts) {
	const targetPath = path.join(
		process.cwd(),
		opts.targetDir || DEFAULT_CONFIG_DIR
	)
	if (!fs.existsSync(targetPath)) {
		throw new Error(`Config directory not found: ${targetPath}`)
	}

	const cfgFiles = [
		"default.application.json",
		"application.json",
		process.env["APPLICATION_CONFIG"] as string,
	].filter(Boolean)

	return () =>
		cfgFiles
			.map((filename) =>
				path.isAbsolute(filename)
					? filename
					: path.join(targetPath, filename)
			)
			.filter((filepath) => fs.existsSync(filepath))
			.reduce((cfg, filepath) => {
				const content = JSON.parse(fs.readFileSync(filepath).toString())

				return Object.assign({}, cfg, content)
			}, {})
}

export type ConfigSchema<T> = JTDDataType<T>

export function config<T extends AnySchema>(
	schema: T,
	opts: EnvLoaderOpts & FileLoaderOpts
): ConfigSchema<T> {
	const conf = [fileLoader(opts), envLoader(opts)]
		.map((loader) => loader())
		.reduce(merge, {})

	const ajv = new Ajv()
	const validate = ajv.compile(schema)

	if (!validate(conf)) {
		throw new Error(
			`config validation error: ${JSON.stringify(validate.errors)}`
		)
	}

	return Object.freeze(conf) as ConfigSchema<T>
}
