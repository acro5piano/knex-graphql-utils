import test from 'ava'
import { knexWithLog } from './knex'
import { BatchLoader, SelectionFilter } from '../src/index'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { gql } from './util'
import { graphql } from 'graphql'

const typeDefs = gql`
  type Query {
    user: User
  }
  type User {
    id: ID!
    name: String!
    posts(page: Int = 1): [Post!]!
    createdAt: String!
    updatedAt: String!
  }
  type Post {
    id: ID!
    user: User!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }
  type Comment {
    id: ID!
    content: String!
    createdAt: String!
    updatedAt: String!
  }
`

test.serial('BatchLoader + SelectionFilter', async (t) => {
  const selectionFilter = new SelectionFilter(knexWithLog)
  await selectionFilter.prepare(['users', 'posts', 'comments'], /Id$/)
  const batchLoader = new BatchLoader(knexWithLog)
  batchLoader.useSelectionFilter(selectionFilter)

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: {
      Query: {
        user: (...params) => {
          const [, , , info] = params
          return knexWithLog('users')
            .select(selectionFilter.reduce({ table: 'users', info }))
            .first()
        },
      },
      User: {
        posts: (...params) => {
          const [user, , , info] = params
          return batchLoader
            .getLoader({
              foreignKey: 'userId',
              page: { offset: 5, limit: 10 },
              targetTable: 'posts',
              type: 'hasMany',
              orderBy: ['createdAt', 'asc'],
              info,
            })
            .load(user.id)
        },
      },
      Post: {
        comments: (...params) => {
          const [post, , , info] = params
          return batchLoader
            .getLoader({
              foreignKey: 'postId',
              page: { offset: 5, limit: 10 },
              targetTable: 'comments',
              type: 'hasMany',
              orderBy: ['createdAt', 'asc'],
              info,
            })
            .load(post.id)
        },
      },
    },
  })

  knexWithLog.on('query', (q) => {
    t.snapshot(q.sql)
  })

  await graphql({
    schema,
    source: gql`
      query {
        user {
          id
          name
          posts {
            id
            comments {
              id
              content
            }
          }
        }
      }
    `,
  }).then(t.snapshot)
})
