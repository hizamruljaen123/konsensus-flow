export const mermaidGanttCharts = {
  'Project Timeline': `gantt
    title Project Development Timeline
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements     :a1, 2024-01-01, 7d
    Design           :a2, after a1, 5d
    section Development
    Frontend         :b1, after a2, 14d
    Backend          :b2, after a2, 10d
    section Testing
    Testing          :c1, after b1, 7d
    Deployment       :c2, after c1, 3d`,
  'Sprint Planning': `gantt
    title Sprint 2
    dateFormat  YYYY-MM-DD
    section Features
    User Auth       :s1, 2024-01-15, 3d
    Dashboard       :s2, after s1, 4d
    Reports         :s3, after s2, 5d
    section Bug Fixes
    Critical Bugs   :b1, 2024-01-15, 2d
    Minor Fixes     :b2, after b1, 3d`
} as const
