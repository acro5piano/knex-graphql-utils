import type { CreateLoaderProps, OrderByType } from '../BatchLoader'
import { Knex } from 'knex'
import Dataloader from 'dataloader'

type CreateHasManyLoaderWithPageProps = Required<
  Pick<CreateLoaderProps, 'targetTable' | 'foreignKey' | 'knex' | 'page'>
> & {
  modifyQuery?: (query: Knex.QueryBuilder) => void
  orderByType?: OrderByType
  orderByColumn?: string
}

export function createHasManyLoaderWithPage({
  targetTable,
  foreignKey,
  knex,
  page,
  orderByType,
  orderByColumn,
  modifyQuery,
}: CreateHasManyLoaderWithPageProps) {
  return new Dataloader((ids: readonly string[]) => {
    const subQuery = knex(targetTable)
      .select('*')
      .whereIn(foreignKey, ids)
      .as('_t')
    if (orderByType && orderByColumn) {
      subQuery.rowNumber(
        'relation_index',
        knex.raw(`partition by ?? order by ?? ${orderByType}`, [
          foreignKey,
          orderByColumn,
        ]),
      )
    } else {
      subQuery.rowNumber(
        'relation_index',
        knex.raw(`partition by ??`, [foreignKey]),
      )
    }
    const query = knex(subQuery).whereBetween(
      knex.ref('relation_index') as any,
      [page.offset, page.offset + page.limit],
    )
    if (modifyQuery) {
      modifyQuery(query)
    }
    return query.then((rows) =>
      ids.map((id) => rows.filter((row) => row[foreignKey] === id)),
    )
  })
}
