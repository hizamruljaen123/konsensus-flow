export const detectDiagramType = (content = '') => {
    const trimmed = content.trim();

    if (!trimmed) {
        return 'unknown';
    }

    const mermaidPatterns = [
        'graph ',
        'flowchart ',
        'sequenceDiagram',
        'classDiagram',
        'stateDiagram'
    ];

    if (mermaidPatterns.some((pattern) => trimmed.includes(pattern)) || /^\s*graph\s+/i.test(trimmed)) {
        return 'mermaid';
    }

    const plantumlPatterns = [
        '@startuml',
        '@startmindmap',
        '@startwbs',
        'skinparam'
    ];

    if (
        plantumlPatterns.some((pattern) => trimmed.startsWith(pattern) || trimmed.includes(pattern)) ||
        (trimmed.includes('->') && trimmed.includes(':'))
    ) {
        return 'plantuml';
    }

    return 'unknown';
};
