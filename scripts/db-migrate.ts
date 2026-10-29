// `bun run db:migrate -- --name <name>`: creates and applies a migration, then
// regenerates the client (Prisma 7's `migrate dev` no longer does). Arguments
// go to `migrate dev`; a package script with `&&` would pass them to the
// last command instead.
import { spawnSync } from 'node:child_process'

function run(args: string[]): void {
  const result = spawnSync('bun', ['x', 'prisma', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(['migrate', 'dev', ...process.argv.slice(2)])
run(['generate'])
