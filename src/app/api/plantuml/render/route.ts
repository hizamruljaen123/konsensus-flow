import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'plantuml-encoder'

const PLANTUML_SERVERS = [
  'https://www.plantuml.com/plantuml',
  'https://kroki.io/plantuml/svg',
  'http://www.plantuml.com/plantuml'
]

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'PlantUML code is required' },
        { status: 400 }
      )
    }

    try {
      // Encode PlantUML code
      const encoded = encode(code)
      
      // Try different servers
      for (const server of PLANTUML_SERVERS) {
        try {
          let svgUrl: string
          
          if (server.includes('kroki')) {
            // Kroki.io uses different format
            svgUrl = `${server}/${Buffer.from(code).toString('base64')}`
          } else {
            // PlantUML.com format
            svgUrl = `${server}/svg/${encoded}`
          }
          
          console.log(`Trying server: ${server}`)
          
          // Fetch the SVG with timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          const response = await fetch(svgUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DiagramEditor/1.0)'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const svg = await response.text()
            
            // Validate that we got actual SVG content
            if (svg.includes('<svg') && svg.includes('</svg>')) {
              console.log(`Successfully fetched from: ${server}`)
              return NextResponse.json({ svg })
            }
          }
        } catch (serverError) {
          console.log(`Server ${server} failed:`, serverError)
          continue
        }
      }
      
      throw new Error('All PlantUML servers failed')
      
    } catch (plantumlError) {
      console.error('PlantUML rendering error:', plantumlError)
      return NextResponse.json(
        { 
          error: 'Invalid PlantUML syntax or server unavailable',
          details: plantumlError instanceof Error ? plantumlError.message : 'Unknown error'
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}