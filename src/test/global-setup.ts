import { execSync } from 'node:child_process'
import pg from 'pg'

// Connects to the default "postgres" database and creates the test database if it does not exist
const createDatabaseIfMissing = async (databaseUrl: string) => {
  const databaseName = new URL(databaseUrl).pathname.slice(1)
  if (!/^\w+$/.test(databaseName)) throw new Error(`Invalid test database name: ${databaseName}`)

  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'
  adminUrl.search = ''

  const client = new pg.Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ])
    if (rowCount === 0) await client.query(`CREATE DATABASE "${databaseName}"`)
  } finally {
    await client.end()
  }
}

// Runs once before all integration test files
export default async function setup() {
  const databaseUrl = process.env.TEST_DATABASE_URL
  if (!databaseUrl) throw new Error('TEST_DATABASE_URL is not set')

  await createDatabaseIfMissing(databaseUrl)
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
}
