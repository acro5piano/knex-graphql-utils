# knex-graphql-utils

Set of useful functions for Knex + GraphQL.

- **BatchLoader** Loads and paginates relationship without N+1 problem.
- **filterColumn** Filters selected columns based on GraphQL field selection set.

# Install

```
yarn add knex-graphql-utils
```

# Getting Started

In the following example, I assume you mount your endopint into `'/graphql'`.

```typescript
// app.ts

import Fastify from 'fastify'
import mercurius from 'mercurius'
import { BatchLoader } from 'knex-graphql-utils'

import { knex } from './knex' // Your knex instance

const app = Fastify()

const schema = `
  type Query {
    user: User
  }
  type User {
    id: ID!
    posts: [Post!]!
  }
  type Post {
    id: ID!
  }
`

const resolvers = {
  Query: {
    user: () => knex('users').first(),
  },
  User: {
    posts: (user, _args, ctx) =>
      ctx.batchLoader
        .getLoader({
          type: 'hasMany',
          foreignKey: 'userId',
          targetTable: 'posts',
          page: { offset: 5, limit: 10 },
          orderBy: ['createdAt', 'asc'],
        })
        .load(user.id),
  },
}

app.register(mercurius, {
  schema,
  resolvers,
  context: () => ({ batchLoader: new BatchLoader(knex) }),
})
```
