import fs from 'fs'
import path from 'path'

// Please run `yarn test --update-snapshots` after you execute this script.
import dayjs from 'dayjs'
import * as R from 'remeda'
import { v4 } from 'uuid'

// prettier-ignore
const presidents = [ 'George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison', 'James Monroe', 'John Quincy Adams', 'Andrew Jackson', 'Martin Van Buren', 'William Henry Harrison', 'John Tyler', 'James K. Polk', 'Zachary Taylor', 'Millard Fillmore', 'Franklin Pierce', 'James Buchanan', 'Abraham Lincoln', 'Andrew Johnson', 'Ulysses S. Grant', 'Rutherford B. Hayes', 'James A. Garfield', 'Chester A. Arthur', 'Grover Cleveland', 'Benjamin Harrison', 'Grover Cleveland (2nd term)', 'William McKinley', 'Theodore Roosevelt', 'William Howard Taft', 'Woodrow Wilson', 'Warren G. Harding', 'Calvin Coolidge', 'Herbert Hoover', 'Franklin D. Roosevelt', 'Harry S. Truman', 'Dwight D. Eisenhower', 'John F. Kennedy', 'Lyndon B. Johnson', 'Richard Nixon', 'Gerald Ford', 'Jimmy Carter', 'Ronald Reagan', 'George H. W. Bush', 'Bill Clinton', 'George W. Bush', 'Barack Obama', 'Donal Trump', 'Joe Biden', ]

const t = dayjs('2021-07-22T08:53:06.074Z')

const getTimeStamps = (index: number) => {
  return {
    createdAt: t.add(index, 'days').toDate(),
    updatedAt: t.add(index, 'days').toDate(),
  }
}

const users = presidents.map((name, i) => ({
  id: v4(),
  name,
  ...getTimeStamps(i),
}))

const posts = R.pipe(
  users,
  R.flatMap((user) =>
    R.pipe(
      R.range(1, 10),
      R.map((i) => ({
        id: v4(),
        userId: user.id,
        title: `${user.name}'s post - ${i}`,
        ...getTimeStamps(i),
      })),
    ),
  ),
)

const comments = R.pipe(
  posts,
  R.flatMap((post) =>
    R.pipe(
      R.range(1, 10),
      R.map((i) => ({
        id: v4(),
        postId: post.id,
        content: `comment for ${post.title} - ${i}`,
        ...getTimeStamps(i),
      })),
    ),
  ),
)

fs.writeFileSync(
  path.resolve(__dirname, '../tests/fixtures.json'),
  JSON.stringify({ users, posts, comments }, undefined, 2),
  'utf8',
)
