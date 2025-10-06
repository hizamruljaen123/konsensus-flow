'use client'

import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Download, RefreshCw, Eye, EyeOff, Code2, Image, File, Folder, ChevronDown, ChevronRight, Play, Settings, GitBranch, Terminal, FilePlus, PlusCircle, Save } from 'lucide-react'
import mermaid from 'mermaid'
import html2canvas from 'html2canvas'
import { registerPlantUML } from '@/lib/monaco-plantuml'
import { mermaidTemplates } from '@/data/templates/mermaid'
import { plantumlTemplates } from '@/data/templates/plantuml'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

// Dynamic import for Monaco Editor to avoid SSR issues
const Editor = lazy(() => import('@monaco-editor/react'))

type DiagramType = 'mermaid' | 'plantuml'
type TemplateCategory = string

type DiagramEngine = 'MERMAID' | 'PLANTUML' | 'CUSTOM'

type DiagramNode = {
  id: string
  name: string
  engine: DiagramEngine
  category: string | null
  folderId: string | null
  projectId: string
  content?: string
  renderedSvg?: string | null
}

type FolderNode = {
  id: string
  name: string
  parentId: string | null
  projectId: string
  diagrams: DiagramNode[]
  folders: FolderNode[]
  createdAt: Date
  updatedAt: Date
}

type ProjectNode = {
  id: string
  name: string
  description: string | null
  diagrams: DiagramNode[]
  folders: FolderNode[]
  createdAt: Date
  updatedAt: Date
}

type ProjectApiResponse = {
  projects: ProjectNode[]
}

type ProjectTreeProps = {
  project: ProjectNode
  expandedNodes: Set<string>
  selectedProjectId: string | null
  selectedFolderId: string | null
  selectedDiagramId: string | null
  onToggleNode: (nodeId: string) => void
  onSelectProject: (projectId: string) => void
  onSelectFolder: (projectId: string, folderId: string | null) => void
  onSelectDiagram: (projectId: string, diagramId: string, folderId: string | null) => void
  onCreateDiagram: (projectId: string, folderId: string | null) => void
}

type FolderTreeProps = {
  projectId: string
  folder: FolderNode
  expandedNodes: Set<string>
  selectedFolderId: string | null
  selectedDiagramId: string | null
  onToggleNode: (nodeId: string) => void
  onSelectFolder: (projectId: string, folderId: string | null) => void
  onSelectDiagram: (projectId: string, diagramId: string, folderId: string | null) => void
  onCreateDiagram: (projectId: string, folderId: string | null) => void
}

type DiagramTreeNodeProps = {
  projectId: string
  diagram: DiagramNode
  folderId: string | null
  selectedDiagramId: string | null
  onSelectDiagram: (projectId: string, diagramId: string, folderId: string | null) => void
}

const findFolderById = (folders: FolderNode[], folderId: string): FolderNode | null => {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder
    }

    const nested = findFolderById(folder.folders, folderId)
    if (nested) {
      return nested
    }
  }

  return null
}

const getDiagramNamesInContext = (project: ProjectNode | null, folderId: string | null): Set<string> => {
  if (!project) {
    return new Set()
  }

  if (!folderId) {
    return new Set(project.diagrams.map((diagram) => diagram.name.trim()))
  }

  const folder = findFolderById(project.folders, folderId)
  if (!folder) {
    return new Set()
  }

  return new Set(folder.diagrams.map((diagram) => diagram.name.trim()))
}

const generateUniqueDiagramName = (baseName: string, existingNames: Set<string>): string => {
  const trimmedName = baseName.trim()
  if (!trimmedName) {
    return trimmedName
  }

  if (!existingNames.has(trimmedName)) {
    return trimmedName
  }

  let index = 1
  while (true) {
    const candidate = `${trimmedName}_${index}`
    if (!existingNames.has(candidate)) {
      return candidate
    }
    index += 1
  }
}

const fetchDiagramFromServer = async (projectId: string, diagramId: string) => {
  const response = await fetch(`/api/projects/${projectId}/diagrams/${diagramId}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error ?? 'Failed to load diagram')
  }

  return response.json() as Promise<{ diagram?: DiagramNode & { content?: string; renderedSvg?: string | null } }>
}

async function fetchProjects(): Promise<ProjectNode[]> {
  const response = await fetch('/api/projects', { cache: 'no-store' })

  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }

  const data = (await response.json()) as ProjectApiResponse
  return data.projects
}

function ProjectTree({
  project,
  expandedNodes,
  selectedProjectId,
  selectedFolderId,
  selectedDiagramId,
  onToggleNode,
  onSelectProject,
  onSelectFolder,
  onSelectDiagram,
  onCreateDiagram,
}: ProjectTreeProps) {
  const hasChildren = project.folders.length > 0 || project.diagrams.length > 0
  const isExpanded = hasChildren ? expandedNodes.has(project.id) : false
  const isSelectedProject =
    selectedProjectId === project.id && !selectedFolderId && !selectedDiagramId

  const handleSelectProject = () => {
    onSelectProject(project.id)
    if (hasChildren && !isExpanded) {
      onToggleNode(project.id)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleNode(project.id)}
            className="text-gray-400 hover:text-gray-100 transition-colors"
            aria-label={isExpanded ? 'Collapse project' : 'Expand project'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-3 h-3" />
        )}
        <div className="flex-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectProject}
            className={`flex-1 text-left flex items-center gap-2 rounded px-2 py-1 transition-colors ${
              isSelectedProject ? 'bg-[#094771] text-white' : 'text-gray-300 hover:bg-[#2a2d2e]'
            }`}
          >
            <GitBranch className="w-3 h-3 text-sky-400" />
            <span className="truncate">{project.name}</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onCreateDiagram(project.id, null)
            }}
            className="p-1 rounded hover:bg-[#2a2a2e] text-gray-300"
            title="Tambah diagram ke project"
          >
            <PlusCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-5 pl-3 border-l border-[#2a2a2a] space-y-1">
          {project.diagrams.map((diagram) => (
            <DiagramTreeNode
              key={diagram.id}
              projectId={project.id}
              diagram={diagram}
              folderId={null}
              selectedDiagramId={selectedDiagramId}
              onSelectDiagram={onSelectDiagram}
            />
          ))}

          {project.folders.map((folder) => (
            <FolderTree
              key={folder.id}
              projectId={project.id}
              folder={folder}
              expandedNodes={expandedNodes}
              selectedFolderId={selectedFolderId}
              selectedDiagramId={selectedDiagramId}
              onToggleNode={onToggleNode}
              onSelectFolder={onSelectFolder}
              onSelectDiagram={onSelectDiagram}
              onCreateDiagram={onCreateDiagram}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FolderTree({
  projectId,
  folder,
  expandedNodes,
  selectedFolderId,
  selectedDiagramId,
  onToggleNode,
  onSelectFolder,
  onSelectDiagram,
  onCreateDiagram,
}: FolderTreeProps) {
  const hasChildren = folder.folders.length > 0 || folder.diagrams.length > 0
  const isExpanded = hasChildren ? expandedNodes.has(folder.id) : false
  const isSelectedFolder = selectedFolderId === folder.id

  const handleSelectFolder = () => {
    onSelectFolder(projectId, folder.id)
    if (hasChildren && !isExpanded) {
      onToggleNode(folder.id)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1 text-xs">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleNode(folder.id)}
            className="text-gray-500 hover:text-gray-200 transition-colors"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-3 h-3" />
        )}
        <div className="flex-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectFolder}
            className={`flex-1 text-left flex items-center gap-2 rounded px-2 py-1 transition-colors ${
              isSelectedFolder ? 'bg-[#0f5c8d] text-white' : 'text-gray-300 hover:bg-[#2a2d2e]'
            }`}
          >
            <Folder className="w-3 h-3 text-yellow-500" />
            <span className="truncate">{folder.name}</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onCreateDiagram(projectId, folder.id)
            }}
            className="p-1 rounded hover:bg-[#2a2a2e] text-gray-300"
            title="Tambah diagram ke folder"
          >
            <PlusCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-5 pl-3 border-l border-[#2a2a2a] space-y-1">
          {folder.diagrams.map((diagram) => (
            <DiagramTreeNode
              key={diagram.id}
              projectId={projectId}
              diagram={diagram}
              folderId={folder.id}
              selectedDiagramId={selectedDiagramId}
              onSelectDiagram={onSelectDiagram}
            />
          ))}

          {folder.folders.map((child) => (
            <FolderTree
              key={child.id}
              projectId={projectId}
              folder={child}
              expandedNodes={expandedNodes}
              selectedFolderId={selectedFolderId}
              selectedDiagramId={selectedDiagramId}
              onToggleNode={onToggleNode}
              onSelectFolder={onSelectFolder}
              onSelectDiagram={onSelectDiagram}
              onCreateDiagram={onCreateDiagram}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DiagramTreeNode({
  projectId,
  diagram,
  folderId,
  selectedDiagramId,
  onSelectDiagram,
}: DiagramTreeNodeProps) {
  const isSelected = selectedDiagramId === diagram.id
  const engineLabel = diagram.engine.toLowerCase()

  return (
    <button
      type="button"
      onClick={() => onSelectDiagram(projectId, diagram.id, folderId)}
      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
        isSelected ? 'bg-[#18527a] text-white' : 'text-gray-400 hover:bg-[#2a2a2e]'
      }`}
    >
      <File className="w-3 h-3" />
      <span className="flex-1 truncate">{diagram.name}</span>
      <span className="text-[10px] uppercase text-gray-500">{engineLabel}</span>
    </button>
  )
}

async function updateDiagramOnServer(
  projectId: string,
  diagramId: string,
  payload: Partial<{
    name: string
    content: string
    engine: DiagramEngine
    category: string | null
    renderedSvg: string | null
    folderId: string | null
  }>,
) {
  const response = await fetch(`/api/projects/${projectId}/diagrams/${diagramId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error ?? 'Failed to update diagram')
  }

  return response.json()
}

async function createProjectOnServer(payload: { name: string; description?: string }) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error ?? 'Failed to create project')
  }

  return response.json()
}

async function createFolderOnServer(projectId: string, payload: { name: string; parentId?: string | null }) {
  const response = await fetch(`/api/projects/${projectId}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error ?? 'Failed to create folder')
  }

  return response.json()
}

async function createDiagramOnServer(projectId: string, payload: {
  name: string
  engine: DiagramEngine
  content: string
  category?: string | null
  folderId?: string | null
}) {
  const response = await fetch(`/api/projects/${projectId}/diagrams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error ?? 'Failed to create diagram')
  }

  return response.json()
}

export default function VSCodeDiagramEditor() {
  const [diagramType, setDiagramType] = useState<DiagramType>('mermaid')
  const [code, setCode] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [svgContent, setSvgContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([])
  const [theme, setTheme] = useState('vs-dark')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showTemplates, setShowTemplates] = useState(true)
  const [projects, setProjects] = useState<ProjectNode[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null)
  const [currentDiagramName, setCurrentDiagramName] = useState('')
  const [sidebarTab, setSidebarTab] = useState<'projects' | 'templates'>('templates')
  const [expandedProjectNodes, setExpandedProjectNodes] = useState<Set<string>>(new Set())
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [directoryError, setDirectoryError] = useState('')
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false)
  const [isDiagramDialogOpen, setIsDiagramDialogOpen] = useState(false)
  const [newDiagramName, setNewDiagramName] = useState('')
  const [editingDiagramId, setEditingDiagramId] = useState<string | null>(null)
  const [editingDiagramName, setEditingDiagramName] = useState('')
  const [isDiagramLoading, setIsDiagramLoading] = useState(false)
  const svgRef = useRef<HTMLDivElement>(null)
  const diagramFetchToken = useRef(0)
  const { toast } = useToast()

  // Get current templates based on diagram type
  const getCurrentTemplates = () => {
    return diagramType === 'mermaid' ? mermaidTemplates : plantumlTemplates
  }

  const loadProjects = useCallback(async () => {
    try {
      setIsDirectoryLoading(true)
      setDirectoryError('')
      const projectData = await fetchProjects()
      setProjects(projectData)
      setSelectedProjectId((current) => {
        if (projectData.length === 0) {
          return null
        }

        if (current && projectData.some((project) => project.id === current)) {
          return current
        }

        return projectData[0].id
      })
      setSelectedFolderId(null)
      setSelectedDiagramId(null)
      setExpandedProjectNodes((prev) => {
        const next = new Set(prev)
        projectData.forEach((project) => next.add(project.id))
        return next
      })
    } catch (fetchError) {
      console.error(fetchError)
      setDirectoryError('Gagal memuat daftar project dari server')
    } finally {
      setIsDirectoryLoading(false)
    }
  }, [])

  // Register PlantUML language on mount and load projects
  useEffect(() => {
    // Only register on client side
    if (typeof window !== 'undefined') {
      registerPlantUML()
      loadProjects()
    }
  }, [loadProjects])

  // Initialize with first template when no diagram is selected
  useEffect(() => {
    if (selectedDiagramId) {
      return
    }

    const templates = getCurrentTemplates()
    const categories = Object.keys(templates)
    if (categories.length === 0) {
      return
    }

    setSelectedCategory((prev) => (prev ? prev : categories[0]))
    setExpandedCategories((prev) => {
      if (prev.size > 0) {
        return prev
      }
      return new Set([categories[0]])
    })

    const firstCategory = templates[categories[0]]
    const templateNames = Object.keys(firstCategory)
    if (templateNames.length > 0) {
      setSelectedTemplate((prev) => (prev ? prev : templateNames[0]))
      if (!code) {
        setCode(firstCategory[templateNames[0]])
      }
    }
  }, [diagramType, selectedDiagramId, code])

  const loadDiagramContent = useCallback(
    async (projectId: string, diagramId: string) => {
      diagramFetchToken.current += 1
      const requestId = diagramFetchToken.current
      setIsDiagramLoading(true)
      try {
        const data = await fetchDiagramFromServer(projectId, diagramId)
        if (requestId !== diagramFetchToken.current) {
          return
        }
        const diagram = data?.diagram
        if (!diagram) {
          throw new Error('Diagram tidak ditemukan')
        }

        setCurrentDiagramName(diagram.name ?? '')
        setCode(diagram.content ?? '')
        setSvgContent(diagram.renderedSvg ?? '')
        setError('')
        setSyntaxErrors([])
        setShowErrorDetails(false)
        const nextDiagramType: DiagramType =
          diagram.engine === 'PLANTUML' ? 'plantuml' : 'mermaid'
        setDiagramType(nextDiagramType)
        setSelectedCategory(diagram.category ?? '')
        setSelectedTemplate('')
      } catch (err) {
        if (requestId !== diagramFetchToken.current) {
          return
        }
        console.error(err)
        setDirectoryError(
          err instanceof Error ? err.message : 'Gagal memuat diagram terpilih',
        )
      } finally {
        if (requestId === diagramFetchToken.current) {
          setIsDiagramLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (selectedProjectId && selectedDiagramId) {
      void loadDiagramContent(selectedProjectId, selectedDiagramId)
    } else {
      diagramFetchToken.current += 1
      setIsDiagramLoading(false)
      setCurrentDiagramName('')
    }
  }, [selectedProjectId, selectedDiagramId, loadDiagramContent])

  const handleSaveDiagram = useCallback(async () => {
    if (!selectedProjectId || !selectedDiagramId) {
      setDirectoryError('Pilih diagram terlebih dahulu sebelum menyimpan')
      return
    }

    try {
      setIsSaving(true)
      setDirectoryError('')
      await updateDiagramOnServer(selectedProjectId, selectedDiagramId, {
        content: code,
        renderedSvg: svgContent || null,
      })
      toast({
        title: 'Diagram tersimpan',
        description: `Perubahan pada ${currentDiagramName || 'diagram'} berhasil disimpan.`,
      })
    } catch (err) {
      console.error(err)

      if (err instanceof Error) {
        const errorMessage = err.message

        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setDirectoryError('Kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.')
          return
        }

        if (errorMessage.includes('prisma')) {
          setDirectoryError('Terjadi kesalahan database. Silakan coba lagi.')
          return
        }

        setDirectoryError(errorMessage)
        return
      }

      setDirectoryError('Gagal menyimpan diagram')
    } finally {
      setIsSaving(false)
    }
  }, [selectedProjectId, selectedDiagramId, code, svgContent, toast, currentDiagramName])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        renderDiagram()
      }
      // Ctrl/Cmd + N to create new document
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createNewDocument()
      }
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveDiagram()
      }
      // Ctrl/Cmd + Shift + C to copy
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copyToClipboard()
      }
      // Ctrl/Cmd + Shift + S to download SVG
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        downloadSVG()
      }
      // Ctrl/Cmd + Shift + P to download PNG
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        downloadPNG()
      }
      // Escape to dismiss errors
      if (e.key === 'Escape' && error) {
        e.preventDefault()
        setError('')
        setSyntaxErrors([])
        setShowErrorDetails(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, svgContent, isLoading, error, showErrorDetails, handleSaveDiagram])

  // Initialize Mermaid
  useEffect(() => {
    if (diagramType === 'mermaid') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'monospace',
        fontSize: 16,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      })
    }
  }, [diagramType])

  const renderDiagram = async () => {
    if (!code.trim()) {
      setSvgContent('')
      setError('')
      setSyntaxErrors([])
      setShowErrorDetails(false)
      return
    }

    setIsLoading(true)
    setError('')
    setSyntaxErrors([])
    setShowErrorDetails(false)
    
    try {
      if (diagramType === 'mermaid') {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, code)
        setSvgContent(svg)
      } else {
        const response = await fetch('/api/plantuml/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) throw new Error('Failed to render PlantUML diagram')
        const data = await response.json()
        setSvgContent(data.svg)
      }
    } catch (err) {
      console.error('Render error:', err)

      // Enhanced error parsing for better syntax error messages
      let errorMessage = `Failed to render ${diagramType === 'mermaid' ? 'Mermaid' : 'PlantUML'} diagram. Please check your syntax.`
      let syntaxErrorLines: string[] = []

      if (err instanceof Error) {
        const errorString = err.message

        // Parse PlantUML-style errors
        if (diagramType === 'plantuml') {
          const plantUMLErrorMatch = errorString.match(/Parse error on line (\d+):(.*?)\n(-+)/)
          if (plantUMLErrorMatch) {
            const lineNum = plantUMLErrorMatch[1]
            const context = plantUMLErrorMatch[2].trim()
            const pointer = plantUMLErrorMatch[3]

            syntaxErrorLines = [
              `Error: Parse error on line ${lineNum}:`,
              `...${context}`,
              `${pointer}^`,
              `Expecting valid PlantUML syntax, got invalid token`
            ]
          } else {
            // Generic parsing for other PlantUML errors
            const lines = errorString.split('\n').filter(line => line.trim())
            syntaxErrorLines = lines.map(line => line.trim())
          }
        }

        // For Mermaid errors, try to extract useful information
        if (diagramType === 'mermaid' && !syntaxErrorLines.length) {
          const lines = errorString.split('\n').filter(line => line.trim())
          syntaxErrorLines = lines.map(line => line.trim())
        }
      }

      setError(errorMessage)
      setSyntaxErrors(syntaxErrorLines)
      setShowErrorDetails(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.trim()) renderDiagram()
    }, 1000)
    return () => clearTimeout(timer)
  }, [code, diagramType])

  const handleTemplateSelect = (category: string, template: string) => {
    setSelectedCategory(category)
    setSelectedTemplate(template)
    const templates = getCurrentTemplates()
    setCode(templates[category][template])
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getCurrentProject = () => projects.find((project) => project.id === selectedProjectId) || null

  const getFoldersFlat = (node: FolderNode | ProjectNode | null): FolderNode[] => {
    if (!node) return []
    const folders: FolderNode[] = node.folders ?? []
    return folders.reduce<FolderNode[]>((acc, folder) => {
      acc.push(folder)
      acc.push(...getFoldersFlat(folder))
      return acc
    }, [])
  }

  const getFolderName = (id: string | null | undefined) => {
    if (!id) return 'Root'
    const project = getCurrentProject()
    if (!project) return 'Root'
    const flatFolders = getFoldersFlat(project)
    const folder = flatFolders.find((item) => item.id === id)
    return folder?.name ?? 'Root'
  }

  const handleProjectCreate = async () => {
    try {
      if (!newProjectName.trim()) {
        setDirectoryError('Nama project wajib diisi')
        return
      }
      setIsDirectoryLoading(true)
      setDirectoryError('')
      const result = await createProjectOnServer({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      })
      const newProjectId = result?.project?.id ?? null
      setNewProjectName('')
      setNewProjectDescription('')
      setIsProjectDialogOpen(false)
      await loadProjects()
      setSelectedProjectId(newProjectId)
      setSelectedFolderId(null)
      setSelectedDiagramId(null)
      if (newProjectId) {
        setExpandedProjectNodes((prev) => {
          const next = new Set(prev)
          next.add(newProjectId)
          return next
        })
      }
    } catch (err) {
      console.error(err)

      // Enhanced error handling for specific error types
      if (err instanceof Error) {
        const errorMessage = err.message

        // Handle unique constraint errors
        if (errorMessage.includes('Unique constraint failed')) {
          setDirectoryError(`Project dengan nama "${newProjectName}" sudah ada. Silakan gunakan nama yang berbeda.`)
          return
        }

        // Handle other specific errors
        if (errorMessage.includes('prisma')) {
          setDirectoryError('Terjadi kesalahan database. Silakan coba lagi.')
          return
        }

        // Handle network/API errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setDirectoryError('Kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.')
          return
        }
      }

      // Fallback for unknown errors
      setDirectoryError(err instanceof Error ? err.message : 'Gagal membuat project')
    } finally {
      setIsDirectoryLoading(false)
    }
  }

  const handleFolderCreate = async () => {
    try {
      if (!newFolderName.trim()) {
        setDirectoryError('Nama folder wajib diisi')
        return
      }
      const projectId = selectedProjectId
      if (!projectId) {
        setDirectoryError('Pilih project terlebih dahulu')
        return
      }
      setIsDirectoryLoading(true)
      setDirectoryError('')
      const result = await createFolderOnServer(projectId, {
        name: newFolderName.trim(),
        parentId: selectedFolderId || null,
      })
      const newFolderId = result?.folder?.id ?? null
      setNewFolderName('')
      setIsFolderDialogOpen(false)
      await loadProjects()
      setSelectedProjectId(projectId)
      setSelectedFolderId(newFolderId)
      setSelectedDiagramId(null)
      setExpandedProjectNodes((prev) => {
        const next = new Set(prev)
        next.add(projectId)
        if (newFolderId) {
          next.add(newFolderId)
        }
        return next
      })

      if (newFolderId && selectedCategory && selectedTemplate) {
        const templates = getCurrentTemplates()
        const templateContent = templates[selectedCategory]?.[selectedTemplate]

        if (templateContent) {
          await handleDiagramCreateFromTemplate(
            {
              name: selectedTemplate,
              engine: diagramType === 'mermaid' ? 'MERMAID' : 'PLANTUML',
              content: templateContent,
              category: selectedCategory,
            },
            newFolderId,
          )
        }
      }
    } catch (err) {
      console.error(err)

      // Enhanced error handling for specific error types
      if (err instanceof Error) {
        const errorMessage = err.message

        // Handle unique constraint errors
        if (errorMessage.includes('Unique constraint failed')) {
          setDirectoryError(`Folder dengan nama "${newFolderName}" sudah ada di project ini. Silakan gunakan nama yang berbeda.`)
          return
        }

        // Handle other specific errors
        if (errorMessage.includes('prisma')) {
          setDirectoryError('Terjadi kesalahan database. Silakan coba lagi.')
          return
        }

        // Handle network/API errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setDirectoryError('Kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.')
          return
        }
      }

      // Fallback for unknown errors
      setDirectoryError(err instanceof Error ? err.message : 'Gagal membuat folder')
    } finally {
      setIsDirectoryLoading(false)
    }
  }

  const handleDiagramCreateFromTemplate = async (
    diagram: {
      name: string
      engine: DiagramEngine
      content: string
      category?: string | null
    },
    targetFolderId?: string | null,
  ) => {
    let finalDiagramName = diagram.name.trim()
    try {
      const projectId = selectedProjectId
      if (!projectId) {
        setDirectoryError('Pilih project sebelum menyimpan diagram')
        return
      }
      setDirectoryError('')
      setIsDirectoryLoading(true)
      const folderIdToUse =
        typeof targetFolderId === 'undefined' ? selectedFolderId : targetFolderId
      const project = projects.find((item) => item.id === projectId) ?? null
      const existingNames = getDiagramNamesInContext(project, folderIdToUse ?? null)
      finalDiagramName = generateUniqueDiagramName(finalDiagramName, existingNames)
      const result = await createDiagramOnServer(projectId, {
        name: finalDiagramName,
        engine: diagram.engine,
        content: diagram.content,
        category: diagram.category ?? null,
        folderId: folderIdToUse,
      })

      const newDiagramId = result?.diagram?.id ?? null
      const newDiagramFolderId = result?.diagram?.folderId ?? null

      setCurrentDiagramName(result?.diagram?.name ?? finalDiagramName)
      await loadProjects()
      setSelectedProjectId(projectId)
      setSelectedFolderId(newDiagramFolderId)
      setSelectedDiagramId(newDiagramId)
      if (newDiagramFolderId) {
        setExpandedProjectNodes((prev) => {
          const next = new Set(prev)
          next.add(newDiagramFolderId)
          next.add(projectId)
          return next
        })
      }
      return result?.diagram ?? null
    } catch (err) {
      console.error(err)

      // Enhanced error handling for specific error types
      if (err instanceof Error) {
        const errorMessage = err.message

        // Handle unique constraint errors
        if (errorMessage.includes('Unique constraint failed')) {
          setDirectoryError(`Diagram dengan nama "${finalDiagramName}" sudah ada di folder ini. Silakan gunakan nama yang berbeda.`)
          return
        }

        // Handle other specific errors
        if (errorMessage.includes('prisma')) {
          setDirectoryError('Terjadi kesalahan database. Silakan coba lagi.')
          return
        }

        // Handle network/API errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setDirectoryError('Kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.')
          return
        }
      }

      // Fallback for unknown errors
      setDirectoryError(err instanceof Error ? err.message : 'Gagal menyimpan diagram')
    } finally {
      setIsDirectoryLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
        // Clear errors on successful copy
        setError('')
        setSyntaxErrors([])
        setShowErrorDetails(false)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        // Clear errors on successful copy
        setError('')
        setSyntaxErrors([])
        setShowErrorDetails(false)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
      // Show error message to user
      setError('Failed to copy to clipboard. Please copy manually.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const downloadSVG = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${diagramType}-diagram.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadPNG = async () => {
    if (!svgContent) return
    
    try {
      setIsLoading(true)
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.background = 'white'
      tempContainer.style.padding = '20px'
      tempContainer.style.display = 'inline-block'
      tempContainer.innerHTML = svgContent
      
      document.body.appendChild(tempContainer)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false
      })
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${diagramType}-diagram.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, 'image/png', 1.0)
      
      document.body.removeChild(tempContainer)
    } catch (error) {
      console.error('Error generating PNG:', error)
      downloadSVG()
    } finally {
      setIsLoading(false)
    }
  }

  const clearEditor = () => {
    setCode('')
    setSvgContent('')
    setError('')
    setSyntaxErrors([])
    setShowErrorDetails(false)
  }

  const createNewDocument = useCallback(() => {
    setCode('')
    setSvgContent('')
    setError('')
    setSyntaxErrors([])
    setShowErrorDetails(false)
    setSelectedCategory('')
    setSelectedTemplate('')
    // Reset expanded categories
    setExpandedCategories(new Set())
    setSelectedDiagramId(null)
    setCurrentDiagramName('')
  }, [])

  const handleDiagramNameUpdate = async (diagramId: string, newName: string) => {
    try {
      if (!selectedProjectId) return

      setDirectoryError('')
      setIsDirectoryLoading(true)

      await updateDiagramOnServer(selectedProjectId, diagramId, { name: newName.trim() })

      // Reload projects to reflect the name change
      await loadProjects()

      // Clear editing state
      setEditingDiagramId(null)
      setEditingDiagramName('')

    } catch (err) {
      console.error(err)

      if (err instanceof Error) {
        const errorMessage = err.message

        if (errorMessage.includes('Unique constraint failed')) {
          setDirectoryError(`Diagram dengan nama "${newName}" sudah ada di folder ini. Silakan gunakan nama yang berbeda.`)
          return
        }

        if (errorMessage.includes('prisma')) {
          setDirectoryError('Terjadi kesalahan database. Silakan coba lagi.')
          return
        }

        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setDirectoryError('Kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.')
          return
        }
      }

      setDirectoryError(err instanceof Error ? err.message : 'Gagal mengupdate nama diagram')
    } finally {
      setShowErrorDetails(false)
    }
  }

  const handleDiagramCreate = async () => {
    try {
      if (!newDiagramName.trim()) {
        setDirectoryError('Nama diagram wajib diisi')
        return
      }

      if (!selectedProjectId) {
        setDirectoryError('Pilih project terlebih dahulu')
        return
      }

      setDirectoryError('')
      setIsDirectoryLoading(true)

      const templates = getCurrentTemplates()
      const templateContent = selectedCategory && selectedTemplate
        ? templates[selectedCategory]?.[selectedTemplate]
        : ''

      if (!templateContent) {
        setDirectoryError('Pilih template terlebih dahulu sebelum membuat diagram baru')
        return
      }

      const generatedName = generateUniqueDiagramName(
        newDiagramName,
        getDiagramNamesInContext(
          projects.find((project) => project.id === selectedProjectId) ?? null,
          selectedFolderId ?? null,
        ),
      )

      const result = await createDiagramOnServer(selectedProjectId, {
        name: generatedName,
        engine: diagramType === 'mermaid' ? 'MERMAID' : 'PLANTUML',
        content: templateContent,
        category: selectedCategory || null,
        folderId: selectedFolderId,
      })

      const newDiagramId = result?.diagram?.id ?? null
      const newDiagramFolderId = result?.diagram?.folderId ?? null

      setNewDiagramName('')
      setIsDiagramDialogOpen(false)
      setCurrentDiagramName(generatedName)

      await loadProjects()
      setSelectedProjectId(selectedProjectId)
      setSelectedFolderId(newDiagramFolderId)
      setSelectedDiagramId(newDiagramId)

      if (newDiagramFolderId) {
        setExpandedProjectNodes((prev) => {
          const next = new Set(prev)
          next.add(newDiagramFolderId)
          next.add(selectedProjectId)
          return next
        })
      }

    } catch (err) {
      console.error(err)

      if (err instanceof Error) {
        const errorMessage = err.message

        if (errorMessage.includes('Unique constraint failed')) {
          setDirectoryError(`Diagram dengan nama "${newDiagramName}" sudah ada di folder ini. Silakan gunakan nama yang berbeda.`)
          return
        }

        if (errorMessage.includes('prisma')) {
          setDirectoryError('Terjadi kesalahan database. Silakan coba lagi.')
          return
        }

        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setDirectoryError('Kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.')
          return
        }
      }

      setDirectoryError(err instanceof Error ? err.message : 'Gagal membuat diagram')
    } finally {
      setIsDirectoryLoading(false)
    }
  }

  const handleDiagramDoubleClick = (diagramId: string, currentName: string) => {
    setEditingDiagramId(diagramId)
    setEditingDiagramName(currentName)
  }

  const handleDiagramEditSubmit = () => {
    if (editingDiagramId && editingDiagramName.trim()) {
      handleDiagramNameUpdate(editingDiagramId, editingDiagramName.trim())
    }
  }

  const handleDiagramEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDiagramEditSubmit()
    } else if (e.key === 'Escape') {
      setEditingDiagramId(null)
      setEditingDiagramName('')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#2d2d30] border-b border-[#3e3e42] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Diagram Editor</span>
          </div>
          
          <Select value={diagramType} onValueChange={(value: DiagramType) => setDiagramType(value)}>
            <SelectTrigger className="w-40 bg-[#3c3c3c] border-[#5a5a5a] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#3c3c3c] border-[#5a5a5a]">
              <SelectItem value="mermaid">Mermaid.js</SelectItem>
              <SelectItem value="plantuml">PlantUML</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select
              value={selectedProjectId ?? undefined}
              onValueChange={(value) => {
                if (value === '__empty') {
                  setSelectedProjectId(null)
                  setSelectedFolderId(null)
                  setSelectedDiagramId(null)
                  return
                }

                setSelectedProjectId(value)
                setSelectedFolderId(null)
                setSelectedDiagramId(null)
              }}
            >
              <SelectTrigger className="w-64 bg-[#3c3c3c] border-[#5a5a5a] text-white">
                <SelectValue placeholder="Pilih Project" />
              </SelectTrigger>
              <SelectContent className="bg-[#3c3c3c] border-[#5a5a5a] max-h-64 overflow-y-auto">
                {projects.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    Belum ada project
                  </SelectItem>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Project
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1f1f1f] text-white border border-[#3c3c3c]">
                <DialogHeader>
                  <DialogTitle>Buat Project Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Nama Project</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(event) => setNewProjectName(event.target.value)}
                      placeholder="Masukkan nama project"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description">Deskripsi</Label>
                    <Textarea
                      id="project-description"
                      value={newProjectDescription}
                      onChange={(event) => setNewProjectDescription(event.target.value)}
                      placeholder="Deskripsi opsional"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Batal</Button>
                  </DialogClose>
                  <Button onClick={handleProjectCreate} disabled={isDirectoryLoading}>
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]"
                  disabled={!selectedProjectId}
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1f1f1f] text-white border border-[#3c3c3c]">
                <DialogHeader>
                  <DialogTitle>Buat Folder Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="folder-name">Nama Folder</Label>
                    <Input
                      id="folder-name"
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      placeholder="Masukkan nama folder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="folder-parent">Parent Folder</Label>
                    <Select
                      value={selectedFolderId ?? '__root'}
                      onValueChange={(value) => {
                        if (value === '__root') {
                          setSelectedFolderId(null)
                        } else {
                          setSelectedFolderId(value)
                        }
                        setSelectedDiagramId(null)
                      }}
                    >
                      <SelectTrigger className="w-full bg-[#3c3c3c] border-[#5a5a5a] text-white">
                        <SelectValue placeholder="Root" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3c3c3c] border-[#5a5a5a] max-h-64 overflow-y-auto">
                        <SelectItem value="__root">Root</SelectItem>
                        {getFoldersFlat(getCurrentProject()).map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Batal</Button>
                  </DialogClose>
                  <Button onClick={handleFolderCreate} disabled={isDirectoryLoading}>
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowTemplates((prev) => !prev)}
            size="sm"
            variant="outline"
            className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]"
          >
            {showTemplates ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide Templates
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show Templates
              </>
            )}
          </Button>
          <Button onClick={renderDiagram} disabled={isLoading} size="sm" variant="outline" className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]" title="Ctrl/Cmd + Enter">
            <Play className="w-4 h-4 mr-1" />
            Run
          </Button>
          <Button onClick={createNewDocument} size="sm" variant="outline" className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]" title="Ctrl/Cmd + N">
            <FilePlus className="w-4 h-4 mr-1" />
            New
          </Button>
          <Button onClick={copyToClipboard} size="sm" variant="outline" className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]" title="Ctrl/Cmd + S">
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          <Button onClick={downloadSVG} size="sm" variant="outline" disabled={!svgContent} className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]" title="Ctrl/Cmd + Shift + S">
            <Download className="w-4 h-4 mr-1" />
            SVG
          </Button>
          <Button onClick={downloadPNG} size="sm" variant="outline" disabled={!svgContent || isLoading} className="bg-[#3c3c3c] border-[#5a5a5a] hover:bg-[#4a4a4a]" title="Ctrl/Cmd + Shift + P">
            <Image className="w-4 h-4 mr-1" />
            PNG
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {directoryError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-4 py-2 rounded shadow-md z-50 text-sm">
            {directoryError}
          </div>
        )}
        {isDirectoryLoading && (
          <div className="absolute top-4 right-4 bg-blue-900/70 text-white px-3 py-1 rounded text-xs z-50">
            Memuat...
          </div>
        )}
        {isDiagramLoading && (
          <div className="absolute top-4 left-4 bg-blue-900/70 text-white px-3 py-1 rounded text-xs z-50">
            Memuat diagram...
          </div>
        )}
        {/* Sidebar */}
        {showTemplates && (
          <div className="w-72 bg-[#252526] border-r border-[#3e3e42] flex flex-col">
            <div className="border-b border-[#3e3e42]">
              <div className="px-3 pt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={sidebarTab === 'projects' ? 'default' : 'outline'}
                  className={`${sidebarTab === 'projects' ? 'bg-[#0e639c]' : 'bg-[#2a2d2e] border-[#3e3e42] text-gray-300 hover:bg-[#3a3d3e]'} flex-1`}
                  onClick={() => setSidebarTab('projects')}
                >
                  Project Directory
                </Button>
                <Button
                  size="sm"
                  variant={sidebarTab === 'templates' ? 'default' : 'outline'}
                  className={`${sidebarTab === 'templates' ? 'bg-[#0e639c]' : 'bg-[#2a2d2e] border-[#3e3e42] text-gray-300 hover:bg-[#3a3d3e]'} flex-1`}
                  onClick={() => setSidebarTab('templates')}
                >
                  Templates
                </Button>
              </div>

              {sidebarTab === 'templates' && (
                <div className="px-3 pb-3">
                  <Button
                    onClick={createNewDocument}
                    size="sm"
                    variant="ghost"
                    className="w-full mt-2 h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                    title="Create new blank document (Ctrl/Cmd + N)"
                  >
                    <FilePlus className="w-3 h-3 mr-1" />
                    New Blank Diagram
                  </Button>
                </div>
              )}
            </div>

            {sidebarTab === 'templates' ? (
              <div className="flex-1 overflow-y-auto">
                {Object.entries(getCurrentTemplates()).map(([category, templates]) => (
                  <div key={category} className="border-b border-[#2a2a2a]">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#2a2a2a] text-sm text-gray-300 transition-colors"
                    >
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <Folder className="w-3 h-3 text-yellow-500" />
                      {category}
                    </button>

                    {expandedCategories.has(category) && (
                      <div className="bg-[#1a1a1a]">
                        {Object.entries(templates).map(([templateName]) => (
                          <button
                            key={templateName}
                            onClick={() => handleTemplateSelect(category, templateName)}
                            className={`w-full px-6 py-1 text-left text-xs hover:bg-[#2a2a2a] transition-colors flex items-center gap-2 ${
                              selectedCategory === category && selectedTemplate === templateName
                                ? 'bg-[#094771] text-white'
                                : 'text-gray-400'
                            }`}
                          >
                            <File className="w-3 h-3" />
                            {templateName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="px-4 py-6 text-xs text-gray-400 space-y-2">
                    <p>Belum ada project.</p>
                    <p>Gunakan tombol <span className="text-white">Project</span> di header untuk membuat project baru.</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {projects.map((project) => (
                      <ProjectTree
                        key={project.id}
                        project={project}
                        expandedNodes={expandedProjectNodes}
                        onToggleNode={(nodeId) => {
                          setExpandedProjectNodes((prev) => {
                            const next = new Set(prev)
                            if (next.has(nodeId)) {
                              next.delete(nodeId)
                            } else {
                              next.add(nodeId)
                            }
                            return next
                          })
                        }}
                        selectedFolderId={selectedFolderId}
                        selectedDiagramId={selectedDiagramId}
                        selectedProjectId={selectedProjectId}
                        onSelectProject={(projectId) => {
                          setSelectedProjectId(projectId)
                          setSelectedFolderId(null)
                          setSelectedDiagramId(null)
                        }}
                        onSelectFolder={(projectId, folderId) => {
                          setSelectedProjectId(projectId)
                          setSelectedFolderId(folderId)
                          setSelectedDiagramId(null)
                          if (folderId) {
                            setExpandedProjectNodes((prev) => {
                              const next = new Set(prev)
                              next.add(folderId)
                              next.add(projectId)
                              return next
                            })
                          }
                        }}
                        onSelectDiagram={(projectId, diagramId, folderId) => {
                          setSelectedProjectId(projectId)
                          setSelectedDiagramId(diagramId)
                          setSelectedFolderId(folderId ?? null)
                          if (folderId) {
                            setExpandedProjectNodes((prev) => {
                              const next = new Set(prev)
                              next.add(folderId)
                              next.add(projectId)
                              return next
                            })
                          }
                        }}
                        onCreateDiagram={async (projectId, folderId) => {
                          setSelectedProjectId(projectId)
                          setSelectedFolderId(folderId)
                          const templates = getCurrentTemplates()
                          const templateContent = selectedCategory
                            ? templates[selectedCategory]?.[selectedTemplate]
                            : null

                          if (!selectedCategory || !selectedTemplate || !templateContent) {
                            setDirectoryError('Pilih template terlebih dahulu sebelum menambah diagram baru')
                            return
                          }

                          await handleDiagramCreateFromTemplate(
                            {
                              name: selectedTemplate,
                              engine: diagramType === 'mermaid' ? 'MERMAID' : 'PLANTUML',
                              content: templateContent,
                              category: selectedCategory,
                            },
                            folderId ?? null,
                          )
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'templates' && (
              <div className="border-t border-[#2a2a2a] p-3">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    if (!selectedCategory || !selectedTemplate) return
                    const templates = getCurrentTemplates()
                    const selectedContent = templates[selectedCategory]?.[selectedTemplate]
                    if (!selectedContent) return
                    handleDiagramCreateFromTemplate({
                      name: selectedTemplate,
                      engine: diagramType === 'mermaid' ? 'MERMAID' : 'PLANTUML',
                      content: selectedContent,
                      category: selectedCategory,
                    })
                  }}
                  disabled={!selectedProjectId || !selectedCategory || !selectedTemplate}
                >
                  Simpan Diagram ke {getFolderName(selectedFolderId)}
                </Button>
              </div>
            )}

            {sidebarTab === 'projects' && (
              <div className="border-t border-[#2a2a2a] p-3 space-y-2">
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => setIsProjectDialogOpen(true)}
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Project Baru
                  </Button>
                  <Button
                    className="flex-1"
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsFolderDialogOpen(true)}
                    disabled={!selectedProjectId}
                  >
                    <Folder className="w-4 h-4 mr-1" />
                    Folder Baru
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editor and Preview */}
        <div className="flex-1 flex">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col">
            <div className="bg-[#2d2d30] border-b border-[#3e3e42] px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">{diagramType === 'mermaid' ? 'Mermaid' : 'PlantUML'} Editor</span>
              <Button onClick={clearEditor} size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                Clear
              </Button>
            </div>
            
            <div className="flex-1">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              }>
                <Editor
                  height="100%"
                  language={diagramType === 'mermaid' ? 'yaml' : 'plantuml'}
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  beforeMount={(monaco) => {
                    // Register PlantUML language when Monaco loads
                    if (typeof window !== 'undefined') {
                      registerPlantUML()
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    folding: true,
                    fontSize: 13,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    suggest: {
                      showKeywords: true,
                      showSnippets: true,
                    },
                    quickSuggestions: {
                      other: true,
                      comments: false,
                      strings: false,
                    },
                    parameterHints: {
                      enabled: true,
                    },
                  }}
                />
              </Suspense>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col border-l border-[#3e3e42]">
            <div className="bg-[#2d2d30] border-b border-[#3e3e42] px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </span>
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            </div>
            
            <div className="flex-1 bg-white p-4 overflow-auto">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-red-500 max-w-md">
                    <div className="mb-4">
                      <p className="mb-2 font-semibold">{error}</p>
                      {syntaxErrors.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setShowErrorDetails(!showErrorDetails)}
                              className="text-xs bg-red-900 hover:bg-red-800 px-3 py-1 rounded transition-colors"
                            >
                              {showErrorDetails ? 'Hide Details' : 'Show Details'}
                            </button>
                            <button
                              onClick={() => {
                                setError('')
                                setSyntaxErrors([])
                                setShowErrorDetails(false)
                              }}
                              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                              title="Dismiss error"
                            >
                              ✕
                            </button>
                          </div>

                          {showErrorDetails && (
                            <div className="bg-red-950 border border-red-800 rounded p-3 text-left max-h-48 overflow-y-auto">
                              <div className="font-mono text-xs text-red-300 space-y-1">
                                {syntaxErrors.map((errorLine, index) => (
                                  <div key={index} className="whitespace-pre-wrap">
                                    {errorLine}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button onClick={renderDiagram} size="sm" className="bg-red-700 hover:bg-red-600">
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
              
              {!isLoading && !error && svgContent && (
                <div 
                  ref={svgRef}
                  className="flex items-center justify-center min-h-full"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              )}
              
              {!isLoading && !error && !svgContent && (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Run the code to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#007acc] px-4 py-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span>{diagramType === 'mermaid' ? 'Mermaid' : 'PlantUML'}</span>
          <span>{code.split('\n').length} lines</span>
          {error && (
            <span className="flex items-center gap-1 text-red-300">
              <span className="text-red-400">⚠</span>
              Syntax Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>{selectedTemplate || 'No template'}</span>
          <span>UTF-8</span>
          <span>{diagramType === 'mermaid' ? 'YAML' : 'PlantUML'}</span>
        </div>
      </div>
    </div>
  )
}