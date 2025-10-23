/**
 * View Module - Enterprise Diagram IDE
 * Handles UI rendering, user interactions, and visual feedback.
 *
 * This module manages all user interface components including the project tree,
 * editor panels, theme switching, and user interaction handling.
 *
 * @module View
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

import { detectDiagramType } from '../utils/DiagramUtils.js';
import { RenderingEngine } from '../rendering/RenderingEngine.js';
import { PanZoom } from './PanZoom.js';
import { startInlineEdit as startInlineEditHelper, finishInlineEdit as finishInlineEditHelper, showNotification as showNotificationHelper, escapeHtml, getFileTypeBadgeInfo } from '../view/UIHelpers.js';
import { buildProjectTreeHtml } from '../view/TreeRenderer.js';
import { attachEventListeners, attachContextMenu } from '../view/ViewEvents.js';
import { ErrorPanelManager } from '../view/ErrorPanelManager.js';

/**
 * DiagramView class - Manages UI rendering and user interactions
 * @class
 */
export class DiagramView {
    /**
     * Creates a new DiagramView instance
     * @param {Object} [options={}]
     * @param {RenderingEngine} [options.renderingEngine] - Rendering engine dependency
     * @constructor
     */
    constructor({ renderingEngine = new RenderingEngine() } = {}) {
        /**
         * DOM element cache for performance
         * @type {Object}
         * @private
         */
        this.elements = this.cacheElements();

        /**
         * Currently selected item ID
         * @type {string|null}
         * @private
         */
        this.selectedItemId = null;

        /**
         * Ace Editor instance
         * @type {Object|null}
         * @private
         */
        this.editor = null;

        /**
         * Context menu target item ID
         * @type {string|null}
         * @private
         */
        this.contextMenuTarget = null;

        /**
         * Current preview mode
         * @type {string}
         * @private
         */
        this.previewMode = 'auto';

        /**
         * Rendering engine dependency
         * @type {RenderingEngine}
         * @private
         */
        this.renderingEngine = renderingEngine;

        /**
         * Error panel manager
         * @type {ErrorPanelManager}
         * @private
         */
        this.errorPanelManager = new ErrorPanelManager(this.elements, this);

        // Initialize view
        this.initializeView();
        this.initializeEditor();
    }

    /**
     * Caches DOM elements for performance
     * @returns {Object} Cached DOM elements
     * @private
     */
    cacheElements() {
        return {
            // Header elements
            projectTitle: document.getElementById('project-title'),
            themeToggle: document.getElementById('theme-toggle'),
            newProjectBtn: document.getElementById('new-project'),
            exportProjectBtn: document.getElementById('export-project'),

            // Toolbar buttons
            newFileBtn: document.getElementById('new-file'),
            newFolderBtn: document.getElementById('new-folder'),
            saveFileBtn: document.getElementById('save-file'),
            deleteFileBtn: document.getElementById('delete-file'),
            downloadFileBtn: document.getElementById('download-file'),

            // Project tree
            projectTree: document.getElementById('project-tree'),

            // Editor elements
            editorView: document.getElementById('editor-view'),
            fileNameDisplay: document.getElementById('file-name-display'),
            fileEditor: document.getElementById('file-editor'),
            fileTypeBadge: document.getElementById('file-type-badge'),
            previewType: document.getElementById('preview-type'),
            diagramPreview: document.getElementById('diagram-preview'),
            panZoomControls: document.getElementById('pan-zoom-controls'),
            zoomInBtn: document.getElementById('zoom-in-btn'),
            zoomOutBtn: document.getElementById('zoom-out-btn'),
            zoomFitBtn: document.getElementById('zoom-fit-btn'),
            zoomResetBtn: document.getElementById('zoom-reset-btn'),

            // Error panel
            errorPanel: document.getElementById('error-panel'),
            errorMessages: document.getElementById('error-messages'),
            errorCount: document.getElementById('error-count'),
            clearErrorsBtn: document.getElementById('clear-errors-btn'),
            toggleErrorPanel: document.getElementById('toggle-error-panel'),

            // Context menu
            contextMenu: document.getElementById('context-menu'),

            // Modal elements
            renameInput: document.getElementById('rename-input'),
            fileTypeModal: bootstrap.Modal ? new bootstrap.Modal(document.getElementById('fileTypeModal')) : null,
            fileLocation: document.getElementById('file-location'),
            fileNameInput: document.getElementById('file-name-input'),
            previewMode: document.getElementById('preview-mode'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            fullscreenModal: bootstrap.Modal ? new bootstrap.Modal(document.getElementById('fullscreenModal')) : null,
            fullscreenPreview: document.getElementById('fullscreen-preview')
        };
    }

    /**
     * Initializes the view with default state
     * @private
     */
    initializeView() {
        // Set default theme to light
        if (!document.documentElement.getAttribute('data-theme')) {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        attachEventListeners(this);
        attachContextMenu(this);
    }

    /**
     * Handles dropdown menu actions
     * @param {string} action - Action to perform
     * @param {string} itemId - Item ID
     * @private
     */
    handleDropdownAction(action, itemId) {
        switch (action) {
            case 'new-file':
                this.controller.handleNewFile(itemId);
                break;
            case 'new-folder':
                this.controller.handleNewFolder(itemId);
                break;
            case 'rename':
                this.controller.handleRenameItem(itemId);
                break;
            case 'delete':
                this.controller.handleDeleteItem(itemId);
                break;
            case 'download-svg':
                this.controller.handleDownloadSVG(itemId);
                break;
            case 'download-png':
                this.controller.handleDownloadPNG(itemId);
                break;
        }
    }

    /**
     * Toggles between dark and light themes
     * @public
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);

        // Update icon
        const icon = this.elements.themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }

        // Update Ace Editor theme
        if (this.editor) {
            this.editor.setTheme(newTheme === 'light' ? 'ace/theme/chrome' : 'ace/theme/monokai');
        }
    }

    /**
     * Updates view with model data
     * @param {DiagramModel} model - Application model
     * @public
     */
    update(model) {

        // Update project tree
        this.updateProjectTree(model);

        // Update current file display
        this.updateCurrentFile(model.getCurrentFile());

        // Update editor font size
        if (this.elements.fileEditor) {
            this.elements.fileEditor.style.fontSize = `${model.getSettings().fontSize}px`;
        }
    }

    /**
     * Updates project tree display
     * @param {DiagramModel} model - Application model
     * @private
     */
    updateProjectTree(model) {
        const project = model.getCurrentProject();
        if (!project || !this.elements.projectTree) {
            return;
        }

        const treeHtml = buildProjectTreeHtml(project.files, 'root', this.selectedItemId);
        this.elements.projectTree.innerHTML = treeHtml;
    }

    /**
     * Updates current file display
     * @param {Object|null} file - Current file object
     * @private
     */
    updateCurrentFile(file) {
        if (!this.elements.fileNameDisplay || !this.elements.fileEditor) {
            return;
        }

        if (file) {
            this.elements.fileNameDisplay.textContent = file.name;
            if (this.editor) {
                this.editor.setValue(file.content, -1); // -1 moves cursor to start
            }

            // Enable toolbar buttons
            this.setToolbarButtonState(true);

            // Detect and update file type
            const fileType = this.detectFileType(file.content);
            getFileTypeBadgeInfo(fileType);
        } else {
            this.elements.fileNameDisplay.textContent = 'Untitled';
            if (this.editor) {
                this.editor.setValue('', -1);
            }

            // Disable toolbar buttons
            this.setToolbarButtonState(false);

            getFileTypeBadgeInfo('unknown');
        }

        // Initialize preview mode dropdown
        if (this.elements.previewMode) {
            this.elements.previewMode.value = this.previewMode;
        }
    }

    /**
     * Sets toolbar button states
     * @param {boolean} enabled - Whether buttons should be enabled
     * @private
     */
    setToolbarButtonState(enabled) {
        const buttons = [
            this.elements.saveFileBtn,
            this.elements.deleteFileBtn,
            this.elements.downloadFileBtn
        ];

        buttons.forEach(button => {
            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    /**
     * Detects diagram type from content
     * @param {string} content - File content
     * @returns {string} Detected type
     * @private
     */
    detectFileType(content) {
        if (!content) {
            return 'unknown';
        }

        return detectDiagramType(content);
    }

    /**
     * Gets display name for current preview mode
     * @returns {string} Display name
     * @private
     */
    getPreviewModeDisplayName() {
        const modeNames = {
            auto: 'Auto-detect',
            mermaid: 'Mermaid Diagram',
            plantuml: 'PlantUML Diagram',
            txt: 'Plain Text',
            md: 'Markdown'
        };
        return modeNames[this.previewMode] || 'Auto-detect';
    }

    /**
     * Updates preview type display
     * @private
     */
    updatePreviewType() {
        if (this.elements.previewType) {
            this.elements.previewType.textContent = this.getPreviewModeDisplayName();
        }
    }

    /**
     * Renders diagram based on detected type
     * @param {string} code - Diagram code
     * @public
     */
    async renderDiagram(code) {
        try {
            await this.renderingEngine.render(code, this.previewMode, this.elements.diagramPreview);
        } catch (error) {
            console.error('Error rendering diagram:', error);
            this.renderError(error);
        }
    }

    /**
     * Renders plain text content
     * @param {string} code - Text content
     * @private
     */
    renderPlainText(code) {
        this.hidePanZoomControls();
        const pre = document.createElement('pre');
        pre.className = 'text-muted';
        pre.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
        pre.style.fontSize = '0.9rem';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';
        pre.textContent = code || 'No content to display';

        this.elements.diagramPreview.appendChild(pre);
    }

    /**
     * Renders Markdown content
     * @param {string} code - Markdown content
     * @private
     */
    renderMarkdown(code) {
        this.hidePanZoomControls();
        if (!window.marked) {
            throw new Error('Marked library not loaded');
        }

        // Configure marked for security
        window.marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });

        const html = window.marked.parse(code || '');
        const div = document.createElement('div');
        div.className = 'markdown-preview';
        div.style.padding = '1rem';
        div.innerHTML = html;

        this.elements.diagramPreview.appendChild(div);
    }

    /**
     * Renders error message
     * @param {Error} error - Error object
     * @private
     */
    renderError(error) {
        this.errorPanelManager.renderError(error);
    }

    /**
     * Adds error to error panel
     * @param {Error} error - Error object
     * @private
     */
    addError(error) {
        this.errorPanelManager.addError(error);
    }

    /**
     * Selects tree item
     * @param {string} itemId - Item ID to select
     * @public
     */
    selectTreeItem(itemId) {
        // Remove previous selection
        document.querySelectorAll('.tree-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Add new selection
        const item = document.querySelector(`.tree-item[data-id="${itemId}"]`);
        if (item) {
            item.classList.add('selected');
        }

        this.selectedItemId = itemId;
    }

    /**
     * Shows context menu at specified position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {HTMLElement} target - Target element
     * @public
     */
    showContextMenu(x, y, target) {
        const item = target.closest('.tree-item');
        if (!item) {
            return;
        }

        this.contextMenuTarget = item.getAttribute('data-id');

        // Position menu
        let left = x;
        let top = y;

        if (left + 180 > window.innerWidth) {
            left = window.innerWidth - 190;
        }

        if (top + 200 > window.innerHeight) {
            top = window.innerHeight - 210;
        }

        this.elements.contextMenu.style.left = `${left}px`;
        this.elements.contextMenu.style.top = `${top}px`;
        this.elements.contextMenu.style.display = 'block';
    }

    /**
     * Hides context menu
     * @public
     */
    hideContextMenu() {
        this.elements.contextMenu.style.display = 'none';
        this.contextMenuTarget = null;
    }

    /**
     * Shows rename modal with current name
     * @param {string} currentName - Current item name
     * @public
     */
    showRenameModal(currentName) {
        if (this.elements.renameInput && this.elements.renameModal) {
            this.elements.renameInput.value = currentName;
            this.elements.renameModal.show();
        }
    }

    /**
     * Shows file type selection modal
     * @param {string} [parentPath='/'] - Default parent path
     * @param {string} [fileType=''] - Pre-selected file type
     * @public
     */
    showFileTypeModal(parentPath = '/', fileType = '') {
        if (this.elements.fileTypeModal) {
            this.populateFolderOptions(parentPath);
            this.elements.fileLocation.value = parentPath;
            
            if (fileType) {
                this.elements.fileNameInput.value = this.controller.getDefaultFileName(fileType);
            }
            
            this.elements.fileTypeModal.show();
        }
    }

    /**
     * Populates folder options in the location dropdown
     * @param {string} selectedPath - Currently selected path
     * @private
     */
    populateFolderOptions(selectedPath = '/') {
        if (!this.elements.fileLocation) return;

        // Clear existing options except root
        while (this.elements.fileLocation.children.length > 1) {
            this.elements.fileLocation.removeChild(this.elements.fileLocation.lastChild);
        }

        // Add folder options using FileSystem API
        if (this.model && this.model.fileSystem) {
            const folderPaths = this.model.fileSystem.getFolderPathStrings();

            // Add root option
            const rootOption = document.createElement('option');
            rootOption.value = '/';
            rootOption.textContent = '/';
            if (selectedPath === '/') {
                rootOption.selected = true;
            }
            this.elements.fileLocation.appendChild(rootOption);

            // Add folder options
            folderPaths.forEach(path => {
                if (path !== '/') { // Skip root since we added it separately
                    const option = document.createElement('option');
                    option.value = path;
                    option.textContent = path;
                    if (path === selectedPath) {
                        option.selected = true;
                    }
                    this.elements.fileLocation.appendChild(option);
                }
            });
        }
    }

    /**
     * Starts inline editing for a tree item
     * @param {string} itemId - Item ID to edit
     * @public
     */
    startInlineEdit(itemId) {
        startInlineEditHelper(itemId);
    }

    /**
     * Finishes inline editing
     * @param {HTMLInputElement} input - The input element
     * @param {boolean} cancel - Whether to cancel the edit
     * @private
     */
    finishInlineEdit(input, cancel) {
        finishInlineEditHelper(input, cancel);
    }

    /**
     * Shows notification message
     * @param {string} message - Message to display
     * @param {string} type - Notification type
     * @public
     */
    showNotification(message, type = 'info') {
        showNotificationHelper(message, type);
    }

    /**
     * Shows fullscreen modal with diagram preview
     * @public
     */
    showFullscreenModal() {
        const content = this.getCurrentDiagramContent();

        if (!content) {
            this.showNotification('No diagram to display in a new tab', 'warning');
            return;
        }

        this.openDiagramInNewTab(content);
    }

    /**
     * Renders diagram in fullscreen mode with enhanced pan and zoom
     * @param {string} code - Diagram code
     * @private
     */
    renderDiagramFullscreen(code) {
        let renderType;
        if (this.previewMode === 'auto') {
            renderType = this.detectFileType(code);
        } else {
            renderType = this.previewMode;
        }

        try {
            if (renderType === 'mermaid') {
                this.renderMermaidFullscreen(code);
            } else if (renderType === 'plantuml') {
                this.renderPlantumlFullscreen(code);
            } else {
                this.renderPlainTextFullscreen(code);
            }
        } catch (error) {
            console.error('Error rendering fullscreen diagram:', error);
            this.renderErrorFullscreen(error);
        }
    }

    /**
     * Renders Mermaid diagram in fullscreen
     * @param {string} code - Mermaid code
     * @private
     */
    renderMermaidFullscreen(code) {
        if (!window.mermaid || !this.elements.fullscreenPreview) {
            throw new Error('Mermaid library not loaded');
        }

        window.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark',
            securityLevel: 'loose'
        });

        const renderCallback = (svgCode) => {
            this.elements.fullscreenPreview.innerHTML = svgCode;
            const svgElement = this.elements.fullscreenPreview.querySelector('svg');
            this.applyFullscreenSvgBehavior(svgElement);
        };

        const id = 'fullscreen-mermaid-' + Date.now();
        window.mermaid.render(id, code).then(({ svg }) => {
            renderCallback(svg);
        }).catch(error => {
            console.error('Mermaid render failed:', error);
            throw new Error(`Mermaid fullscreen rendering failed: ${error.message}`);
        });
    }

    /**
     * Renders PlantUML diagram in fullscreen
     * @param {string} code - PlantUML code
     * @private
     */
    async renderPlantumlFullscreen(code) {
        if (!window.plantumlEncoder || !this.elements.fullscreenPreview) {
            throw new Error('PlantUML encoder not loaded');
        }

        try {
            const encoded = window.plantumlEncoder.encode(code);
            const imageUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;

            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch PlantUML diagram: ${response.statusText}`);
            }
            const svgText = await response.text();

            this.elements.fullscreenPreview.innerHTML = svgText;
            const svgElement = this.elements.fullscreenPreview.querySelector('svg');
            this.applyFullscreenSvgBehavior(svgElement);
        } catch (error) {
            console.error('PlantUML fullscreen rendering failed:', error);
            this.renderErrorFullscreen(new Error(`PlantUML fullscreen rendering failed: ${error.message}`));
        }
    }

    /**
     * Applies consistent fullscreen behaviors to rendered SVG elements
     * @param {SVGElement|null} svgElement - SVG element to normalize
     * @private
     */
    applyFullscreenSvgBehavior(svgElement) {
        if (!svgElement) {
            console.warn('SVG element not found for fullscreen rendering');
            return;
        }

        const serialized = new XMLSerializer().serializeToString(svgElement);
        this.openSvgInNewTab(serialized);
    }

    /**
     * Renders plain text in fullscreen
     * @param {string} code - Text content
     * @private
     */
    renderPlainTextFullscreen(code) {
        const pre = document.createElement('pre');
        pre.className = 'text-muted p-4';
        pre.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
        pre.style.fontSize = '1.2rem';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';
        pre.style.maxWidth = '90%';
        pre.style.margin = 'auto';
        pre.textContent = code || 'No content to display';

        this.elements.fullscreenPreview.appendChild(pre);
    }

    /**
     * Renders error message in fullscreen
     * @param {Error} error - Error object
     * @private
     */
    renderErrorFullscreen(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'd-flex align-items-center justify-content-center h-100 text-center text-danger';
        errorDiv.innerHTML = `
            <div>
                <i class="fas fa-exclamation-triangle fa-4x mb-4"></i>
                <p style="font-size: 1.5rem;">Error rendering diagram: ${error.message}</p>
            </div>
        `;

        this.elements.fullscreenPreview.appendChild(errorDiv);
    }

    /**
     * Gets the current PanZoom instance from the diagram preview
     * @returns {PanZoom|null} The PanZoom instance or null if not available
     * @private
     */
    getCurrentPanZoomInstance() {
        if (!this.elements.diagramPreview) {
            return null;
        }

        const svgElement = this.elements.diagramPreview.querySelector('svg');
        return svgElement ? svgElement._panZoomManager : null;
    }

    /**
     * Executes a zoom operation with validation
     * @param {string} operation - The zoom operation to perform ('zoomIn', 'zoomOut', 'reset')
     * @param {string} warningMessage - Warning message if operation fails
     * @private
     */
    performZoomOperation(operation, warningMessage) {
        const panZoom = this.getCurrentPanZoomInstance();
        if (panZoom && typeof panZoom[operation] === 'function') {
            panZoom[operation]();
        } else {
            console.warn(warningMessage);
        }
    }

    /**
     * Zooms in on the diagram
     * @public
     */
    zoomIn() {
        this.performZoomOperation('zoomIn', 'PanZoom instance not available for zoom in');
    }

    /**
     * Zooms out on the diagram
     * @public
     */
    zoomOut() {
        this.performZoomOperation('zoomOut', 'PanZoom instance not available for zoom out');
    }

    /**
     * Fits the diagram to the container
     * @public
     */
    zoomFit() {
        const panZoom = this.getCurrentPanZoomInstance();
        if (panZoom && typeof panZoom.fit === 'function') {
            panZoom.fit();
        } else {
            console.warn('PanZoom instance not available for fit');
        }
    }

    /**
     * Resets zoom and pan to initial state
     * @public
     */
    zoomReset() {
        this.performZoomOperation('reset', 'PanZoom instance not available for reset');
    }

    /**
     * Requests AI repair for the current diagram code
     * @public
     */
    requestAIRepair() {
        const currentCode = this.getCurrentDiagramContent();
        if (!currentCode || !currentCode.trim()) {
            this.showNotification('No diagram code to repair', 'warning');
            return;
        }

        const diagramType = detectDiagramType(currentCode);
        const typeName = diagramType === 'mermaid' ? 'Mermaid' :
                        diagramType === 'plantuml' ? 'PlantUML' : 'diagram';

        const repairMessage = `I have a ${typeName} diagram with syntax errors. Please fix the following code and provide the corrected version:

        \`\`\`${diagramType}
        ${currentCode}
        \`\`\`

        Please analyze the code, identify any syntax errors, and provide the corrected version with a brief explanation of what was wrong and how you fixed it.`;

        // Access the chatbot instance
        const chatbot = window.diagramApp ? window.diagramApp.chatbot : null;
        if (chatbot && typeof chatbot.sendMessageProgrammatically === 'function') {
            chatbot.sendMessageProgrammatically(repairMessage);
            this.showNotification('AI repair request sent to chatbot', 'info');

            // Expand chatbot panel if collapsed
            const panel = document.getElementById('chatbot-panel');
            if (panel && panel.classList.contains('collapsed')) {
                panel.classList.remove('collapsed');
                const icon = document.querySelector('#toggle-chatbot-panel i');
                if (icon) {
                    icon.className = 'fas fa-chevron-down';
                }
            }
        } else {
            this.showNotification('Chatbot not available for AI repair', 'error');
        }
    }

    /**
     * Initializes the Ace Editor
     * @private
     */
    initializeEditor() {
        if (ace && this.elements.fileEditor) {
            this.editor = ace.edit(this.elements.fileEditor);
            this.editor.setTheme('ace/theme/chrome'); // Default to light theme
            this.editor.session.setMode('ace/mode/markdown'); // Default mode
            this.editor.setShowPrintMargin(false);
            this.editor.setOptions({
                fontSize: '14px',
                showLineNumbers: true,
                tabSize: 2,
                useSoftTabs: true,
                wrap: true,
                highlightActiveLine: true,
                showPrintMargin: false
            });

            // Set up auto-render with debouncing
            let renderTimeout;
            this.editor.on('change', () => {
                clearTimeout(renderTimeout);
                renderTimeout = setTimeout(() => {
                    const code = this.editor.getValue();
                    this.renderDiagram(code);
                }, 500);
            });
        }
    }

}

/**
 * Default export for convenience
 */
export default DiagramView;
