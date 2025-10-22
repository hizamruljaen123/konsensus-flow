/**
 * Controller Module - Enterprise Diagram IDE
 * Manages user interactions and coordinates between Model and View.
 *
 * This module handles all user input, processes business logic, and acts as
 * the intermediary between the data model and user interface components.
 *
 * @module Controller
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

import { DiagramModel } from './Model.js';
import { DiagramView } from './View.js';

/**
 * DiagramController class - Manages user interactions and business logic
 * @class
 */
export class DiagramController {
    /**
     * Creates a new DiagramController instance
     * @param {DiagramModel} model - Application model
     * @param {DiagramView} view - Application view
     * @constructor
     */
    constructor(model, view) {
        /**
         * Application model reference
         * @type {DiagramModel}
         * @private
         */
        this.model = model;

        /**
         * Application view reference
         * @type {DiagramView}
         * @private
         */
        this.view = view;

        // Initialize controller
        this.initializeController();

        // Store model and controller references in view for tree operations
        this.view.model = model;
        this.view.controller = this;
    }

    /**
     * Initializes controller with event handlers and setup
     * @private
     */
    initializeController() {
        // Update view with initial model data
        this.view.update(this.model);

        // Set up all event handlers
        this.setupProjectManagement();
        this.setupToolbarHandlers();
        this.setupFileOperations();
        this.setupContextMenu();
        this.setupAutoSave();
        this.setupMenuHandlers();

        // Render initial content
        this.renderInitialContent();
    }

    /**
     * Sets up project management handlers
     * @private
     */
    setupProjectManagement() {
        // New project button
        if (this.view.elements.newProjectBtn) {
            this.view.elements.newProjectBtn.addEventListener('click', () => {
                this.handleNewProject();
            });
        }

        // Export project button
        if (this.view.elements.exportProjectBtn) {
            this.view.elements.exportProjectBtn.addEventListener('click', async () => {
                await this.handleExportProject();
            });
        }

        // Import project functionality (dropdown menu)
        const importBtn = document.getElementById('import-project');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.handleImportProject();
            });
        }
    }

    /**
     * Sets up toolbar button handlers
     * @private
     */
    setupToolbarHandlers() {
        // New file button
        if (this.view.elements.newFileBtn) {
            this.view.elements.newFileBtn.addEventListener('click', () => {
                this.handleNewFile();
            });
        }

        // New folder button
        if (this.view.elements.newFolderBtn) {
            this.view.elements.newFolderBtn.addEventListener('click', () => {
                this.handleNewFolder();
            });
        }

        // Save file button
        if (this.view.elements.saveFileBtn) {
            this.view.elements.saveFileBtn.addEventListener('click', () => {
                this.handleSaveFile();
            });
        }

        // Delete file button
        if (this.view.elements.deleteFileBtn) {
            this.view.elements.deleteFileBtn.addEventListener('click', () => {
                this.handleDeleteFile();
            });
        }

        // Download file button
        if (this.view.elements.downloadFileBtn) {
            this.view.elements.downloadFileBtn.addEventListener('click', () => {
                this.handleDownloadFile();
            });
        }
    }

    /**
     * Sets up file operations handlers
     * @private
     */
    setupFileOperations() {
        // Project tree interactions
        if (this.view.elements.projectTree) {
            this.view.elements.projectTree.addEventListener('click', (e) => {
                const item = e.target.closest('.tree-item');
                const toggle = e.target.closest('.toggle');

                if (toggle) {
                    // Toggle folder expansion
                    const itemId = item.getAttribute('data-id');
                    this.toggleFolder(itemId);
                } else if (item && !e.target.closest('.dropdown')) {
                    // Select item (avoid selecting when clicking dropdown)
                    const itemId = item.getAttribute('data-id');
                    const fileItem = this.model.fileSystem.getItem(itemId);

                    if (fileItem && fileItem.type === 'file') {
                        this.model.openFile(itemId);
                        this.view.selectTreeItem(itemId);
                        this.view.update(this.model);

                        // Auto-render diagram
                        this.view.renderDiagram(fileItem.content);
                    } else {
                        this.view.selectTreeItem(itemId);
                    }
                }
            });
        }

        // File editor input (auto-save)
        if (this.view.elements.fileEditor) {
            this.view.elements.fileEditor.addEventListener('input', (e) => {
                if (this.model.getSettings().autoSave) {
                    this.model.saveCurrentFile(e.target.value);
                }
            });
        }
    }

    /**
     * Sets up context menu handlers
     * @private
     */
    setupContextMenu() {
        const contextActions = {
            'context-new-file': (targetId) => this.handleNewFileFromContext(targetId),
            'context-new-folder': (targetId) => this.handleNewFolderFromContext(targetId),
            'context-delete': () => this.handleDeleteItem(),
            'context-download': () => this.handleDownloadFile()
        };

        Object.entries(contextActions).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = this.view.contextMenuTarget;
                    handler(targetId);
                    this.view.hideContextMenu();
                });
            }
        });

        // Rename modal confirmation
        const renameConfirm = document.getElementById('rename-confirm');
        if (renameConfirm) {
            renameConfirm.addEventListener('click', () => {
                this.handleRenameConfirm();
            });
        }
    }

    /**
     * Sets up auto-save functionality
     * @private
     */
    setupAutoSave() {
        // Auto-save functionality is handled in setupFileOperations
    }

    /**
     * Sets up menu handlers for dropdown menus
     * @private
     */
    setupMenuHandlers() {
        // Settings menu
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsMenu) {
            settingsMenu.addEventListener('click', () => {
                this.handleShowSettings();
            });
        }

        // Rename from Edit menu
        const renameMenu = document.getElementById('rename');
        if (renameMenu) {
            renameMenu.addEventListener('click', () => {
                this.handleRenameItem();
            });
        }

        // File type selection buttons
        const fileTypes = ['mermaid', 'plantuml', 'txt', 'md'];
        fileTypes.forEach(type => {
            const button = document.getElementById(`create-${type}`);
            if (button) {
                button.addEventListener('click', () => {
                    this.handleCreateFileWithType(type);
                });
            }
        });
    }


    /**
     * Handles showing settings view
     * @private
     */
    handleShowSettings() {
        // Switch to settings view
        this.showView('settings-view');
    }

    /**
     * Shows a specific view by ID
     * @param {string} viewId - ID of the view to show
     * @private
     */
    showView(viewId) {
        // Hide all views
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.classList.remove('active');
        });

        // Show the specified view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }
    }

    /**
     * Handles new project creation
     * @private
     */
    handleNewProject() {
        const projectName = prompt('Enter project name:', 'New Project');
        if (projectName && projectName.trim()) {
            this.model.createNewProject(projectName.trim());
            this.view.update(this.model);
            this.view.showNotification(`Project "${projectName}" created!`, 'success');
        }
    }

    /**
     * Handles project export
     * @private
     */
    async handleExportProject() {
        try {
            const blob = await this.model.exportCurrentProject();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.model.getCurrentProject().name}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.view.showNotification('Project exported successfully!', 'success');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.view.showNotification('Failed to export project', 'error');
        }
    }

    /**
     * Handles project import
     * @private
     */
    handleImportProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importData = JSON.parse(event.target.result);
                        this.model.importProject(importData);
                        this.view.update(this.model);
                        this.view.showNotification('Project imported successfully!', 'success');
                    } catch (error) {
                        console.error('Import failed:', error);
                        this.view.showNotification('Failed to import project', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    /**
     * Handles new file creation
     * @param {string} [parentPath='/'] - Parent path for new file
     * @private
     */
    handleNewFile(parentPath = '/') {
        this.view.showFileTypeModal(parentPath);
    }

    /**
     * Handles new folder creation
     * @private
     */
    handleNewFolder() {
        this.handleNewFolderFromContext(null);
    }

    /**
     * Handles new folder creation from context menu
     * @param {string} targetId - Target folder/item ID
     * @private
     */
    handleNewFolderFromContext(targetId) {
        let parentPath = '/';
        if (targetId) {
            const item = this.model.fileSystem.getItem(targetId);
            if (item) {
                parentPath = item.type === 'folder' ? item.path : item.path.substring(0, item.path.lastIndexOf('/')) || '/';
            }
        }
        
        const folderName = prompt('Enter folder name:', 'new-folder');
        if (folderName && folderName.trim()) {
            try {
                this.model.createFolder(folderName.trim(), parentPath);
                this.view.update(this.model);
                this.view.showNotification(`Folder "${folderName}" created!`, 'success');
            } catch (error) {
                console.error('Folder creation failed:', error);
                this.view.showNotification('Failed to create folder', 'error');
            }
        }
    }

    /**
     * Handles file creation from context menu
     * @param {string} targetId - Target folder/item ID
     * @private
     */
    handleNewFileFromContext(targetId) {
        let parentPath = '/';
        if (targetId) {
            const item = this.model.fileSystem.getItem(targetId);
            if (item) {
                parentPath = item.type === 'folder' ? item.path : item.path.substring(0, item.path.lastIndexOf('/')) || '/';
            }
        }
        
        this.handleNewFile(parentPath);
    }

    /**
     * Handles file creation with specific type
     * @param {string} type - File type ('mermaid', 'plantuml', 'txt', 'md')
     * @private
     */
    handleCreateFileWithType(type) {
        if (!this.view.elements.fileLocation || !this.view.elements.fileNameInput) {
            return;
        }
        
        const parentPath = this.view.elements.fileLocation.value;
        const fileName = this.view.elements.fileNameInput.value.trim();
        
        if (!fileName) {
            this.view.showNotification('Please enter a file name', 'warning');
            return;
        }
        
        try {
            const content = this.getFileTemplate(type);
            this.model.createFile(fileName, parentPath, content);
            this.view.update(this.model);
            this.view.showNotification(`File "${fileName}" created!`, 'success');
            // Hide modal
            if (this.view.elements.fileTypeModal) {
                this.view.elements.fileTypeModal.hide();
            }
        } catch (error) {
            console.error('File creation failed:', error);
            this.view.showNotification('Failed to create file', 'error');
        }
    }

    /**
     * Gets default file name for a type
     * @param {string} type - File type
     * @returns {string} Default filename
     * @private
     */
    getDefaultFileName(type) {
        const defaults = {
            mermaid: 'diagram.mmd',
            plantuml: 'diagram.puml',
            txt: 'document.txt',
            md: 'README.md'
        };
        return defaults[type] || 'new-file.txt';
    }

    /**
     * Gets template content for a file type
     * @param {string} type - File type
     * @returns {string} Template content
     * @private
     */
    getFileTemplate(type) {
        const templates = {
            mermaid: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E

%% Welcome to Mermaid!
%% This is a flowchart template
%% Learn more at: https://mermaid-js.github.io/`,

            plantuml: `@startuml
actor User
User --> (Login)
User --> (Logout)

rectangle System {
  (Login) --> (Validate Credentials)
  (Validate Credentials) --> (Show Dashboard)
  (Show Dashboard) --> (Logout)
}
@enduml

' Welcome to PlantUML!
' This is a basic use case diagram template
' Learn more at: https://plantuml.com/`,

            txt: `This is a plain text file.

You can write any text content here.

Created with Diagram IDE.`,

            md: `# Document Title

## Introduction

This is a Markdown file created with Diagram IDE.

## Features

- Easy to read and write
- Supports formatting
- Great for documentation

## Code Example

\`\`\`javascript
console.log('Hello, World!');
\`\`\`

Learn more about Markdown: [Markdown Guide](https://www.markdownguide.org/)`
        };

        return templates[type] || '';
    }

    /**
     * Handles file saving
     * @private
     */
    handleSaveFile() {
        const content = this.view.elements.fileEditor.value;
        this.model.saveCurrentFile(content);
        this.view.showNotification('File saved successfully!', 'success');
    }

    /**
     * Handles file deletion
     * @private
     */
    handleDeleteFile() {
        if (confirm('Are you sure you want to delete this file?')) {
            const fileId = this.model.getCurrentFile()?.id;
            if (fileId) {
                this.model.deleteItem(fileId);
                this.view.update(this.model);
                this.view.showNotification('File deleted!', 'success');
            }
        }
    }

    /**
     * Handles file download
     * @private
     */
    handleDownloadFile() {
        const currentFile = this.model.getCurrentFile();
        if (currentFile) {
            const blob = new Blob([currentFile.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.view.showNotification(`File "${currentFile.name}" downloaded!`, 'success');
        }
    }

    /**
     * Handles item renaming
     * @private
     */
    handleRenameItem() {
        if (this.view.contextMenuTarget) {
            const item = this.model.fileSystem.getItem(this.view.contextMenuTarget);
            if (item) {
                this.view.showRenameModal(item.name);
            }
        }
    }

    /**
     * Handles item deletion
     * @private
     */
    handleDeleteItem() {
        if (this.view.contextMenuTarget) {
            const item = this.model.fileSystem.getItem(this.view.contextMenuTarget);
            if (item && confirm(`Are you sure you want to delete "${item.name}"?`)) {
                this.model.deleteItem(this.view.contextMenuTarget);
                this.view.update(this.model);
                this.view.showNotification('Item deleted!', 'success');
            }
        }
    }

    /**
     * Handles SVG download for a file
     * @param {string} fileId - File ID to download as SVG
     * @public
     */
    async handleDownloadSVG(fileId) {
        const file = this.model.fileSystem.getItem(fileId);
        if (!file || file.type !== 'file') {
            this.view.showNotification('Invalid file for SVG download', 'error');
            return;
        }

        try {
            const result = await this.renderDiagramForDownload(file.content, 'svg');
            if (result && result.content) {
                this.downloadBlob(result.content, `${file.name.replace(/\.[^/.]+$/, '')}.svg`, 'image/svg+xml');
                this.view.showNotification('SVG downloaded successfully!', 'success');
            } else {
                this.view.showNotification('Failed to generate SVG', 'error');
            }
        } catch (error) {
            console.error('SVG download failed:', error);
            this.view.showNotification('Failed to download SVG', 'error');
        }
    }

    /**
     * Handles PNG download for a file
     * @param {string} fileId - File ID to download as PNG
     * @public
     */
    async handleDownloadPNG(fileId) {
        const file = this.model.fileSystem.getItem(fileId);
        if (!file || file.type !== 'file') {
            this.view.showNotification('Invalid file for PNG download', 'error');
            return;
        }

        try {
            // Try dedicated PNG rendering first
            let pngBlob = await this.renderDiagramAsPNG(file.content);

            // If dedicated rendering fails, fallback to SVG-to-PNG conversion
            if (!pngBlob) {
                console.log('Dedicated PNG rendering failed, trying SVG fallback...');
                const svgResult = await this.renderDiagramForDownload(file.content, 'svg');
                if (svgResult && svgResult.content) {
                    pngBlob = await this.convertSvgToPng(svgResult.content);
                }
            }

            if (pngBlob) {
                this.downloadBlob(pngBlob, `${file.name.replace(/\.[^/.]+$/, '')}.png`, 'image/png');
                this.view.showNotification('PNG downloaded successfully!', 'success');
            } else {
                this.view.showNotification('Failed to generate PNG', 'error');
            }
        } catch (error) {
            console.error('PNG download failed:', error);
            console.error('Error details:', error.message, error.stack);
            this.view.showNotification('Failed to download PNG', 'error');
        }
    }

    /**
     * Renders diagram directly as PNG using dedicated rendering
     * @param {string} content - Diagram content
     * @returns {Promise<Blob|null>} PNG blob or null if failed
     * @private
     */
    async renderDiagramAsPNG(content) {
        const type = this.detectDiagramType(content);

        try {
            if (type === 'mermaid') {
                return await this.renderMermaidAsPNG(content);
            } else if (type === 'plantuml') {
                return await this.renderPlantumlAsPNG(content);
            }
        } catch (error) {
            console.warn('Dedicated PNG rendering failed:', error.message);
        }

        return null; // Fallback to SVG conversion
    }

    /**
     * Renders Mermaid diagram directly as PNG
     * @param {string} content - Mermaid content
     * @returns {Promise<Blob>} PNG blob
     * @private
     */
    async renderMermaidAsPNG(content) {
        if (!window.mermaid) {
            throw new Error('Mermaid library not loaded');
        }

        // Configure Mermaid for PNG export
        window.mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            }
        });

        return new Promise((resolve, reject) => {
            // Create a temporary container for rendering
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.visibility = 'hidden';
            document.body.appendChild(container);

            const renderCallback = async (svgCode, bindFunctions) => {
                try {
                    container.innerHTML = svgCode;

                    // Find the SVG element
                    const svgElement = container.querySelector('svg');
                    if (!svgElement) {
                        throw new Error('No SVG element found');
                    }

                    // Convert SVG to PNG using canvas
                    const pngBlob = await this.svgElementToPng(svgElement);
                    document.body.removeChild(container);
                    resolve(pngBlob);
                } catch (error) {
                    document.body.removeChild(container);
                    reject(error);
                }
            };

            // Generate unique ID for this render
            const id = 'png-render-' + Date.now();
            window.mermaid.render(id, content).then(({ svg, bindFunctions }) => {
                renderCallback(svg, bindFunctions);
            }).catch(reject);
        });
    }

    /**
     * Renders PlantUML diagram directly as PNG
     * @param {string} content - PlantUML content
     * @returns {Promise<Blob>} PNG blob
     * @private
     */
    async renderPlantumlAsPNG(content) {
        if (!window.plantumlEncoder) {
            throw new Error('PlantUML encoder not loaded');
        }

        // For PlantUML, we'll use the SVG approach since direct PNG might not be available
        // This will be handled by the SVG fallback
        return null;
    }

    /**
     * Converts an SVG DOM element to PNG blob
     * @param {SVGElement} svgElement - SVG DOM element
     * @returns {Promise<Blob>} PNG blob
     * @private
     */
    svgElementToPng(svgElement) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            // Enable cross-origin for canvas
            img.crossOrigin = 'anonymous';

            // Get SVG dimensions
            const viewBox = svgElement.getAttribute('viewBox');

            if (viewBox) {
                const [, , width, height] = viewBox.split(' ').map(Number);
                canvas.width = Math.max(width, 800);
                canvas.height = Math.max(height, 600);
            } else {
                const bbox = svgElement.getBoundingClientRect();
                canvas.width = Math.max(bbox.width || 800, 800);
                canvas.height = Math.max(bbox.height || 600, 600);
            }

            img.onload = () => {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create PNG blob from SVG element'));
                        }
                    }, 'image/png', 1.0);
                } catch (drawError) {
                    reject(new Error(`Canvas drawing failed: ${drawError.message}`));
                }
            };

            img.onerror = (error) => {
                reject(new Error(`SVG image failed to load: ${error.type || 'Unknown error'}`));
            };

            // Convert SVG element to string and create data URL
            try {
                const svgString = new XMLSerializer().serializeToString(svgElement);
                // Properly encode the SVG for data URL
                const encodedSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                img.src = encodedSvg;
            } catch (encodeError) {
                reject(new Error(`SVG encoding failed: ${encodeError.message}`));
            }
        });
    }

    /**
     * Renders diagram content for download purposes
     * @param {string} content - Diagram content
     * @param {string} format - Format to render ('svg')
     * @returns {Promise<Object>} Render result
     * @private
     */
    async renderDiagramForDownload(content, format) {
        const type = this.detectDiagramType(content);

        if (type === 'mermaid') {
            return await this.renderMermaidForDownload(content);
        } else if (type === 'plantuml') {
            return await this.renderPlantumlForDownload(content);
        }

        return null;
    }

    /**
     * Renders Mermaid diagram for download
     * @param {string} content - Mermaid content
     * @returns {Promise<Object>} Render result
     * @private
     */
    async renderMermaidForDownload(content) {
        if (!window.mermaid) {
            throw new Error('Mermaid library not loaded');
        }

        window.mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            }
        });

        return new Promise((resolve, reject) => {
            const tempId = 'temp-download-' + Date.now();
            window.mermaid.render(tempId, content).then(({ svg }) => {
                resolve({ content: svg, type: 'svg' });
            }).catch(reject);
        });
    }

    /**
     * Renders PlantUML diagram for download
     * @param {string} content - PlantUML content
     * @returns {Promise<Object>} Render result
     * @private
     */
    async renderPlantumlForDownload(content) {
        if (!window.plantumlEncoder) {
            throw new Error('PlantUML encoder not loaded');
        }

        const encoded = window.plantumlEncoder.encode(content);
        const svgUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;

        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600">
            <image xlink:href="${svgUrl}" width="100%" height="100%"/>
        </svg>`;

        return { content: svgContent, type: 'svg' };
    }

    /**
     * Converts SVG string to PNG blob
     * @param {string} svgString - SVG content as string
     * @returns {Promise<Blob>} PNG blob
     * @private
     */
    convertSvgToPng(svgString) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            // Enable cross-origin for canvas
            img.crossOrigin = 'anonymous';

            // Set canvas size based on SVG dimensions
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;

            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
                const [, , width, height] = viewBox.split(' ').map(Number);
                canvas.width = Math.max(width, 800); // Minimum width
                canvas.height = Math.max(height, 600); // Minimum height
            } else {
                canvas.width = 800;
                canvas.height = 600;
            }

            img.onload = () => {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create PNG blob'));
                        }
                    }, 'image/png', 1.0);
                } catch (drawError) {
                    reject(new Error(`Canvas drawing failed: ${drawError.message}`));
                }
            };

            img.onerror = (error) => {
                console.error('Image load error:', error);
                console.error('SVG content length:', svgString.length);
                console.error('SVG content preview:', svgString.substring(0, 500));
                reject(new Error(`Image failed to load: ${error.type || 'Unknown error'}`));
            };

            // Use data URL instead of blob URL to avoid CORS issues
            try {
                const encodedSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                img.src = encodedSvg;
            } catch (encodeError) {
                console.error('Encoding error:', encodeError);
                reject(new Error(`Encoding failed: ${encodeError.message}`));
            }
        });
    }

    /**
     * Downloads a blob as a file
     * @param {Blob|string} content - Content to download
     * @param {string} filename - Download filename
     * @param {string} mimeType - MIME type
     * @private
     */
    downloadBlob(content, filename, mimeType) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Detects diagram type from content
     * @param {string} content - Content to analyze
     * @returns {string} Diagram type
     * @private
     */
    detectDiagramType(content) {
        if (!content) return 'unknown';

        const trimmed = content.trim();

        if (trimmed.includes('graph ') || trimmed.includes('flowchart ') ||
            /^\s*graph\s+/.test(trimmed)) {
            return 'mermaid';
        }

        if (trimmed.startsWith('@startuml') || trimmed.includes('skinparam')) {
            return 'plantuml';
        }

        return 'unknown';
    }

    /**
     * Gets item path by ID
     * @param {string} itemId - Item ID
     * @returns {string|null} Item path
     * @private
     */
    getItemPath(itemId) {
        const item = this.model.fileSystem.getItem(itemId);
        return item ? item.path : null;
    }

    /**
     * Handles item renaming
     * @private
     */
    handleRenameItem() {
        if (this.view.contextMenuTarget) {
            const item = this.model.fileSystem.getItem(this.view.contextMenuTarget);
            if (item) {
                this.view.showRenameModal(item.name);
            }
        }
    }

    /**
     * Handles inline rename from tree view
     * @param {string} itemId - Item ID to rename
     * @param {string} newName - New name for the item
     * @public
     */
    handleInlineRename(itemId, newName) {
        if (!newName || !newName.trim()) {
            throw new Error('Name cannot be empty');
        }
        
        this.model.renameItem(itemId, newName.trim());
        this.view.update(this.model);
        this.view.showNotification('Item renamed successfully!', 'success');
    }

    /**
     * Handles rename confirmation
     * @private
     */
    handleRenameConfirm() {
        const newName = this.view.elements.renameInput.value.trim();
        if (newName && this.view.contextMenuTarget) {
            try {
                this.model.renameItem(this.view.contextMenuTarget, newName);
                this.view.elements.renameModal.hide();
                this.view.update(this.model);
                this.view.showNotification('Item renamed successfully!', 'success');
            } catch (error) {
                console.error('Rename failed:', error);
                this.view.showNotification('Failed to rename item', 'error');
            }
        }
    }

    /**
     * Handles item deletion
     * @private
     */
    handleDeleteItem() {
        if (this.view.contextMenuTarget) {
            const item = this.model.fileSystem.getItem(this.view.contextMenuTarget);
            if (item && confirm(`Are you sure you want to delete "${item.name}"?`)) {
                this.model.deleteItem(this.view.contextMenuTarget);
                this.view.update(this.model);
                this.view.showNotification('Item deleted!', 'success');
            }
        }
    }

    /**
     * Toggles folder expansion
     * @param {string} itemId - Folder item ID
     * @private
     */
    toggleFolder(itemId) {
        const project = this.model.getCurrentProject();
        if (project && project.files[itemId]) {
            project.files[itemId].expanded = !project.files[itemId].expanded;
            this.view.updateProjectTree(this.model);
        }
    }

    /**
     * Gets selected item path for operations
     * @returns {string|null} Selected item path
     * @private
     */
    getSelectedItemPath() {
        if (this.view.contextMenuTarget) {
            const item = this.model.fileSystem.getItem(this.view.contextMenuTarget);
            return item ? item.path : null;
        }
        return null;
    }

    /**
     * Renders initial content on startup
     * @private
     */
    renderInitialContent() {
        const currentFile = this.model.getCurrentFile();
        if (currentFile) {
            this.view.renderDiagram(currentFile.content);
        }
    }
}

// Default export for convenience
export default DiagramController;
