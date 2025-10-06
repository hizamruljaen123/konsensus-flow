import { NextResponse } from 'next/server'

import { createProject, getProjectTreeForUser } from '@/lib/project-service'
import { getDefaultUser } from '@/lib/user'

export async function GET() {
  try {
    const user = await getDefaultUser()
    const projects = await getProjectTreeForUser(user.id)
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Failed to load projects', error)
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDefaultUser()
    const body = await request.json()
    const name: string | undefined = body?.name
    const description: string | null | undefined = body?.description

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await createProject(user.id, name.trim(), description ?? null)
    return NextResponse.json({ project })
  } catch (error) {
    console.error('Failed to create project', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
