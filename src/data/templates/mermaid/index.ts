import { mermaidFlowcharts } from './flowcharts'
import { mermaidSequenceDiagrams } from './sequence'
import { mermaidClassDiagrams } from './class-diagrams'
import { mermaidStateDiagrams } from './state-diagrams'
import { mermaidGanttCharts } from './gantt'

export const mermaidTemplates = {
  Flowcharts: mermaidFlowcharts,
  'Sequence Diagrams': mermaidSequenceDiagrams,
  'Class Diagrams': mermaidClassDiagrams,
  'State Diagrams': mermaidStateDiagrams,
  'Gantt Charts': mermaidGanttCharts,
} as const
