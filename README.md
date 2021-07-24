# knex-graphql-utils

Set of useful functions for Knex + GraphQL.

- **BatchLoader** Loads and paginates relationship without N+1 problem.
- **SelectionFilter** Filters selected columns based on GraphQL field selection set.

# Install

```
yarn add knex-graphql-utils
```

# Getting Started

```typescript
// app.ts

import Fastify from 'fastify'
import mercurius from 'mercurius'
import { BatchLoader, SelectionFilter } from 'knex-graphql-utils'

import { knex } from './knex' // Your knex instance

const app = Fastify()

const schema = `
  type Query {
    user: User
  }
  type User {
    id: ID!
    posts(page: Int!): [Post!]!
  }
  type Post {
    id: ID!
    user: User!
  }
`

const selectionFilter = new SelectionFilter(knex)

const resolvers = {
  Query: {
    user: () => knex('users').first(),
  },
  User: {
    posts: (user, args, ctx) =>
      ctx.batchLoader
        .getLoader({
          type: 'hasMany',
          foreignKey: 'userId',
          targetTable: 'posts',
          page: {
            offset: ((args.page || 1) - 1) * 10,
            limit: 10,
          },
          orderBy: ['createdAt', 'asc'],
          queryModifier: (query) => {
            query.select(
              selectionFilter.filterGraphQLSelections({
                info,
                table: 'posts',
              }),
            )
          },
        })
        .load(user.id),
  },
  Post: {
    user: (post, _args, ctx, info) =>
      ctx.batchLoader
        .getLoader({
          type: 'belongsTo',
          foreignKey: 'userId',
          targetTable: 'users',
          queryModifier: (query) => {
            query.select(
              selectionFilter.filterGraphQLSelections({
                info,
                table: 'users',
              }),
            )
          },
        })
        .load(post.userId),
  },
}

app.addHook('onReady', async () => {
  await selectionFilter.prepare(['users', 'posts'], /(_id)|(Id)$/)
})

app.register(mercurius, {
  schema,
  resolvers,
  context: () => ({
    batchLoader: new BatchLoader(knex),
  }),
})
```

# Further reading

For more details, please visit demo/ . You can see log output like this:

![image](https://user-images.githubusercontent.com/10719495/126866657-a6ca9463-bac8-4056-9963-1f0aae8bf7fd.png)

