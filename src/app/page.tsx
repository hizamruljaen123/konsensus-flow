'use client'

import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Download, RefreshCw, Eye, EyeOff, Code2, Image, File, Folder, ChevronDown, ChevronRight, Play, Settings, GitBranch, Terminal, FilePlus, PlusCircle } from 'lucide-react'
import mermaid from 'mermaid'
import html2canvas from 'html2canvas'
import { registerPlantUML } from '@/lib/monaco-plantuml'
import { mermaidTemplates } from '@/data/templates/mermaid'
import { plantumlTemplates } from '@/data/templates/plantuml'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
}

type FolderNode = {
  id: string
  name: string
  parentId: string | null
  projectId: string
  diagrams: DiagramNode[]
  folders: FolderNode[]
}

type ProjectNode = {
  id: string
  name: string
  description: string | null
  diagrams: DiagramNode[]
  folders: FolderNode[]
}

type ProjectApiResponse = {
  projects: ProjectNode[]
}

async function fetchProjects(): Promise<ProjectNode[]> {
  const response = await fetch('/api/projects', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  const data = (await response.json()) as ProjectApiResponse
  return data.projects
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
  const [error, setError] = useState('')
  const [theme, setTheme] = useState('vs-dark')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showTemplates, setShowTemplates] = useState(true)
  const [projects, setProjects] = useState<ProjectNode[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [directoryError, setDirectoryError] = useState('')
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false)
  const svgRef = useRef<HTMLDivElement>(null)

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
      if (projectData.length > 0) {
        setSelectedProjectId((current) => current || projectData[0].id)
      } else {
        setSelectedProjectId('')
      }
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

  // Initialize with first template
  useEffect(() => {
    const templates = getCurrentTemplates()
    const categories = Object.keys(templates)
    if (categories.length > 0) {
      setSelectedCategory(categories[0])
      setExpandedCategories(new Set([categories[0]]))
      
      const firstCategory = templates[categories[0]]
      const templateNames = Object.keys(firstCategory)
      if (templateNames.length > 0) {
        setSelectedTemplate(templateNames[0])
        setCode(firstCategory[templateNames[0]])
      }
    }
  }, [diagramType])

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
      // Ctrl/Cmd + S to copy
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, svgContent, isLoading])

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
      return
    }

    setIsLoading(true)
    setError('')
    
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
      setError(`Failed to render ${diagramType === 'mermaid' ? 'Mermaid' : 'PlantUML'} diagram. Please check your syntax.`)
      console.error(err)
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

  const getFolderName = (id: string | null) => {
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
      await createProjectOnServer({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      })
      setNewProjectName('')
      setNewProjectDescription('')
      setIsProjectDialogOpen(false)
      await loadProjects()
    } catch (err) {
      console.error(err)
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
      await createFolderOnServer(projectId, {
        name: newFolderName.trim(),
        parentId: selectedFolderId || null,
      })
      setNewFolderName('')
      setSelectedFolderId('')
      setIsFolderDialogOpen(false)
      await loadProjects()
    } catch (err) {
      console.error(err)
      setDirectoryError(err instanceof Error ? err.message : 'Gagal membuat folder')
    } finally {
      setIsDirectoryLoading(false)
    }
  }

  const handleDiagramCreateFromTemplate = async (diagram: {
    name: string
    engine: DiagramEngine
    content: string
    category?: string | null
  }) => {
    try {
      const projectId = selectedProjectId
      if (!projectId) {
        setDirectoryError('Pilih project sebelum menyimpan diagram')
        return
      }
      setDirectoryError('')
      setIsDirectoryLoading(true)
      await createDiagramOnServer(projectId, {
        name: diagram.name,
        engine: diagram.engine,
        content: diagram.content,
        category: diagram.category ?? null,
        folderId: selectedFolderId || null,
      })
      await loadProjects()
    } catch (err) {
      console.error(err)
      setDirectoryError(err instanceof Error ? err.message : 'Gagal menyimpan diagram')
    } finally {
      setIsDirectoryLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
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
  }

  const createNewDocument = useCallback(() => {
    setCode('')
    setSvgContent('')
    setError('')
    setSelectedCategory('')
    setSelectedTemplate('')
    // Reset expanded categories
    setExpandedCategories(new Set())
  }, [])

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
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showTemplates && (
          <div className="w-64 bg-[#252526] border-r border-[#3e3e42] flex flex-col">
            <div className="p-3 border-b border-[#3e3e42]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <Folder className="w-4 h-4" />
                  Templates
                </div>
                <Button 
                  onClick={createNewDocument} 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                  title="Create new blank document (Ctrl/Cmd + N)"
                >
                  <FilePlus className="w-3 h-3 mr-1" />
                  New
                </Button>
              </div>
            </div>
            
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
                  <div className="text-center text-red-500">
                    <p className="mb-2">{error}</p>
                    <Button onClick={renderDiagram} size="sm">Try Again</Button>
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