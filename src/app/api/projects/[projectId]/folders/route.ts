import { NextResponse } from 'next/server'

import { createFolder } from '@/lib/project-service'
import { getDefaultUser } from '@/lib/user'

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  try {
    const user = await getDefaultUser()
    const { projectId } = params
    const body = await request.json()
    const name: string | undefined = body?.name
    const parentId: string | null | undefined = body?.parentId ?? null

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const folder = await createFolder({
      ownerId: user.id,
      projectId,
      name: name.trim(),
      parentId,
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Failed to create folder', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}
