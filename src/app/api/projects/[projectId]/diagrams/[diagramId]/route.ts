import { NextResponse } from 'next/server'

import { getDiagramById, updateDiagram } from '@/lib/project-service'
import { getDefaultUser } from '@/lib/user'

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string; diagramId: string } },
) {
  try {
    const user = await getDefaultUser()
    const { projectId, diagramId } = params
    const diagram = await getDiagramById({ ownerId: user.id, projectId, diagramId })

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 })
    }

    return NextResponse.json({ diagram })
  } catch (error) {
    console.error('Failed to load diagram', error)
    return NextResponse.json({ error: 'Failed to load diagram' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string; diagramId: string } },
) {
  try {
    const user = await getDefaultUser()
    const { projectId, diagramId } = params
    const body = await request.json()

    const diagram = await updateDiagram({
      ownerId: user.id,
      diagramId,
      projectId,
      name: body?.name,
      content: body?.content,
      engine: body?.engine,
      category: body?.category,
      renderedSvg: body?.renderedSvg,
      folderId: body?.folderId,
    })

    return NextResponse.json({ diagram })
  } catch (error) {
    console.error('Failed to update diagram', error)
    return NextResponse.json({ error: 'Failed to update diagram' }, { status: 500 })
  }
}
