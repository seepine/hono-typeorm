# hono-typeorm

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

基于 [Hono](https://hono.dev/) 的 TypeORM 数据库中间件。让你可以在 Hono 应用中便捷集成 TypeORM 。

## 快速使用

### 1. 安装

```bash
npm install @seepine/hono-typeorm typeorm

# 安装你所使用的数据库依赖
npm install pg
```

### 修改 tsconfig.json

```ts
{
  "compilerOptions": {
    // 添加 typeorm 所需配置
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
  }
}
```

### 2. 创建实体类

```ts
@Entity('sys_user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: number

  @Column('varchar', { length: 100 })
  name: string
}
```

### 3. 基本用法

```ts
import { Hono } from 'hono'
import { createTypeormMiddleware } from '@seepine/hono-typeorm'
import { User } from './entity/User'

const app = new Hono()
const { orm, typeormMiddleware } = createTypeormMiddleware({
  type: 'better-sqlite3',
  url: ':memory:',
  synchronize: true,
  entities: [User],
})
app.use(typeormMiddleware)
// 连接
await orm.initialize()

app.get('/users', async c => {
  const { manager } = c.var.orm
  const users = await manager.find(User)
  return c.json(users)
})
```

## 自定义注解

### 1. @CreateAtColumn & @UpdateAtColumn

声明，默认Date类型，若需要改成其他类型如Dayjs，需要通过 `setTimeGlobalColumn` 设置转换逻辑

```ts
import { CreateAtColumn, UpdateAtColumn } from '@seepine/hono-typeorm'

@Entity('sys_user')
export class User {
  // ...

  @CreateAtColumn()
  createAt: Dayjs

  @UpdateAtColumn()
  updateAt: Dayjs
}
```

设置生成逻辑（可选）

```ts
import { setTimeGlobalColumn } from '@seepine/hono-typeorm'

setTimeGlobalColumn({
  type: 'varchar', // 默认字符串
  length: 50, // 默认长度50
  // 设置日期生成和转换
  transformer: {
    generate: () => {
      return dayjs()
    },
    to: (v?: Dayjs): string | undefined => {
      if (!isDayjs(v)) {
        return undefined
      }
      return v.toISOString()
    },
    from: (d?: string): Dayjs | undefined => (d ? dayjs(d) : undefined),
  },
})
```

### 2. @PrimaryColumn

声明

```ts
import { PrimaryColumn } from '@seepine/hono-typeorm'

@Entity('sys_user')
export class User {
  // 使用自定义主键注解
  @PrimaryColumn()
  id: string
}
```

设置生成逻辑（必要）

```ts
import { setPrimaryGlobalColumn } from '@seepine/hono-typeorm'

setPrimaryGlobalColumn({
  type: 'varchar', // 默认字符串
  length: 36, // 默认长度36
  transformer: {
    // 必填，返回主键生成策略
    generate: () => {
      return `id_${id++}`
    },
  },
})
```

### 3. @CreateIdColumn & @UpdateIdColumn

声明

```ts
import { CreateIdColumn, UpdateIdColumn } from '@seepine/hono-typeorm'

@Entity('sys_user')
export class User {
  // ...

  @CreateIdColumn()
  createId: string

  @UpdateIdColumn()
  updateId: string
}
```

设置生成逻辑（必要）

```ts
import { setUserIdGlobalColumn } from '@seepine/hono-typeorm'

setUserIdGlobalColumn({
  type: 'varchar', // 默认字符串
  length: 36, // 默认长度36
  // 必填，设置日期生成和转换
  transformer: {
    generate: () => {
      // 例如从请求上下文获取当前用户信息
      // 如何在全局中获取上下文可参考 @seepine/hono-global-context
      return getCurrentContext().var.user.id
    },
  },
})
```

## 更多用法

### 1. 事务支持

```ts
app.post('/users', async c => {
  await c.var.orm.transaction(async manager => {
    // 在事务中进行数据库操作
    await manager.save(User, { name: 'Tom' })
    await manager.save(User, { name: 'Job' })
  })
  return c.text('ok')
})
```

### 2. 全局访问（可选）

```ts
declare global {
  var orm: DataSource
}
const { typeormMiddleware, orm } = createTypeormMiddleware({
  type: 'better-sqlite3',
  url: ':memory:',
  synchronize: true,
  entities: [User],
})
app.use(typeormMiddleware)
globalThis.orm = orm

// 在任何地方获取 EntityManager
const manager = globalThis.orm.manager
```

### 3. 更多

更多用法参考 typeorm 官方文档即可

## 配置选项

### `TypeormOpts`

常用配置如下，更多请参考 [TypeORM 官方文档](https://typeorm.io/data-source-options)：

| 选项          | 类型                                      | 说明                                                              |
| ------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `type`        | `string`                                  | 数据库类型，如 'postgres'、'mysql'、'sqlite'、'better-sqlite3' 等 |
| `url`         | `string`                                  | 连接 URL 或文件路径                                               |
| `synchronize` | `boolean`                                 | 是否自动同步表结构                                                |
| `logLevel`    | `LoggerOptions`                           | 日志级别，默认 ['error', 'warn']                                  |
| `entities`    | `MixedList<Function/string/EntitySchema>` | 实体列表，如 `src/entity/*.ts`                                    |
| `subscribers` | `Array<Function/string>`                  | 订阅者列表                                                        |

### 自定义 DataSource

若配置选项不满足，可直接自定义数据源传入

```ts
const datasource = new DataSource({
  type: 'postgres',
  url: 'postgresql://myusername:mypassword@localhost:5432/mydatabase',
  synchronize: true,
  logging: ['error', 'warn'],
  entities: [User],
  subscribers: [],
})
const { orm, typeormMiddleware } = createTypeormMiddleware(datasource)
```

## 示例

### PostgreSQL

```ts
const { orm, typeormMiddleware } = createTypeormMiddleware({
  type: 'postgres',
  url: 'postgresql://myusername:mypassword@localhost:5432/mydatabase',
  synchronize: true,
  entities: [User],
})
```

### MySQL

```ts
const { orm, typeormMiddleware } = createTypeormMiddleware({
  type: 'mysql',
  url: 'mysql://myusername:mypassword@localhost:3306/mydatabase',
  synchronize: true,
  entities: [User],
})
```

### Better-Sqlite3

```ts
const { orm, typeormMiddleware } = createTypeormMiddleware({
  type: 'better-sqlite3',
  url: './data.db', // 文件路径或内存 ':memory:'
  synchronize: true,
  entities: [User],
})
```

<!-- Refs -->

[npm-version-src]: https://img.shields.io/npm/v/@seepine/hono-typeorm
[npm-version-href]: https://www.npmjs.com/package/@seepine/hono-typeorm
[npm-downloads-src]: https://img.shields.io/npm/dm/@seepine/hono-typeorm
[npm-downloads-href]: https://npmjs.com/package/@seepine/hono-typeorm
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@seepine/hono-typeorm
[bundle-href]: https://bundlephobia.com/result?p=@seepine/hono-typeorm
[license-src]: https://img.shields.io/github/license/seepine/hono-typeorm.svg
[license-href]: https://github.com/seepine/hono-typeorm/blob/main/LICENSE
