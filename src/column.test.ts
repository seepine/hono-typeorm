import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import {
  createTypeormMiddleware,
  PrimaryColumn,
  CreateAtColumn,
  setUserIdGlobalColumn,
  UpdateAtColumn,
  setPrimaryGlobalColumn,
  CreateIdColumn,
  UpdateIdColumn,
} from './index'
import { Column, Entity, type DataSource } from 'typeorm'

@Entity('sys_user')
export class User {
  // 使用自定义主键注解，例如雪花id生成策略
  @PrimaryColumn()
  id: string

  @Column('varchar', { length: 100 })
  name: string

  // 使用自定义创建时间注解
  @CreateAtColumn()
  createAt: Date

  // 使用自定义创建用户ID注解
  @CreateIdColumn()
  createId: string

  @UpdateAtColumn()
  updateAt: Date

  @UpdateIdColumn()
  updateId: string
}

declare global {
  var orm: DataSource
}

describe('CustomColumn', async () => {
  let id = 1
  // 使用 hono-typeorm 的 @PrimaryColumn 自定义主键生成策略，例如使用雪花id
  setPrimaryGlobalColumn({
    transformer: {
      generate: () => {
        return `id_${id++}`
      },
    },
  })
  // 使用 hono-typeorm 的 @CreateIdColumn 自定义用户ID策略，例如从上下文获取当前用户ID
  setUserIdGlobalColumn({
    transformer: {
      generate: (): any => {
        return `uid_0`
      },
    },
  })

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

  app.get('/user/add', async c => {
    const user = await c.var.orm.manager.save(User, { name: 'Alice' })
    return c.json(user)
  })
  app.get('/user/update', async c => {
    const repo = c.var.orm.getRepository(User)
    let user = await repo.findOneBy({ name: 'Alice' })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    await new Promise(resolve => setTimeout(resolve, 250)) // 延迟，确保updateAt有变化
    await repo.update(user.id, { name: 'Bob' })
    user = await repo.findOneBy({ id: user.id })
    return c.json(user)
  })
  app.get('/user/list', async c => {
    return c.json(await c.var.orm.manager.find(User))
  })
  it('Add', async () => {
    const req = new Request('http://localhost/user/add')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp = await res.json()
    // {
    //   name: 'Alice',
    //   createAt: '2025-12-03T12:54:21.014Z',
    //   createId: 'uid_0',
    //   updateAt: '2025-12-03T12:54:21.014Z',
    //   updateId: 'uid_0',
    //   id: 'id_1'
    // }
    expect(resp).toBeTypeOf('object')
    expect(resp.name).toBe('Alice')
    expect(resp.createId).toBe('uid_0')
  })
  it('Update', async () => {
    const req = new Request('http://localhost/user/update')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp = await res.json()
    // {
    //   id: 'id_1',
    //   name: 'Bob',
    //   createAt: '2025-12-03T12:56:00.991Z',
    //   createId: 'uid_0',
    //   updateAt: '2025-12-03T12:56:03.510Z',
    //   updateId: 'uid_0'
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
    const resp = await res.json()
    // [ { id: '84a68b70-3e3b-4d9f-82d3-2e5dcca9b0b9', name: 'Bob' } ]
    expect(resp).toBeTypeOf('object')
    expect(resp[0].name).toBe('Bob')
  })
})
