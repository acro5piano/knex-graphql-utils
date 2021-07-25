import Dataloader from 'dataloader'
import type { GraphQLResolveInfo } from 'graphql'
import type { Knex } from 'knex'
import type { SelectionFilter } from './SelectionFilter'

export type SimplePagenatorArgs = {
  limit: number
  offset: number
}

type LoaderType = 'hasMany' | 'hasManyThrough' | 'belongsTo'

interface GetLoaderProps {
  type: LoaderType
  targetTable: string
  foreignKey?: string
  join?: {
    from: string
    to: string
  }
  orderBy?: [string, string | undefined]
  page?: SimplePagenatorArgs
  queryModifier?: (query: Knex.QueryBuilder) => void
  info?: GraphQLResolveInfo
}

interface CreateLoaderProps extends GetLoaderProps {
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
    foreignKey = 'id',
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
    if (type === 'belongsTo' && page) {
      throw new Error(
        '[BatchLoader] Do not add `page` option for relation type `belongsTo.`',
      )
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
  foreignKey = 'id',
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

  switch (type) {
    case 'hasMany':
      if (page) {
        return new Dataloader((ids: readonly string[]) => {
          const query = knex(
            knex(targetTable)
              .select('*')
              .rowNumber(
                'relation_index',
                knex.raw(`partition by ?? order by ?? ${orderByType}`, [
                  foreignKey,
                  orderByColumn,
                ]),
              )
              .whereIn(foreignKey, ids)
              .as('_t'),
          ).whereBetween(knex.ref('relation_index') as any, [
            page.offset,
            page.offset + page.limit,
          ])
          modifyQuery(query)
          return query.then((rows) =>
            ids.map((id) => rows.filter((row) => row[foreignKey] === id)),
          )
        })
      } else {
        return new Dataloader((ids: readonly string[]) => {
          const query = knex(targetTable)
            .whereIn(foreignKey, ids)
            .orderBy(orderByColumn, orderByType)
          modifyQuery(query)
          return query.then((rows) =>
            ids.map((id) => rows.filter((row) => row[foreignKey] === id)),
          )
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
        return new Dataloader((ids: readonly string[]) => {
          const query = knex(
            knex(targetTable)
              .select(`${targetTable}.*`, join.from)
              .rowNumber(
                'relation_index',
                knex.raw(`partition by ?? order by ?? ${orderByType}`, [
                  join.from,
                  orderByColumn,
                ]),
              )
              .innerJoin(joinTable, `${joinTable}.id`, join.to)
              .whereIn(join.from, ids)
              .as('_t'),
          ).whereBetween(knex.ref('relation_index') as any, [
            page.offset,
            page.offset + page.limit,
          ])
          modifyQuery(query)

          return query.then((rows) =>
            ids.map((id) => rows.filter((row) => row[joinColumn] === id)),
          )
        })
      } else {
        return new Dataloader((ids: readonly string[]) => {
          const query = knex(targetTable)
            .select(`${targetTable}.*`, join.from)
            .innerJoin(joinTable, `${joinTable}.id`, join.to)
            .whereIn(join.from, ids)
            .orderBy(orderByColumn, orderByType)
          modifyQuery(query)
          return query.then((rows) =>
            ids.map((id) => rows.filter((row) => row[joinColumn] === id)),
          )
        })
      }
    case 'belongsTo':
      return new Dataloader((ids: readonly string[]) => {
        const query = knex(targetTable)
          .whereIn('id', ids)
          .orderBy(orderByColumn, orderByType)
        modifyQuery(query)
        return query.then((rows) =>
          ids.map((id) => rows.find((row) => row.id === id)),
        )
      })
  }
}
