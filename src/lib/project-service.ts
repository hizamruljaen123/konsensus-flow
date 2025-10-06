import { DiagramEngine } from '@prisma/client'

import { db } from './db'

export type DiagramNode = {
  id: string
  name: string
  engine: DiagramEngine
  category: string | null
  content: string
  renderedSvg: string | null
  folderId: string | null
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export type FolderNode = {
  id: string
  name: string
  parentId: string | null
  projectId: string
  diagrams: DiagramNode[]
  folders: FolderNode[]
  createdAt: Date
  updatedAt: Date
}

export type ProjectNode = {
  id: string
  name: string
  description: string | null
  diagrams: DiagramNode[]
  folders: FolderNode[]
  createdAt: Date
  updatedAt: Date
}

export async function getProjectTreeForUser(userId: string): Promise<ProjectNode[]> {
  const projects = await db.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  })

  if (projects.length === 0) {
    return []
  }

  const projectIds = projects.map((project) => project.id)

  const folders = await db.folder.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: [{ projectId: 'asc' }, { parentId: 'asc' }, { createdAt: 'asc' }],
  })

  const diagrams = await db.diagram.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: [{ projectId: 'asc' }, { folderId: 'asc' }, { createdAt: 'asc' }],
  })

  const projectMap = new Map<string, ProjectNode>(
    projects.map((project) => [
      project.id,
      {
        id: project.id,
        name: project.name,
        description: project.description,
        diagrams: [],
        folders: [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    ]),
  )

  const folderMap = new Map<string, FolderNode>()

  for (const folder of folders) {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      projectId: folder.projectId,
      diagrams: [],
      folders: [],
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    })
  }

  for (const folder of folders) {
    const node = folderMap.get(folder.id)
    if (!node) continue
    if (folder.parentId) {
      const parentNode = folderMap.get(folder.parentId)
      if (parentNode) {
        parentNode.folders.push(node)
      }
    } else {
      const projectNode = projectMap.get(folder.projectId)
      if (projectNode) {
        projectNode.folders.push(node)
      }
    }
  }

  for (const diagram of diagrams) {
    const node: DiagramNode = {
      id: diagram.id,
      name: diagram.name,
      engine: diagram.engine,
      category: diagram.category,
      content: diagram.content,
      renderedSvg: diagram.renderedSvg,
      folderId: diagram.folderId,
      projectId: diagram.projectId,
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt,
    }

    if (diagram.folderId) {
      const folderNode = folderMap.get(diagram.folderId)
      folderNode?.diagrams.push(node)
    } else {
      const projectNode = projectMap.get(diagram.projectId)
      projectNode?.diagrams.push(node)
    }
  }

  return Array.from(projectMap.values())
}

export async function createProject(ownerId: string, name: string, description?: string | null) {
  return db.project.create({
    data: {
      name,
      description: description ?? null,
      ownerId,
    },
  })
}

export async function createFolder(options: {
  ownerId: string
  projectId: string
  name: string
  parentId?: string | null
}) {
  const { ownerId, projectId, name, parentId } = options

  const project = await db.project.findFirst({ where: { id: projectId, ownerId } })
  if (!project) {
    throw new Error('Project not found or access denied')
  }

  let parentFolder = null
  if (parentId) {
    parentFolder = await db.folder.findFirst({ where: { id: parentId, projectId } })
    if (!parentFolder) {
      throw new Error('Parent folder not found in project')
    }
  }

  return db.folder.create({
    data: {
      name,
      projectId,
      parentId: parentFolder?.id ?? null,
      createdById: ownerId,
    },
  })
}

export async function createDiagram(options: {
  ownerId: string
  projectId: string
  folderId?: string | null
  name: string
  engine: DiagramEngine
  content: string
  category?: string | null
  renderedSvg?: string | null
}) {
  const { ownerId, projectId, folderId, name, engine, content, category, renderedSvg } = options

  const project = await db.project.findFirst({ where: { id: projectId, ownerId } })
  if (!project) {
    throw new Error('Project not found or access denied')
  }

  let folder = null
  if (folderId) {
    folder = await db.folder.findFirst({ where: { id: folderId, projectId } })
    if (!folder) {
      throw new Error('Folder not found in project')
    }
  }

  return db.diagram.create({
    data: {
      name,
      engine,
      content,
      category: category ?? null,
      renderedSvg: renderedSvg ?? null,
      projectId,
      folderId: folder?.id ?? null,
      createdById: ownerId,
      updatedById: ownerId,
    },
  })
}

export async function updateDiagram(options: {
  ownerId: string
  diagramId: string
  projectId: string
  name?: string
  content?: string
  engine?: DiagramEngine
  category?: string | null
  renderedSvg?: string | null
  folderId?: string | null
}) {
  const { ownerId, diagramId, projectId, name, content, engine, category, renderedSvg, folderId } = options

  const diagram = await db.diagram.findFirst({
    where: { id: diagramId, projectId, project: { ownerId } },
  })

  if (!diagram) {
    throw new Error('Diagram not found or access denied')
  }

  let nextFolderId = folderId === undefined ? diagram.folderId : folderId

  if (nextFolderId) {
    const folder = await db.folder.findFirst({ where: { id: nextFolderId, projectId } })
    if (!folder) {
      throw new Error('Target folder not found in project')
    }
  }

  return db.diagram.update({
    where: { id: diagramId },
    data: {
      name: name ?? diagram.name,
      content: content ?? diagram.content,
      engine: engine ?? diagram.engine,
      category: category ?? diagram.category,
      renderedSvg: renderedSvg ?? diagram.renderedSvg,
      folderId: nextFolderId,
      updatedById: ownerId,
    },
  })
}

export async function getDiagramById(options: { ownerId: string; projectId: string; diagramId: string }) {
  const { ownerId, projectId, diagramId } = options

  return db.diagram.findFirst({
    where: { id: diagramId, projectId, project: { ownerId } },
  })
}
