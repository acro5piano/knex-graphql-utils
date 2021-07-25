import type { GraphQLResolveInfo } from 'graphql'
import type { Knex } from 'knex'
import { fieldsList } from 'graphql-fields-list'

export interface FilterSelectionsProps {
  info: GraphQLResolveInfo

  /**
   * Table to filter columns.
   *
   * @example `selectionFilter.reduce({ info, table: 'users' })`
   */
  table: string

  /**
   * By passing `alwaysLoadColumns`, these columns are always loaded.
   * This is useful when a column is depends on other columns and loaded by resolvers.
   *
   * @example `selectionFilter.reduce({ info, table: 'users', alwaysLoadColumns: ['createdAt'] })`
   */
  alwaysLoadColumns?: string[]
}

export interface DatabaseTableInfo {
  tableName: string
  columns: string[]
  referenceColumns: string[]
}

export class SelectionFilter {
  private tableColumnsMap = new Map<string, DatabaseTableInfo>()

  constructor(private knex: Knex) {}

  /**
   * Prepare selection filter.
   * Be aware that you should call this method to make selectionFilter work correctly.
   *
   * @param tableNames: string[]
   *    Defines tables to inspect.
   * @param ignorePattern: RegExp
   *    If columns matches this pattern, these columns are always loaded.
   *    This is useful for foreign keys which should not be filtered to load relations after batch loading.
   * @example `prepare(['users', 'posts'], /_id$/)`
   */
  async prepare(tableNames: string[], ignorePattern: RegExp) {
    await Promise.all(
      tableNames.map(async (tableName) => {
        const rawColumns = await this.knex(tableName).columnInfo()
        const columns = Object.keys(rawColumns)
        const referenceColumns = columns.filter((col) =>
          ignorePattern.test(col),
        )
        this.tableColumnsMap.set(tableName, {
          tableName,
          columns,
          referenceColumns,
        })
      }),
    )
    return this
  }

  // Alias method
  reduce = this.filterGraphQLSelections.bind(this)

  filterGraphQLSelections({
    info,
    table,
    alwaysLoadColumns = [],
  }: FilterSelectionsProps) {
    const existingColumns = this.tableColumnsMap.get(table)
    if (!existingColumns) {
      // Empty array force Knex to select all columns (select `*`)
      return []
    }
    const selectionSets = fieldsList(info)
    if (!selectionSets.includes('id')) {
      selectionSets.push('id')
    }

    // Always load foreign key to prepare Dataloader
    this.tableColumnsMap.forEach((info) => {
      selectionSets.push(...info.referenceColumns)
    })

    return [
      ...existingColumns.columns.filter((c) => selectionSets.includes(c)),
      ...alwaysLoadColumns,
    ]
  }
}
