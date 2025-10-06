import { plantumlUseCaseDiagrams } from './use-cases'
import { plantumlClassDiagrams } from './class-diagrams'
import { plantumlSequenceDiagrams } from './sequence'
import { plantumlActivityDiagrams } from './activity'
import { plantumlComponentDiagrams } from './component-diagrams'

export const plantumlTemplates = {
  'Use Case Diagrams': plantumlUseCaseDiagrams,
  'Class Diagrams': plantumlClassDiagrams,
  'Sequence Diagrams': plantumlSequenceDiagrams,
  'Activity Diagrams': plantumlActivityDiagrams,
  'Component Diagrams': plantumlComponentDiagrams,
} as const
