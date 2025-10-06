export const mermaidSequenceDiagrams = {
  'Basic Sequence': `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great! How about you?
    Alice-->>Bob: I'm good too!`,
  'Complex Sequence': `sequenceDiagram
    participant User as UI
    participant API as Backend
    participant DB as Database
    
    User->>API: POST /data
    API->>DB: Save data
    DB-->>API: Success
    API-->>User: Response with data`,
  'Loop Sequence': `sequenceDiagram
    participant Client
    participant Server
    
    loop Health Check
        Client->>Server: Ping
        Server-->>Client: Pong
    end`
} as const
