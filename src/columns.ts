import {
  EventSubscriber,
  getMetadataArgsStorage,
  type ColumnOptions,
  type EntitySubscriberInterface,
  type InsertEvent,
  type LoadEvent,
  type UpdateEvent,
  type ValueTransformer,
} from 'typeorm'
import type { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs.js'
import type { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata.js'

type GenerateType = {
  /**
   * 触发时机
   */
  generateTrigger?: 'create' | 'update' | 'createAndUpdate'
  /**
   * 生成逻辑
   * @returns 值
   */
  generate?: (meta: ColumnMetadata) => any
}

type BuildColumnOptions = GenerateType & {
  /**
   * 值转换为数据库存储格式
   *
   * to 为对象值转为数据库值，from 为数据库值转为对象值
   * @example
   * ```ts
   * transformer:{
   *   to: (value:any): string | undefined =>{
   *     return value?.toISOString()
   *   },
   *   from: (dbValue:string): any | undefined=>{
   *     return dbValue ? new Date(dbValue) : undefined
   *   }
   * }
   * ```
   */
  transformer?: ValueTransformer
  /**
   * 其他列选项，例如可以在定义装饰器时指定字段类型、长度等
   */
  columnOptions?: Omit<ColumnOptions, 'transformer'>
}

/**
 * 构建列装饰器
 *
 * @example
 * ```ts
 * export function CreateAtColumn(options?: ColumnOptions): PropertyDecorator {
 *   return buildColumn({
 *     generateTrigger: 'create',
 *     generate: (): any => {
 *       return dayjs()
 *     },
 *     transformer: {
 *       to: (value: Dayjs): string | undefined =>{
 *         return value?.toISOString()
 *       },
 *       from: (dbValue: string): Dayjs | undefined=>{
 *         return dbValue ? dayjs(dbValue) : undefined
 *       }
 *     },
 *     columnOptions: {
 *       type: 'varchar',
 *       length: 36,
 *       ...options
 *     },
 *   })
 * }
 * ```
 */
export const buildColumn = (opts: BuildColumnOptions): PropertyDecorator => {
  if (opts.generateTrigger !== undefined) {
    if (opts.generate === undefined) {
      throw new Error('generate is required when generateTrigger is set')
    }
  }
  if (opts.generate !== undefined) {
    if (opts.generateTrigger === undefined) {
      throw new Error('generateTrigger is required when generate is set')
    }
  }
  return function (object: Object, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        transformer: {
          generateTrigger: opts.generateTrigger,
          generate: opts.generate,
          to: (val) => {
            return opts.transformer?.to ? opts.transformer?.to(val) : val
          },
          from: (dbVal) => {
            return opts.transformer?.from
              ? opts.transformer?.from(dbVal)
              : dbVal
          },
        } as ValueTransformer,
        ...opts.columnOptions,
      },
    } as ColumnMetadataArgs)
  } as any
}

const getGenerator = (transformer: any): GenerateType | undefined => {
  if (transformer === undefined) {
    return undefined
  }
  if (Array.isArray(transformer)) {
    return undefined
  }
  if (transformer.generateTrigger === undefined) {
    return undefined
  }
  if (transformer.generate === undefined) {
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
      const generator = getGenerator(item.transformer)
      if (generator === undefined) {
        continue
      }
      if (
        generator.generateTrigger === 'create' ||
        generator.generateTrigger === 'createAndUpdate'
      ) {
        event.entity[item.propertyName] = generator.generate?.(item)
      }
    }
    // 处理主键
    for await (const item of event.metadata.primaryColumns) {
      const generator = getGenerator(item.transformer)
      if (generator === undefined) {
        continue
      }
      if (
        generator.generateTrigger === 'create' ||
        generator.generateTrigger === 'createAndUpdate'
      ) {
        event.entity[item.propertyName] = generator.generate?.(item)
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
      const generator = getGenerator(item.transformer)
      if (generator === undefined) {
        continue
      }
      if (
        generator.generateTrigger === 'update' ||
        generator.generateTrigger === 'createAndUpdate'
      ) {
        event.entity[item.propertyName] = generator.generate?.(item)
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
      //     entity[item.propertyName] = dayjs(entity[item.propertyName])
      //   }
      // } catch (e) {}
    }
  }
}
