import 'reflect-metadata'
import { createMiddleware } from 'hono/factory'
import { DataSource, EntitySchema, type LoggerOptions, type MixedList } from 'typeorm'
import { AutoFillValueSubscriber } from './columns'

export * from './columns'

export type TypeormOpts = {
  /**
   * 数据库类型，必须设置值
   *
   * @default env['DATABASE_TYPE'] || undefined
   */
  type?: 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'better-sqlite3' | 'mongodb' | string
  /**
   * 连接url，例如postgres或mysql使用链接，sqlite使用文件路径
   *
   * @example postgresql://user:password@localhost:5432/mydatabase?connect_timeout=10&sslmode=require
   * @example ./mysqlite.db
   * @default env['DATABASE_URL'] || undefined
   */
  url?: string
  /**
   * Auto-create database schema
   *
   * 自动创建数据库结构
   *
   * @default env['DATABASE_SYNCHRONIZE'] || false
   */
  synchronize?: boolean
  /**
   * 连接驱动
   */
  driver?: any
  /**
   * Log level
   *
   * 日志级别
   *
   * @default of ['error', 'warn']
   */
  logLevel?: LoggerOptions
  /**
   * Entities
   *
   * 实体列表
   */
  entities?: MixedList<Function | string | EntitySchema>
  /**
   * Subscribers
   *
   * 订阅者列表
   */
  subscribers?: Array<Function | string>
}

const getDataSourceInstance = (opts?: TypeormOpts) => {
  const { env = {} } = process || {}

  const config = Object.assign(
    {
      type: env['DATABASE_TYPE'] || undefined,
      url: env['DATABASE_URL'] || undefined,
      synchronize: env['DATABASE_SYNCHRONIZE'] === 'true' || false,
    } as TypeormOpts,
    opts || {},
  )

  const subscribers: MixedList<Function | string> = [AutoFillValueSubscriber]
  if (Array.isArray(config.subscribers)) {
    subscribers.push(...config.subscribers)
  }
  if (config.type === undefined) {
    if (config.url?.startsWith('postgresql://')) {
      config.type = 'postgres'
    } else if (config.url?.startsWith('mysql://')) {
      config.type = 'mysql'
    } else if (config.url?.startsWith('sqlite:')) {
      config.type = 'sqlite'
      config.url = config.url.substring(7)
    } else if (config.url?.startsWith('better-sqlite3:')) {
      config.type = 'better-sqlite3'
      config.url = config.url.substring(15)
    } else if (config.url?.startsWith('file:')) {
      config.type = 'sqlite'
      config.url = config.url.substring(5)
    }
  }

  const datasource = new DataSource({
    type: config.type as any,
    url: config.url,
    database: config.type === 'sqlite' || config.type === 'better-sqlite3' ? config.url : undefined,
    driver: config.driver,
    synchronize: config.synchronize,
    logging: config.logLevel ?? ['error', 'warn'],
    entities: config.entities,
    subscribers,
  })
  return datasource
}

export const createTypeormMiddleware = (opts?: TypeormOpts | DataSource) => {
  let inst: DataSource
  if (opts instanceof DataSource) {
    inst = opts
    inst.setOptions({
      subscribers: [
        AutoFillValueSubscriber,
        ...(Array.isArray(inst.options.subscribers) ? inst.options.subscribers : []),
      ],
    })
  } else {
    inst = getDataSourceInstance({
      ...opts,
      subscribers: [...(opts?.subscribers || [])],
    })
  }

  const typeormMiddleware = createMiddleware(async (c, next) => {
    c.set('orm', inst)
    await next()
  })

  return {
    orm: inst,
    typeormMiddleware,
  }
}

declare module 'hono' {
  interface ContextVariableMap {
    orm: DataSource
  }
}
