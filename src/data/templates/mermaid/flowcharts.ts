export const mermaidFlowcharts = {
  'Basic Flowchart': `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`,
  'Decision Flow': `graph TD
    A[Start Process] --> B{Decision}
    B -->|Option 1| C[Process 1]
    B -->|Option 2| D[Process 2]
    B -->|Option 3| E[Process 3]
    C --> F[End]
    D --> F
    E --> F`,
  'Subgraph': `graph TD
    subgraph "Group 1"
        A1[Node A1] --> A2[Node A2]
        A2 --> A3[Node A3]
    end
    subgraph "Group 2"
        B1[Node B1] --> B2[Node B2]
        B2 --> B3[Node B3]
    end
    A3 --> B1`
} as const
