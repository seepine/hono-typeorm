import {
  EventSubscriber,
  getMetadataArgsStorage,
  type ColumnOptions,
  type ColumnType,
  type EntitySubscriberInterface,
  type InsertEvent,
  type LoadEvent,
  type UpdateEvent,
} from 'typeorm'
import type { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs.js'

type CustomTransformer = {
  generate: () => any
  to: (v?: any) => any | undefined
  from: (d?: any) => any | undefined
}
type CustomColumn = {
  type: ColumnType
  length: number
  transformer: CustomTransformer
}
type CustomTransformerType =
  | 'createAtColumn'
  | 'updateAtColumn'
  | 'primaryColumn'
  | 'createIdColumn'
  | 'updateIdColumn'
type CustomTransformerWithType = CustomTransformer & { type: CustomTransformerType }

let timeGlobalColumn: CustomColumn = {
  type: 'varchar',
  length: 50,
  transformer: {
    generate: (): any => {
      return new Date()
    },
    to: (v?: any): string | undefined => {
      if (!(v instanceof Date)) {
        return undefined
      }
      return v.toISOString()
    },
    from: (d?: string): any | undefined => {
      return d ? new Date(d) : undefined
    },
  },
}
export function setTimeGlobalColumn(custom: Partial<CustomColumn>) {
  if (custom.transformer !== undefined) {
    timeGlobalColumn.transformer = custom.transformer
  }
  if (custom.type !== undefined) {
    timeGlobalColumn.type = custom.type
  }
  if (custom.length !== undefined) {
    timeGlobalColumn.length = custom.length
  }
}

export function CreateAtColumn(options?: ColumnOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        type: timeGlobalColumn.type,
        length: timeGlobalColumn.length,
        transformer: {
          type: 'createAtColumn',
          generate: (): any => {
            return timeGlobalColumn.transformer.generate()
          },
          to: timeGlobalColumn.transformer.to
            ? (v?: any): string | undefined => {
                return timeGlobalColumn.transformer.to(v)
              }
            : undefined,
          from: (d?: string): any | undefined => {
            return timeGlobalColumn.transformer.from(d)
          },
        },
        ...options,
      } as ColumnOptions,
    } as ColumnMetadataArgs)
  } as any
}

export function UpdateAtColumn(options?: ColumnOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        type: timeGlobalColumn.type,
        length: timeGlobalColumn.length,
        transformer: {
          type: 'updateAtColumn',
          generate: (): any => {
            return timeGlobalColumn.transformer.generate()
          },
          to: (v?: any): string | undefined => {
            return timeGlobalColumn.transformer.to(v)
          },
          from: (d?: string): any | undefined => {
            return timeGlobalColumn.transformer.from(d)
          },
        },
        ...options,
      } as ColumnOptions,
    } as ColumnMetadataArgs)
  } as any
}

let primaryGlobalColumn: CustomColumn = {
  type: 'varchar',
  length: 36,
  transformer: {
    generate: (): any => {
      throw new Error('Not implemented, please setPrimaryGlobalColumn first')
    },
    to: (v?: any): string | undefined => {
      return v
    },
    from: (d?: string): any | undefined => {
      return d
    },
  },
}

export function setPrimaryGlobalColumn(
  custom: Partial<Omit<CustomColumn, 'transformer'> & { transformer: Partial<CustomTransformer> }>,
) {
  if (custom.transformer !== undefined) {
    if (custom.transformer.generate !== undefined) {
      primaryGlobalColumn.transformer.generate = custom.transformer.generate
    }
    if (custom.transformer.to !== undefined) {
      primaryGlobalColumn.transformer.to = custom.transformer.to
    }
    if (custom.transformer.from !== undefined) {
      primaryGlobalColumn.transformer.from = custom.transformer.from
    }
  }
  if (custom.type !== undefined) {
    primaryGlobalColumn.type = custom.type
  }
  if (custom.length !== undefined) {
    primaryGlobalColumn.length = custom.length
  }
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        type: primaryGlobalColumn.type,
        length: primaryGlobalColumn.length,
        primary: true,
        transformer: {
          type: 'primaryColumn',
          generate: (): any => {
            return primaryGlobalColumn.transformer.generate()
          },
          to: (v?: any): string | undefined => {
            return primaryGlobalColumn.transformer.to(v)
          },
          from: (d?: string): any | undefined => {
            return primaryGlobalColumn.transformer.from(d)
          },
        },
        ...options,
      } as ColumnOptions,
    } as ColumnMetadataArgs)
  } as any
}

let userIdGlobalColumn: CustomColumn = {
  type: 'varchar',
  length: 36,
  transformer: {
    generate: (): any => {
      throw new Error('Not implemented, please userIdGlobalColumn first')
    },
    to: (v?: any): string | undefined => {
      return v
    },
    from: (d?: string): any | undefined => {
      return d
    },
  },
}

export function setUserIdGlobalColumn(
  custom: Partial<Omit<CustomColumn, 'transformer'> & { transformer: Partial<CustomTransformer> }>,
) {
  if (custom.transformer !== undefined) {
    if (custom.transformer.generate !== undefined) {
      userIdGlobalColumn.transformer.generate = custom.transformer.generate
    }
    if (custom.transformer.to !== undefined) {
      userIdGlobalColumn.transformer.to = custom.transformer.to
    }
    if (custom.transformer.from !== undefined) {
      userIdGlobalColumn.transformer.from = custom.transformer.from
    }
  }
  if (custom.type !== undefined) {
    userIdGlobalColumn.type = custom.type
  }
  if (custom.length !== undefined) {
    userIdGlobalColumn.length = custom.length
  }
}

export function CreateIdColumn(options?: ColumnOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        type: userIdGlobalColumn.type,
        length: userIdGlobalColumn.length,
        transformer: {
          type: 'createIdColumn',
          generate: (): any => {
            return userIdGlobalColumn.transformer.generate()
          },
          to: (v?: any): string | undefined => {
            return userIdGlobalColumn.transformer.to(v)
          },
          from: (d?: string): any | undefined => {
            return userIdGlobalColumn.transformer.from(d)
          },
        },
        ...options,
      } as ColumnOptions,
    } as ColumnMetadataArgs)
  } as any
}

export function UpdateIdColumn(options?: ColumnOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        type: userIdGlobalColumn.type,
        length: userIdGlobalColumn.length,
        transformer: {
          type: 'updateIdColumn',
          generate: (): any => {
            return userIdGlobalColumn.transformer.generate()
          },
          to: (v?: any): string | undefined => {
            return userIdGlobalColumn.transformer.to(v)
          },
          from: (d?: string): any | undefined => {
            return userIdGlobalColumn.transformer.from(d)
          },
        },
        ...options,
      } as ColumnOptions,
    } as ColumnMetadataArgs)
  } as any
}
const getCustomTransformer = (transformer: any): CustomTransformerWithType | undefined => {
  if (transformer === undefined) {
    return undefined
  }
  if (Array.isArray(transformer)) {
    return undefined
  }
  if (transformer.type === undefined) {
    return undefined
  }
  return transformer
}

/**
 * 自动填充字段值订阅者
 */
@EventSubscriber()
export class AutoFillValueSubscriber implements EntitySubscriberInterface {
  /**
   * 插入前
   * @param event
   */
  async beforeInsert(event: InsertEvent<any>) {
    // 处理craeteInfo
    for await (const item of event.metadata.columns) {
      if (event.entity[item.propertyName] !== undefined) {
        continue
      }
      const customTransformer = getCustomTransformer(item.transformer)
      if (customTransformer === undefined) {
        continue
      }
      const customType = customTransformer.type
      if (
        customType === 'createAtColumn' ||
        customType === 'updateAtColumn' ||
        customType === 'createIdColumn' ||
        customType === 'updateIdColumn'
      ) {
        event.entity[item.propertyName] = customTransformer.generate()
      }
    }
    // 处理主键
    for await (const item of event.metadata.primaryColumns) {
      if (event.entity[item.propertyName] !== undefined) {
        continue
      }
      const customTransformer = getCustomTransformer(item.transformer)
      if (customTransformer === undefined) {
        continue
      }
      if (customTransformer.type === 'primaryColumn') {
        event.entity[item.propertyName] = customTransformer.generate()
      }
    }
    return event
  }
  /**
   * 更新前
   * @param event
   */
  async beforeUpdate?(event: UpdateEvent<any>) {
    // 处理updateInfo
    for await (const item of event.metadata.columns) {
      if (event.entity === undefined) {
        continue
      }
      if (event.entity[item.propertyName] !== undefined) {
        continue
      }
      const customTransformer = getCustomTransformer(item.transformer)
      if (customTransformer === undefined) {
        continue
      }
      const customType = customTransformer.type
      if (customType === 'updateAtColumn' || customType === 'updateIdColumn') {
        event.entity[item.propertyName] = customTransformer.generate()
      }
    }
  }

  // 查询后，处理时间时区
  async afterLoad(entity: any, event?: LoadEvent<any>) {
    if (event === undefined) {
      return
    }
    for await (const item of event.metadata.columns) {
      if (entity[item.propertyName] === undefined) {
        continue
      }
      // try {
      //   if (isDayjs(entity[item.propertyName])) {
      //     entity[item.propertyName] = fastify.dayjs(entity[item.propertyName])
      //   }
      // } catch (e) {}
    }
  }
}
