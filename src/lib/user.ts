import { db } from './db'

const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL ?? 'demo@konsensus.local'
const DEFAULT_USER_PASSWORD_HASH = process.env.DEFAULT_USER_PASSWORD_HASH ?? 'demo-password'

export async function getDefaultUser() {
  let user = await db.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } })

  if (!user) {
    user = await db.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: 'Demo User',
        passwordHash: DEFAULT_USER_PASSWORD_HASH,
      },
    })
  }

  return user
}
