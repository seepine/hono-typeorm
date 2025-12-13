import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { Column, Entity, type ColumnOptions, type DataSource } from 'typeorm'
import { buildColumn, createTypeormMiddleware } from './index'

let id = 0

// 自定义主键装饰器
export function PrimarySnowflakeColumn(
  options?: ColumnOptions,
): PropertyDecorator {
  return buildColumn({
    generateTrigger: 'create',
    generate: (): any => {
      // 这里可以实现自定义主键生成逻辑，例如使用雪花id等
      return `id_${id++}`
    },
    columnOptions: {
      type: 'varchar',
      length: 50,
      primary: true,
      ...options,
    },
  })
}

export function CreateAtColumn(options?: ColumnOptions): PropertyDecorator {
  return buildColumn({
    generateTrigger: 'create',
    generate: () => new Date(),
    transformer: {
      to: (value: Date): string | undefined => {
        return value?.toISOString()
      },
      from: (dbValue: string): Date | undefined => {
        return dbValue ? new Date(dbValue) : undefined
      },
    },
    columnOptions: {
      type: 'varchar',
      length: 36,
      ...options,
    },
  })
}

export function UpdateAtColumn(options?: ColumnOptions): PropertyDecorator {
  return buildColumn({
    generateTrigger: 'createAndUpdate',
    generate: () => new Date(),
    transformer: {
      to: (value: Date): string | undefined => {
        return value?.toISOString()
      },
      from: (dbValue: string): Date | undefined => {
        return dbValue ? new Date(dbValue) : undefined
      },
    },
    columnOptions: {
      type: 'varchar',
      length: 36,
      ...options,
    },
  })
}

@Entity('sys_user')
export class User {
  // 使用自定义主键注解，例如雪花id生成策略
  @PrimarySnowflakeColumn()
  id: string

  @Column('varchar')
  name: string

  @CreateAtColumn()
  createAt: Date

  @UpdateAtColumn()
  updateAt: Date
}

declare global {
  var orm: DataSource
}

describe('CustomColumn', async () => {
  const app = new Hono()
  const { orm, typeormMiddleware } = createTypeormMiddleware({
    type: 'better-sqlite3',
    url: ':memory:',
    synchronize: true,
    entities: [User],
  })
  app.use(typeormMiddleware)
  // you can also set globally
  globalThis.orm = orm
  await orm.initialize()

  app.get('/user/add', async (c) => {
    const user = await c.var.orm.manager.save(User, { name: 'Alice' })
    return c.json(user)
  })
  app.get('/user/update', async (c) => {
    const repo = c.var.orm.getRepository(User)
    let user = await repo.findOneBy({ name: 'Alice' })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    await new Promise((resolve) => setTimeout(resolve, 250)) // 延迟，确保updateAt有变化
    await repo.update(user.id, { name: 'Bob' })
    user = await repo.findOneBy({ id: user.id })
    return c.json(user)
  })
  app.get('/user/list', async (c) => {
    return c.json(await c.var.orm.manager.find(User))
  })

  it('Add', async () => {
    const req = new Request('http://localhost/user/add')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp: User = await res.json()
    // {
    //   id: 'id_1',
    //   name: 'Alice',
    //   createAt: '2025-12-03T14:30:35.372Z',
    //   updateAt: '2025-12-03T14:30:35.372Z'
    // }
    expect(resp).toBeTypeOf('object')
    expect(resp.name).toBe('Alice')
    expect(resp.id).toBe('id_1')
  })

  it('Update', async () => {
    const req = new Request('http://localhost/user/update')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp: User = await res.json()
    // {
    //   id: 'id_1',
    //   name: 'Bob',
    //   createAt: '2025-12-03T14:31:09.386Z',
    //   updateAt: '2025-12-03T14:31:09.651Z'
    // }
    expect(resp).toBeTypeOf('object')
    expect(resp.name).toBe('Bob')
    expect(resp.updateAt).not.toBe(resp.createAt)
  })

  it('List', async () => {
    const req = new Request('http://localhost/user/list')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp: User[] = await res.json()
    // [ { id: 'id_1', name: 'Bob' } ]
    expect(resp).toBeTypeOf('object')
    expect(resp[0].name).toBe('Bob')
    expect(resp[0].updateAt).not.toBe(resp[0].createAt)
  })
})
