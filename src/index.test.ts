import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createTypeormMiddleware } from './index'
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  type DataSource,
} from 'typeorm'

@Entity('sys_user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: number

  @Column('varchar', { length: 100 })
  name: string
}

declare global {
  var orm: DataSource
}

describe('Base', async () => {
  const app = new Hono()
  const { orm, typeormMiddleware } = createTypeormMiddleware({
    type: 'better-sqlite3',
    url: ':memory:',
    // 或者
    // url: 'better-sqlite3::memory:',
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
  app.get('/user/list', async (c) => {
    return c.json(await c.var.orm.manager.find(User))
  })
  it('Add', async () => {
    const req = new Request('http://localhost/user/add')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp = await res.json()
    // { name: 'Alice', id: '6535b9d3-9de1-4db1-b385-db194bc4a38f' }
    expect(resp).toBeTypeOf('object')
    expect(resp.name).toBe('Alice')
  })
  it('List', async () => {
    const req = new Request('http://localhost/user/list')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const resp = await res.json()
    // [ { id: '84a68b70-3e3b-4d9f-82d3-2e5dcca9b0b9', name: 'Bob' } ]
    expect(resp).toBeTypeOf('object')
    expect(resp[0].name).toBe('Alice')
  })
})
