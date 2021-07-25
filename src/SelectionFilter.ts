import type { GraphQLResolveInfo } from 'graphql'
import type { Knex } from 'knex'
import { fieldsList } from 'graphql-fields-list'

interface FilterSelectionsProps {
  info: GraphQLResolveInfo
  table: string
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

  async prepare(tableNames: string[], pattern: RegExp) {
    await Promise.all(
      tableNames.map(async (tableName) => {
        const rawColumns = await this.knex(tableName).columnInfo()
        const columns = Object.keys(rawColumns)
        const referenceColumns = columns.filter((col) => pattern.test(col))
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
