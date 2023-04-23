import fs from "fs"
import path from "path"

import { camelCase, get, isEmpty, merge, set, upperCase } from "lodash"
import Ajv, { AnySchema, JTDDataType } from "ajv/dist/jtd"

const DEFAULT_SEPARATOR = "__"
const DEFAULT_CONFIG_DIR = "config"

interface EnvLoaderOpts {
	readonly appName?: string
	readonly separator?: string
}

export function envLoader(opts: EnvLoaderOpts | null = null): () => any {
	function getValue(value: any) {
		if (value === "true") {
			return true
		}
		if (value === "false") {
			return false
		}

		const parsed = parseInt(value)
		if (!isNaN(parsed)) {
			return parsed
		}

		return value
	}

	return () => {
		let appKeys = {}

		if (!isEmpty(get(opts, "appName"))) {
			const appPrefix = get(opts, "appName", "")
				.split("-")
				.map(upperCase)
				.join("_")
			const separator = get(opts, "separator", DEFAULT_SEPARATOR)
			const regex = new RegExp(`^${appPrefix}${separator}`, "g")

			appKeys = Object.keys(process.env)
				.filter((key) => key.startsWith(`${appPrefix}${separator}`))
				.map((key) => [
					key
						.replace(regex, "")
						.split(separator)
						.map(camelCase)
						.join("."),
					process.env[key],
				])
				.reduce(
					(acc, [key, value]) =>
						set(acc, key as string, getValue(value)),
					{}
				)
		}

		return appKeys
	}
}

interface FileLoaderOpts {
	readonly targetDir?: string
	readonly configPath?: string
}

export function fileLoader(opts: FileLoaderOpts | null = null): () => any {
	const targetPath =
		opts && opts.targetDir
			? opts.targetDir
			: path.join(process.cwd(), DEFAULT_CONFIG_DIR)

	const cfgFiles = [
		"default.application.json",
		"application.json",
		(opts && opts.configPath) ||
			(process.env["APPLICATION_CONFIG"] as string),
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

				return merge(cfg, content)
			}, {})
}

export type ConfigSchemaType<T> = JTDDataType<T>

export function loadConfig<T extends AnySchema>(
	schema: T,
	opts: (EnvLoaderOpts & FileLoaderOpts) | null = null
): ConfigSchemaType<T> {
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

	return Object.freeze(conf) as ConfigSchemaType<T>
}
