/**
 * Diagram IDE - Main Application Entry Point
 * Enterprise Edition - SP500 Company Standard
 *
 * This is the main entry point for the Diagram IDE application. It initializes
 * all modules and coordinates the application startup process.
 *
 * @module App
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

// Import core modules
import { DiagramModel } from './core/Model.js';
import { DiagramView } from './core/View.js';
import { DiagramController } from './core/Controller.js';

// Import rendering engine
import { RenderingEngine } from './rendering/RenderingEngine.js';

/**
 * Application configuration
 * @constant {Object}
 */
const CONFIG = {
    name: 'Diagram IDE',
    version: '1.0.0',
    author: 'Diagram IDE Team',
    debug: false
};

/**
 * Application class - Main application coordinator
 * @class
 */
class DiagramIDE {
    /**
     * Creates and initializes the Diagram IDE application
     * @constructor
     */
    constructor() {
        /**
         * Application configuration
         * @type {Object}
         * @private
         */
        this.config = CONFIG;

        /**
         * Application model instance
         * @type {DiagramModel}
         * @private
         */
        this.model = null;

        /**
         * Application view instance
         * @type {DiagramView}
         * @private
         */
        this.view = null;

        /**
         * Application controller instance
         * @type {DiagramController}
         * @private
         */
        this.controller = null;

        /**
         * Rendering engine instance
         * @type {RenderingEngine}
         * @private
         */
        this.renderingEngine = null;

        // Initialize application
        this.initialize();
    }

    /**
     * Initializes the application components
     * @private
     */
    initialize() {
        try {
            console.log(`Initializing ${this.config.name} v${this.config.version}`);

            // Create core components
            this.renderingEngine = new RenderingEngine();
            this.model = new DiagramModel();
            this.view = new DiagramView();
            this.controller = new DiagramController(this.model, this.view);

            // Store global reference for debugging
            window.diagramApp = this;

            // Log successful initialization
            console.log(`${this.config.name} initialized successfully`);

            // Log rendering engine capabilities
            const capabilities = this.renderingEngine.getCapabilities();
            console.log('Rendering capabilities:', capabilities);

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Handles initialization errors
     * @param {Error} error - Initialization error
     * @private
     */
    handleInitializationError(error) {
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 20px;
            max-width: 400px;
            text-align: center;
            z-index: 10000;
        `;

        errorDiv.innerHTML = `
            <h3 style="color: #dc3545; margin-bottom: 15px;">Application Error</h3>
            <p style="margin-bottom: 15px;">Failed to initialize ${this.config.name}</p>
            <p style="font-size: 0.9em; color: #6c757d; margin-bottom: 15px;">
                ${error.message}
            </p>
            <button onclick="location.reload()" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                cursor: pointer;
            ">Reload Application</button>
        `;

        document.body.appendChild(errorDiv);
    }

    /**
     * Gets application information
     * @returns {Object} Application info
     * @public
     */
    getInfo() {
        return {
            name: this.config.name,
            version: this.config.version,
            author: this.config.author,
            components: {
                model: !!this.model,
                view: !!this.view,
                controller: !!this.controller,
                renderingEngine: !!this.renderingEngine
            },
            renderingCapabilities: this.renderingEngine ? this.renderingEngine.getCapabilities() : null
        };
    }

    /**
     * Gets current application state
     * @returns {Object} Application state
     * @public
     */
    getState() {
        return {
            currentProject: this.model ? this.model.getCurrentProject() : null,
            currentFile: this.model ? this.model.getCurrentFile() : null,
            settings: this.model ? this.model.getSettings() : null,
            cacheStats: this.renderingEngine ? this.renderingEngine.getCacheStats() : null
        };
    }

    /**
     * Clears rendering cache
     * @public
     */
    clearCache() {
        if (this.renderingEngine) {
            this.renderingEngine.clearCache();
            console.log('Rendering cache cleared');
        }
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Application startup
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize the application
        const app = new DiagramIDE();

        // Log startup information
        console.log('Diagram IDE application started successfully');
        console.log('App info:', app.getInfo());

        if (app.config.debug) {
            console.log('Debug mode enabled');
            window.app = app; // Expose for debugging
        }

    } catch (error) {
        console.error('Failed to start application:', error);

        // Fallback error display
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 5px;
            max-width: 300px;
            z-index: 10000;
        `;
        errorMsg.innerHTML = `
            <strong>Critical Error</strong><br>
            Failed to start Diagram IDE<br>
            Check console for details
        `;
        document.body.appendChild(errorMsg);
    }
});

// Export for potential external use
export { DiagramIDE };
export default DiagramIDE;
