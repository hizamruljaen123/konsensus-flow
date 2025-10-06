import type { DiagramEngine } from '@prisma/client'
import { NextResponse } from 'next/server'

import { createDiagram } from '@/lib/project-service'
import { getDefaultUser } from '@/lib/user'

const engineMap: Record<string, DiagramEngine> = {
  mermaid: 'MERMAID',
  plantuml: 'PLANTUML',
  custom: 'CUSTOM',
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await getDefaultUser()
    const { projectId } = await params
    const body = await request.json()
    const name: string | undefined = body?.name
    const folderId: string | null | undefined = body?.folderId ?? null
    const engineInput: string | undefined = body?.engine
    const content: string | undefined = body?.content ?? ''
    const category: string | null | undefined = body?.category ?? null
    const renderedSvg: string | null | undefined = body?.renderedSvg ?? null

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Diagram name is required' }, { status: 400 })
    }

    if (!engineInput) {
      return NextResponse.json({ error: 'Valid diagram engine is required' }, { status: 400 })
    }

    const engine = engineMap[engineInput.toLowerCase()]

    if (!engine) {
      return NextResponse.json({ error: 'Valid diagram engine is required' }, { status: 400 })
    }

    const diagram = await createDiagram({
      ownerId: user.id,
      projectId,
      folderId,
      name: name.trim(),
      engine,
      content: typeof content === 'string' && content.length > 0 ? content : '',
      category: typeof category === 'string' ? category : null,
      renderedSvg,
    })

    return NextResponse.json({ diagram })
  } catch (error) {
    console.error('Failed to create diagram', error)

    // Return the actual error message for better frontend handling
    const errorMessage = error instanceof Error ? error.message : 'Failed to create diagram'
    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
