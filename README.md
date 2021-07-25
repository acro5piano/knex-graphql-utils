# knex-graphql-utils

[![npm version](https://badge.fury.io/js/knex-graphql-utils.svg)](https://badge.fury.io/js/knex-graphql-utils)
[![test](https://github.com/acro5piano/knex-graphql-utils/actions/workflows/test.yml/badge.svg)](https://github.com/acro5piano/knex-graphql-utils/actions/workflows/test.yml)
[![release](https://github.com/acro5piano/knex-graphql-utils/actions/workflows/release.yml/badge.svg)](https://github.com/acro5piano/knex-graphql-utils/actions/workflows/release.yml)

Set of useful functions for Knex + GraphQL.

- **BatchLoader** Loads and paginates relationship without N+1 problem.
- **SelectionFilter** Filters selected columns based on GraphQL field selection set.

**Note: Only PostgreSQL is supported for now**

![image](https://user-images.githubusercontent.com/10719495/126866657-a6ca9463-bac8-4056-9963-1f0aae8bf7fd.png)

# Install

```
npm install --save knex-graphql-utils
```

Or if you use Yarn:

```
yarn add knex-graphql-utils
```

# Motivation

Creating a GraphQL service with a Relational Database is a hard thing. We should take care of:

- Performance for querying relations. N+1 problem will happen if you don't use Dataloader.
- `select *` make your server slow, but hard to filter columns based on requests.
- Pagination. [Dataloader pattern is hard to implement pagination](https://github.com/graphql/dataloader/issues/231) without a hacky `union` or window functions. `knex-graphql-utils` uses `row_number()` window function to do it.

With `knex-graphql-utils`, You can build performant GraphQL servers without hassle.

# Getting Started

In this example, I use `mercurius` but this can be applied to any GraphQL frameworks.

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
    name: String!
    posts(page: Int!): [Post!]!
  }
  type Post {
    id: ID!
    title: String!
    user: User!
  }
`

const selectionFilter = new SelectionFilter(knex)

const resolvers = {
  Query: {
    user: (user, args, ctx, info) =>
      knex('users')
        .select(selectionFilter.reduce({ info, table: 'users' }))
        .first(),
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
            query.select(selectionFilter.reduce({ info, table: 'posts' }))
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
            query.select(selectionFilter.reduce({ info, table: 'users' }))
          },
        })
        .load(post.userId),
  },
}

app.register(mercurius, {
  schema,
  resolvers,
  context: () => ({
    batchLoader: new BatchLoader(knex),
  }),
})

app.listen(8877).then(async () => {
  await selectionFilter.prepare(['users', 'posts'], /(_id)|(Id)$/)
})
```

# Integrate `BatchLoader` and `SelectionFilter`

You can tell `BatchLoader` to use `SelectionFilter`, and the loader automatically reduces the selection based on `info`.

```typescript
import { BatchLoader, SelectionFilter } from 'knex-graphql-utils'

import { knex } from './knex' // Your knex instance

const selectionFilter = new SelectionFilter(knex)
const context = {
  batchLoader: new BatchLoader(knex).useSelectionFilter(selectionFilter), // Attach SelectionFilter into batch loader
}

const resolver = {
  User: {
    posts: (user, args, ctx, info) =>
      ctx.batchLoader
        .getLoader({
          type: 'hasMany',
          foreignKey: 'userId',
          targetTable: 'posts',
          info, // By passing `info`, loader automatically reduces the selection
        })
        .load(user.id),
  },
}

await selectionFilter.prepare(['users'], /_id/)
```

# Limitation & Todo

- Only PostgreSQL is supported for now.
- Primary key is always assumed to be `id`.
- Add `where` clause with paginating relationship.

# Further reading

For more details, please visit [demo](https://github.com/acro5piano/knex-graphql-utils/blob/master/demo/index.ts) . You can see log output like this:

![image](https://user-images.githubusercontent.com/10719495/126866657-a6ca9463-bac8-4056-9963-1f0aae8bf7fd.png)
