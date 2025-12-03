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

## 自定义字段

实际业务中，我们经常会需要字段自动生成，例如主键使用分布式雪花id，时间字段自动生成，创建者id字段自动从上下文获取当前用户id，本文以自定义主键场景为例，介绍如何自定义装饰器和生成逻辑

### 1. 创建装饰器

```ts
import { buildColumn } from '@seepine/hono-typeorm'

export function PrimarySnowflakeColumn(options?: ColumnOptions): PropertyDecorator {
  return buildColumn({
    // 指定仅在创建时生成，若需要新增和更新都生成值，可改为 createAndUpdate
    generateTrigger: 'create',
    // 实现生成逻辑，例如使用雪花算法生成id
    generate: (): any => {
      return `id_${id++}`
    },
    // 这里指定默认的字段配置
    columnOptions: {
      type: 'varchar',
      length: 50,
      primary: true, // 注意，若是主键装饰器，必须要此配置
      ...options,
    },
  })
}
```

### 2. 使用

在需要的字段上使用，则在新增时会按照 generate 方法自动生成id，当然若在新增时，手动赋值，则会以赋值为主

```ts
@Entity('sys_user')
export class User {
  // 使用自定义主键注解，例如雪花id生成策略
  @PrimarySnowflakeColumn()
  id: string
}
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
