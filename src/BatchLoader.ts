import Dataloader from 'dataloader'
import type { GraphQLResolveInfo } from 'graphql'
import type { Knex } from 'knex'
import type { SelectionFilter } from './SelectionFilter'
import { createHasManyLoaderWithPage } from './loaders/createHasManyLoaderWithPage'
import { createHasManyLoader } from './loaders/createHasManyLoader'
import { createHasManyThroughLoaderWithPage } from './loaders/createHasManyThroughLoaderWithPage'
import { createManyToManyLoader } from './loaders/createManyToManyLoader'
import { createManyToManyLoaderWithPage } from './loaders/createManyToManyLoaderWithPage'
import { createHasManyThroughLoader } from './loaders/createHasManyThroughLoader'
import { createBelongsToLoader } from './loaders/createBelongsToLoader'

export type SimplePagenatorArgs = {
  limit: number
  offset: number
}

export type OrderByType = 'ASC' | 'DESC' | 'asc' | 'desc'

/**
 * LoaderType represents how to load relationships.
 *
 * - `hasMany` 1:n relationship
 * - `belongsTo` n:1 relationship
 * - `hasManyThrough` 1:n relationship through an intermeidate table
 */
export type LoaderType =
  | 'hasMany'
  | 'hasManyThrough'
  | 'belongsTo'
  | 'manyToMany'

export interface GetLoaderProps {
  /**
   * LoaderType represents how to load relationships.
   */
  type: LoaderType

  /**
   * Target table to load relations from.
   *
   * @example `targetTable: 'users'`
   */
  targetTable: string

  /**
   * Foreign key of `targetTable`. By default, it points to `id`.
   *
   * @example `foreignKey: 'userId'`
   */
  foreignKey?: string

  /**
   * Foreign key of `targetTable`. By default, it points to `id`. Required for `hasManyThrough` relations.
   *
   * @example `join: { form: 'posts.userId', to: 'comments.postId' }
   */
  join?: {
    from: string
    to: string
  }

  /**
   * How to order the relations. Default to `id` ASC.
   *
   * @example `orderBy: ['createdAt', 'desc']`
   */
  orderBy?: [string, OrderByType | undefined]

  /**
   * Adds limit and offset to the relations. Default to nothing, meaning that loads all records of the relationship.
   *
   * @example `page: { limit: 20, offset: 60 }`
   */
  page?: SimplePagenatorArgs

  /**
   * Modify knex query after load.
   *
   * @example `queryModifier: query => query.select(knex.raw("count('id')")).groupBy('id')`
   */
  queryModifier?: (query: Knex.QueryBuilder) => void

  /**
   * If you pass `info` and call `useSelectionFilter` before resolving relationship, BatchLoader will reduce column selections on execution.
   */
  info?: GraphQLResolveInfo
}

export interface CreateLoaderProps extends GetLoaderProps {
  knex: Knex
  selectionFilter?: SelectionFilter
}

export class BatchLoader {
  private loaderMap = new Map<string, Dataloader<any, any>>()
  private selectionFilter?: SelectionFilter

  constructor(private knex: Knex) {}

  useSelectionFilter(selectionFilter: SelectionFilter) {
    this.selectionFilter = selectionFilter
    return this
  }

  getLoader({
    type,
    targetTable,
    foreignKey,
    join,
    page,
    queryModifier,
    orderBy,
    info,
  }: GetLoaderProps) {
    const key = [
      type,
      targetTable,
      foreignKey,
      orderBy?.[0],
      orderBy?.[1],
      page?.limit,
      page?.offset,
    ].join(':')
    const maybeLoader = this.loaderMap.get(key)
    if (maybeLoader) {
      return maybeLoader
    }
    const loader = createLoader({
      type,
      targetTable,
      foreignKey,
      join,
      page,
      queryModifier,
      orderBy,
      knex: this.knex,
      selectionFilter: this.selectionFilter,
      info,
    })
    this.loaderMap.set(key, loader)
    return loader
  }
}

function createLoader({
  type,
  targetTable,
  foreignKey,
  join,
  page,
  knex,
  queryModifier,
  orderBy = ['id', 'asc'],
  selectionFilter,
  info,
}: CreateLoaderProps) {
  const modifyQuery = (query: Knex.QueryBuilder) => {
    if (queryModifier) {
      queryModifier(query)
    }
    if (selectionFilter && info) {
      query.select(selectionFilter.reduce({ info, table: targetTable }))
    }
  }
  const [orderByColumn, orderByType = 'ASC'] = orderBy
  if (
    orderByType.toUpperCase() !== 'ASC' &&
    orderByType.toUpperCase() !== 'DESC'
  ) {
    throw new Error('[BatchLoader] That order by is not supported')
  }

  const commonProps = {
    targetTable,
    orderByColumn,
    orderByType,
    knex,
    modifyQuery,
  }

  switch (type) {
    case 'hasMany':
      if (!foreignKey) {
        throw new Error(
          '[BatchLoader] foreignKey is required when loading hasMany relationship.',
        )
      }
      if (page) {
        return createHasManyLoaderWithPage({
          ...commonProps,
          page,
          foreignKey,
        })
      } else {
        return createHasManyLoader({
          ...commonProps,
          foreignKey,
        })
      }
    case 'hasManyThrough':
      if (!join) {
        throw new Error('[BatchLoader] no `join` key found')
      }
      const [joinTable, joinColumn] = join.from.split('.')
      if (!joinTable || !joinColumn) {
        throw new Error('[BatchLoader] Invalid `from` key format')
      }
      if (page) {
        return createHasManyThroughLoaderWithPage({
          ...commonProps,
          page,
          join,
          joinColumn,
          joinTable,
        })
      } else {
        return createHasManyThroughLoader({
          ...commonProps,
          join,
          joinColumn,
          joinTable,
        })
      }
    case 'manyToMany': {
      if (!join) {
        throw new Error('[BatchLoader] no `join` key found')
      }
      const [joinTable, joinColumn] = join.from.split('.')
      if (!joinTable || !joinColumn) {
        throw new Error('[BatchLoader] Invalid `from` key format')
      }
      if (page) {
        return createManyToManyLoaderWithPage({
          ...commonProps,
          page,
          join,
          joinColumn,
          joinTable,
        })
      } else {
        return createManyToManyLoader({
          ...commonProps,
          join,
          joinColumn,
          joinTable,
        })
      }
    }
    case 'belongsTo':
      if (page) {
        throw new Error(
          '[BatchLoader] Do not add `page` option for relation type `belongsTo.`',
        )
      }
      return createBelongsToLoader({ ...commonProps })
  }
}
