/**
 * Rendering Engine Module - Enterprise Diagram IDE
 * Handles diagram rendering and visualization.
 *
 * This module provides optimized rendering capabilities for different diagram types,
 * including Mermaid and PlantUML, with performance optimizations and error handling.
 *
 * @module RenderingEngine
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

import { detectDiagramType } from '../utils/DiagramUtils.js';

/**
 * RenderingEngine class - Handles diagram rendering operations
 * @class
 */
export class RenderingEngine {
    /**
     * Creates a new RenderingEngine instance
     * @constructor
     */
    constructor() {
        /**
         * Render cache for performance optimization
         * @type {Map}
         * @private
         */
        this.renderCache = new Map();

        /**
         * Maximum cache size
         * @type {number}
         * @private
         */
        this.maxCacheSize = 50;
    }

    /**
     * Renders a diagram based on content type
     * @param {string} content - Diagram content
     * @param {string} containerId - Container element ID
     * @returns {Promise<Object>} Render result
     * @public
     */
    async renderDiagram(content, containerId) {
        const cacheKey = this.generateCacheKey(content, containerId);

        // Check cache first
        if (this.renderCache.has(cacheKey)) {
            return this.renderCache.get(cacheKey);
        }

        const type = await this.detectDiagramType(content);
        let result;

        try {
            switch (type) {
                case 'mermaid':
                    result = await this.renderMermaid(content, containerId);
                    break;
                case 'plantuml':
                    result = await this.renderPlantuml(content, containerId);
                    break;
                default:
                    result = this.renderPlainText(content, containerId);
            }

            // Cache successful renders
            this.cacheResult(cacheKey, result);

            return result;
        } catch (error) {
            console.error('Diagram rendering failed:', error);
            throw new Error(`Rendering failed: ${error.message}`);
        }
    }

    /**
     * Renders Mermaid diagram
     * @param {string} content - Mermaid content
     * @param {string} containerId - Container ID
     * @returns {Promise<Object>} Render result
     * @private
     */
    async renderMermaid(content, containerId) {
        if (!window.mermaid) {
            throw new Error('Mermaid library not loaded');
        }

        // Configure Mermaid
        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';

        window.mermaid.initialize({
            startOnLoad: false,
            theme: theme,
            securityLevel: 'loose',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            fontSize: 14,
            flowchart: {
                useMaxWidth: false,
                htmlLabels: true,
                curve: 'basis'
            }
        });

        try {
            const { svg, bindFunctions } = await window.mermaid.render(containerId, content);
            return {
                type: 'mermaid',
                content: svg,
                bindFunctions: bindFunctions,
                success: true
            };
        } catch (error) {
            throw new Error(`Mermaid rendering error: ${error.message}`);
        }
    }

    /**
     * Renders PlantUML diagram
     * @param {string} content - PlantUML content
     * @param {string} containerId - Container ID
     * @returns {Promise<Object>} Render result
     * @private
     */
    async renderPlantuml(content, containerId) {
        if (!window.plantumlEncoder) {
            throw new Error('PlantUML encoder not loaded');
        }

        try {
            const encoded = window.plantumlEncoder.encode(content);
            const imageUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;

            return {
                type: 'plantuml',
                content: imageUrl,
                success: true
            };
        } catch (error) {
            throw new Error(`PlantUML encoding error: ${error.message}`);
        }
    }

    /**
     * Renders plain text content
     * @param {string} content - Text content
     * @param {string} containerId - Container ID
     * @returns {Object} Render result
     * @private
     */
    renderPlainText(content, containerId) {
        const formattedContent = content || 'No content to display';

        return {
            type: 'text',
            content: formattedContent,
            success: true
        };
    }

    /**
     * Generates cache key for content
     * @param {string} content - Content
     * @param {string} containerId - Container ID
     * @returns {string} Cache key
     * @private
     */
    generateCacheKey(content, containerId) {
        // Simple hash function for content
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return `${containerId}_${hash}`;
    }

    /**
     * Caches render result
     * @param {string} key - Cache key
     * @param {Object} result - Render result
     * @private
     */
    cacheResult(key, result) {
        // Implement LRU-style cache eviction
        if (this.renderCache.size >= this.maxCacheSize) {
            const firstKey = this.renderCache.keys().next().value;
            this.renderCache.delete(firstKey);
        }

        this.renderCache.set(key, result);
    }

    /**
     * Clears render cache
     * @public
     */
    clearCache() {
        this.renderCache.clear();
    }

    /**
     * Gets cache statistics
     * @returns {Object} Cache statistics
     * @public
     */
    getCacheStats() {
        return {
            size: this.renderCache.size,
            maxSize: this.maxCacheSize,
            hitRatio: 0 // Could be implemented with additional tracking
        };
    }

    /**
     * Validates diagram content
     * @param {string} content - Content to validate
     * @returns {Object} Validation result
     * @public
     */
    validateContent(content) {
        const type = detectDiagramType(content);
        const result = {
            type: type,
            valid: false,
            errors: []
        };

        if (!content || content.trim().length === 0) {
            result.errors.push('Content is empty');
            return result;
        }

        switch (type) {
            case 'mermaid':
                // Basic Mermaid validation
                if (!content.includes('\n') && !content.includes(' ')) {
                    result.errors.push('Mermaid diagram appears incomplete');
                } else {
                    result.valid = true;
                }
                break;

            case 'plantuml':
                // Basic PlantUML validation
                if (!content.includes('@enduml') && !content.includes('@endmindmap')) {
                    result.errors.push('PlantUML diagram missing end tag');
                } else {
                    result.valid = true;
                }
                break;

            default:
                result.valid = true; // Plain text is always valid
        }

        return result;
    }

    /**
     * Gets supported diagram types
     * @returns {Array<string>} Supported types
     * @public
     */
    getSupportedTypes() {
        return ['mermaid', 'plantuml', 'text'];
    }

    /**
     * Gets rendering capabilities
     * @returns {Object} Capabilities object
     * @public
     */
    getCapabilities() {
        return {
            mermaid: !!window.mermaid,
            plantuml: !!window.plantumlEncoder,
            caching: true,
            themes: true
        };
    }
}

// Utility functions for diagram processing

/**
 * Extracts diagram metadata
 * @param {string} content - Diagram content
 * @returns {Object} Metadata object
 */
export function extractDiagramMetadata(content) {
    const metadata = {
        type: 'unknown',
        title: null,
        description: null,
        complexity: 'simple'
    };

    if (!content) {
        return metadata;
    }

    // Detect type
    const typePatterns = {
        mermaid: /^\s*(graph|flowchart|sequenceDiagram|classDiagram)/m,
        plantuml: /^\s*@startuml/m
    };

    for (const [type, pattern] of Object.entries(typePatterns)) {
        if (pattern.test(content)) {
            metadata.type = type;
            break;
        }
    }

    // Extract title (basic implementation)
    const titleMatch = content.match(/^%%\s*title:\s*(.+)$/m);
    if (titleMatch) {
        metadata.title = titleMatch[1].trim();
    }

    // Estimate complexity
    const lines = content.split('\n').length;
    if (lines > 50) {
        metadata.complexity = 'complex';
    } else if (lines > 20) {
        metadata.complexity = 'medium';
    }

    return metadata;
}

/**
 * Formats diagram content for better readability
 * @param {string} content - Raw content
 * @param {string} type - Diagram type
 * @returns {string} Formatted content
 */
export function formatDiagramContent(content, type) {
    if (!content) {
        return content;
    }

    let formatted = content.trim();

    switch (type) {
        case 'mermaid':
            // Ensure proper line breaks and spacing
            formatted = formatted.replace(/\s*\n\s*/g, '\n');
            break;

        case 'plantuml':
            // Ensure proper PlantUML formatting
            if (!formatted.endsWith('@enduml') && !formatted.endsWith('@endmindmap')) {
                formatted += '\n@enduml';
            }
            break;
    }

    return formatted;
}

// Default export for convenience
export default RenderingEngine;
