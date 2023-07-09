# @dumpstate/config

File and env configuration loader.

## Install

Install package:

```sh
npm install @dumpstate/config --save
```

## Conventions

Module loads the configuration from:

1. `default.application.json` file under specified directory - `./config/` folder of a current working directory by default,
2. `application.json` file under specified directory - `./config/` folder of a current working directory by default,
3. `*.json` file which path is provided as `APPLICATION_CONFIG` environment variable,
4. environment - all environment variable prefixed with `${APP_NAME}${SEPARATOR}` where `APP_NAME` is your applicaiton prefix, e.g. `FOO` and `SEPARATOR` is configured env name separator, `__` by default.

All the configuration is validated with [ajv](https://github.com/ajv-validator/ajv). The schema of the config is expected to be defined with [JSON TypeDef](https://jsontypedef.com/).

## Usage

1. Define your schema with [JSON TypeDef](https://jsontypedef.com/).

```ts
const ConfigSchema = {
	properties: {
		db: {
			properties: {
				host: { type: "string" },
				port: { type: "int32" },
			},
		},
	},
} as const
```

2. Load the config.

```ts
import { loadConfig } from "@dumpstate/config"

const config = loadConfig(ConfigSchema, { appName: "foo" })
```

Note the config type is derived from the JSON TypeDef. `config` object is guaranteed to follow the schema declaration thanks to `ajv`.

In case you'd like to pass config reference around, declare the config type:

```ts
import { ConfigSchemaType } from "@dumpstate/config"

type Config = ConfigSchemaType<typeof ConfigSchema>
```

### API

```ts
loadConfig(schema, opts)
```

where:

-   `schema` - JSON object of [JSON TypeDef](https://jsontypedef.com/) schema,
-   `opts` - JSON object containing the following parameters:
    -   `appName` - the name of the application - required as prefix for environment loader (the name is being snake and upper cased),
    -   `separator` - separator of environment variable - `__` by default,
    -   `targetDir` - target directory of the file loader - `${CWD}/config/` by default,
    -   `configPath` - path to configuration file; could be provided as `APPLICATION_CONFIG` environment variable instead; null by default.
