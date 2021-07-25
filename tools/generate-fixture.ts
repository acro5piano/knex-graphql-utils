import fs from 'fs'
import path from 'path'

// Please run `yarn test --update-snapshots` after you execute this script.
import dayjs from 'dayjs'
import * as R from 'remeda'
import { v5 } from 'uuid'

// prettier-ignore
const presidents = [ 'George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison', 'James Monroe', 'John Quincy Adams', 'Andrew Jackson', 'Martin Van Buren', 'William Henry Harrison', 'John Tyler', 'James K. Polk', 'Zachary Taylor', 'Millard Fillmore', 'Franklin Pierce', 'James Buchanan', 'Abraham Lincoln', 'Andrew Johnson', 'Ulysses S. Grant', 'Rutherford B. Hayes', 'James A. Garfield', 'Chester A. Arthur', 'Grover Cleveland', 'Benjamin Harrison', 'Grover Cleveland (2nd term)', 'William McKinley', 'Theodore Roosevelt', 'William Howard Taft', 'Woodrow Wilson', 'Warren G. Harding', 'Calvin Coolidge', 'Herbert Hoover', 'Franklin D. Roosevelt', 'Harry S. Truman', 'Dwight D. Eisenhower', 'John F. Kennedy', 'Lyndon B. Johnson', 'Richard Nixon', 'Gerald Ford', 'Jimmy Carter', 'Ronald Reagan', 'George H. W. Bush', 'Bill Clinton', 'George W. Bush', 'Barack Obama', 'Donal Trump', 'Joe Biden', ]
// prettier-ignore
const presetTags = [ 'tag_a', 'tag_b', 'tag_c' ]

const t = dayjs('2021-07-22T08:53:06.074Z')

const getTimeStamps = (index: number) => {
  return {
    createdAt: t.add(index, 'days').toDate(),
    updatedAt: t.add(index, 'days').toDate(),
  }
}

const makeId = (...names: Array<string | number>) =>
  v5(names.map(String).join(':'), '15584352-dc37-48bb-8551-bbe5e8366606')

function repeatArray<T>(arr: Array<T>, n: number) {
  return R.range(1, n).flatMap(() => arr)
}

const users = presidents.map((name, i) => ({
  id: makeId(name, i),
  name,
  ...getTimeStamps(i),
}))

const tags = presetTags.map((name, i) => ({
  id: makeId(name, i),
  name,
  ...getTimeStamps(i),
}))

const posts = R.pipe(
  users,
  R.flatMap((user) =>
    R.pipe(
      R.range(1, 10),
      R.map((i) => ({
        id: makeId(user.id, i),
        userId: user.id,
        title: `${user.name}'s post - ${i}`,
        ...getTimeStamps(i),
      })),
    ),
  ),
)

const tagsPosts = R.zipWith(
  repeatArray(tags, 30),
  repeatArray(posts.slice(5), 10),
  (tag, post) => ({
    id: makeId(tag.id, post.id),
    tagId: tag.id,
    postId: post.id,
  }),
)

const comments = R.pipe(
  posts,
  R.flatMap((post) =>
    R.pipe(
      R.range(1, 10),
      R.map((i) => ({
        id: makeId(post.id, i),
        postId: post.id,
        content: `comment for ${post.title} - ${i}`,
        ...getTimeStamps(i),
      })),
    ),
  ),
)

fs.writeFileSync(
  path.resolve(__dirname, '../tests/fixtures.json'),
  JSON.stringify({ users, posts, comments, tags, tagsPosts }, undefined, 2),
  'utf8',
)
