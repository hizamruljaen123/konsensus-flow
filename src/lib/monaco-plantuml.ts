import * as monaco from 'monaco-editor'

// PlantUML language definition
export const plantumlLanguageDefinition = {
  id: 'plantuml',
  extensions: ['.puml', '.plantuml'],
  aliases: ['PlantUML', 'plantuml'],
  mimetypes: ['text/x-plantuml'],
  
  configuration: {
    comments: {
      lineComment: "'",
      blockComment: ["/'", "'/"]
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  }
}

// PlantUML tokenizer
export const plantumlTokenizer = {
  tokenizer: {
    root: [
      // Start and end tags
      [/@startuml/, 'keyword'],
      [/@enduml/, 'keyword'],
      
      // Comments
      ["'", 'comment'],
      ["/\\*", 'comment', '@comment'],
      
      // Keywords
      [/^(actor|participant|usecase|rectangle|package|class|interface|enum|abstract|annotation|namespace|database|entity|control|boundary|collections|queue|stack|map|file|folder|node|cloud|storage|frame|card|archimate|component|interface|object|agent|artifact|boundary|control|entity|database|queue|stack|map|file|folder|node|cloud|storage|frame|card|archimate|note|left|right|top|bottom|link|legend|title|header|footer|caption|center|footer|header|newpage|title|legend|endlegend|caption|scale|size|orientation|rotate|title|caption|header|footer|newpage|skin|style|stylesheet|include|!include|!define|!undef|!definelong|!enddefinelong|!procedure|!endprocedure|!unquoted|!literal|!endliteral|!include_many|!include_path|!local|!theme|!icon|!iconsize|!disable_dot|!enable_dot|!disable_c4|!enable_c4|!disable_svg|!enable_svg|!disable_png|!enable_png|!disable_txt|!enable_txt|!disable_eps|!enable_eps|!disable_pdf|!enable_pdf|!disable_vdx|!enable_vdx|!disable_xmi|!enable_xmi|!disable_scxml|!enable_scxml|!disable_html|!enable_html|!disable_docbook|!enable_docbook|!disable_latex|!enable_latex|!disable_ooxml|!enable_ooxml|!disable_bpmn|!enable_bpmn|start|stop|if|then|else|endif|while|endwhile|repeat|endrepeat|fork|endfork|detach|kill|destroy|create|activate|deactivate|alt|else|end|opt|endopt|loop|endloop|par|endpar|break|critical|endcritical|group|endgroup)(?=\s)/, 'keyword'],
      
      // Arrows and relationships
      [/<-->/, 'operator'],
      [/-->/, 'operator'],
      [/->/, 'operator'],
      [/<--/, 'operator'],
      [/<\|>/, 'operator'],
      [/\|>/, 'operator'],
      [/<\|/, 'operator'],
      [/\|/, 'operator'],
      [/\\/, 'operator'],
      [/\.\./, 'operator'],
      [/--/, 'operator'],
      [/\.\./, 'operator'],
      [/\.\./, 'operator'],
      [/\.\./, 'operator'],
      
      // Modifiers
      [/\[.*?\]/, 'type'],
      [/\(.*?\)/, 'type'],
      [/\{.*?\}/, 'type'],
      [/as\s+\w+/, 'variable'],
      [/:\s*.*$/, 'string'],
      
      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
      
      // Numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],
      
      // Identifiers
      [/\w+/, 'identifier']
    ],
    
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],
    
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop']
    ]
  }
}

// Register PlantUML language
export function registerPlantUML() {
  if (typeof window !== 'undefined') {
    // Dynamic import to avoid SSR issues
    import('monaco-editor').then((monaco) => {
      try {
        monaco.languages.register({ id: 'plantuml' })
        monaco.languages.setLanguageConfiguration('plantuml', plantumlLanguageDefinition.configuration)
        monaco.languages.setMonarchTokensProvider('plantuml', plantumlTokenizer)
      } catch (error) {
        console.warn('Failed to register PlantUML language:', error)
      }
    }).catch((error) => {
      console.warn('Failed to load Monaco Editor:', error)
    })
  }
}