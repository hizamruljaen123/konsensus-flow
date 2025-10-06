export const mermaidStateDiagrams = {
  'Basic State': `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Start
    Processing --> Completed: Finish
    Completed --> Idle: Reset`,
  'Complex State': `stateDiagram-v2
    [*] --> Off
    Off --> On: Power On
    On --> Active: Activate
    Active --> Paused: Pause
    Paused --> Active: Resume
    Active --> Off: Power Off
    On --> Off: Power Off`,
  'Nested States': `stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Idle
        Idle --> Processing: Start
        Processing --> Idle: Complete
    }
    Active --> Inactive: Sleep
    Inactive --> Active: Wake`
} as const
