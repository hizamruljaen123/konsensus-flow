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

/**
 * DiagramView class - Manages UI rendering and user interactions
 * @class
 */
export class DiagramView {
    /**
     * Creates a new DiagramView instance
     * @constructor
     */
    constructor() {
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

            // Context menu
            contextMenu: document.getElementById('context-menu'),
            renameModal: bootstrap.Modal ? new bootstrap.Modal(document.getElementById('renameModal')) : null,
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

        this.setupEventListeners();
        this.setupContextMenu();
    }

    /**
     * Sets up event listeners for UI elements
     * @private
     */
    setupEventListeners() {
        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }


        // Preview mode change
        if (this.elements.previewMode) {
            this.elements.previewMode.addEventListener('change', (e) => {
                this.previewMode = e.target.value;
                this.updatePreviewType();
                // Re-render current file content
                const currentFile = window.diagramApp ? window.diagramApp.model.getCurrentFile() : null;
                if (currentFile) {
                    this.renderDiagram(currentFile.content);
                }
            });
        }

        // Fullscreen button
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => {
                this.showFullscreenModal();
            });
        }

        // Dropdown menu actions
        document.addEventListener('click', (e) => {
            const dropdownItem = e.target.closest('.dropdown-item');
            if (dropdownItem) {
                const action = dropdownItem.getAttribute('data-action');
                const treeItem = dropdownItem.closest('.tree-item');
                if (treeItem && action) {
                    e.preventDefault();
                    this.handleDropdownAction(action, treeItem.getAttribute('data-id'));
                }
            }
        });
    }

    /**
     * Sets up context menu functionality
     * @private
     */
    setupContextMenu() {
        // Hide context menu on outside click
        document.addEventListener('click', (e) => {
            if (!this.elements.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Right-click on project tree (optional, can be removed if not needed)
        if (this.elements.projectTree) {
            this.elements.projectTree.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, e.target);
            });
        }
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

        const treeHtml = this.buildTreeHtml(project.files, 'root');
        this.elements.projectTree.innerHTML = treeHtml;
    }

    /**
     * Builds HTML for tree structure recursively
     * @param {Object} files - Files collection
     * @param {string} itemId - Current item ID
     * @returns {string} HTML string
     * @private
     */
    buildTreeHtml(files, itemId) {
        const item = files[itemId];
        if (!item) {
            return '';
        }

        const isSelected = this.selectedItemId === itemId;
        const isFolder = item.type === 'folder';
        const isExpanded = item.expanded !== false;

        const typeBadge = isFolder ? '' : this.getFileTypeBadge(item);

        let html = `
            <div class="tree-item ${isSelected ? 'selected' : ''} ${isFolder ? 'folder' : 'file'} ${!isExpanded ? 'collapsed' : ''}" data-id="${itemId}">
                ${isFolder ? `<span class="toggle">${isExpanded ? '▼' : '▶'}</span>` : ''}
                <div class="item-content">
                    <i class="fas fa-${isFolder ? 'folder' : 'file'}"></i>
                    <span class="name" ondblclick="window.diagramApp.view.startInlineEdit('${itemId}')">${this.escapeHtml(item.name)}</span>
                    ${typeBadge}
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <ul class="dropdown-menu">
                        ${isFolder ? `
                        <li><a class="dropdown-item" href="#" data-action="new-file"><i class="fas fa-file-plus me-2"></i>New File</a></li>
                        <li><a class="dropdown-item" href="#" data-action="new-folder"><i class="fas fa-folder-plus me-2"></i>New Folder</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" data-action="delete"><i class="fas fa-trash me-2"></i>Delete</a></li>
                        ` : `
                        <li><a class="dropdown-item" href="#" data-action="download-svg"><i class="fas fa-image me-2"></i>Download SVG</a></li>
                        <li><a class="dropdown-item" href="#" data-action="download-png"><i class="fas fa-file-image me-2"></i>Download PNG</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" data-action="delete"><i class="fas fa-trash me-2"></i>Delete</a></li>
                        `}
                    </ul>
                </div>
            </div>
        `;

        if (isFolder && isExpanded && item.children) {
            html += '<div class="children">';
            item.children.forEach(childId => {
                html += this.buildTreeHtml(files, childId);
            });
            html += '</div>';
        }

        return html;
    }

    /**
     * Generates file type badge HTML for a project tree item
     * @param {Object} item - File item
     * @returns {string} Badge HTML string
     * @private
     */
    getFileTypeBadge(item) {
        const typeInfo = this.resolveFileTypeInfo(item);
        if (!typeInfo) {
            return '';
        }

        return `<span class="file-type-badge ${typeInfo.className}">${typeInfo.label}</span>`;
    }

    /**
     * Determines file type label/class from content or extension
     * @param {Object} item - File item
     * @returns {{label:string,className:string}|null}
     * @private
     */
    resolveFileTypeInfo(item) {
        if (!item || item.type !== 'file') {
            return null;
        }

        const contentType = detectDiagramType(item.content || '');
        if (contentType === 'mermaid') {
            return { label: 'Mermaid', className: 'badge-mermaid' };
        }

        if (contentType === 'plantuml') {
            return { label: 'PlantUML', className: 'badge-plantuml' };
        }

        const lowerName = (item.name || '').toLowerCase();
        if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
            return { label: 'Markdown', className: 'badge-markdown' };
        }

        if (lowerName.endsWith('.txt')) {
            return { label: 'Text', className: 'badge-text' };
        }

        return { label: 'File', className: 'badge-generic' };
    }

    /**
     * Escapes HTML characters for safe display
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            this.updateFileTypeBadge(fileType);
        } else {
            this.elements.fileNameDisplay.textContent = 'Untitled';
            if (this.editor) {
                this.editor.setValue('', -1);
            }

            // Disable toolbar buttons
            this.setToolbarButtonState(false);

            this.updateFileTypeBadge('unknown');
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
     * Updates file type badge display
     * @param {string} type - File type
     * @private
     */
    updateFileTypeBadge(type) {
        if (!this.elements.fileTypeBadge || !this.elements.previewType) {
            return;
        }

        let badgeText = '';
        let badgeClass = 'bg-secondary';
        let previewText = this.getPreviewModeDisplayName();

        switch (type) {
            case 'mermaid':
                badgeText = 'Mermaid';
                badgeClass = 'bg-info';
                break;
            case 'plantuml':
                badgeText = 'PlantUML';
                badgeClass = 'bg-success';
                break;
            default:
                badgeText = 'Text';
                badgeClass = 'bg-secondary';
        }

        this.elements.fileTypeBadge.textContent = badgeText;
        this.elements.fileTypeBadge.className = `badge ${badgeClass} ms-2`;
        this.elements.previewType.textContent = previewText;
    }

    /**
     * Gets display name for current preview mode
     * @returns {string} Display name
     * @private
     */
    getPreviewModeDisplayName() {
        const modeNames = {
            auto: 'Auto-detect',
            mermaid: 'Mermaid',
            plantuml: 'PlantUML',
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
    renderDiagram(code) {
        if (!this.elements.diagramPreview) {
            return;
        }

        let renderType;
        if (this.previewMode === 'auto') {
            renderType = detectDiagramType(code);
        } else {
            renderType = this.previewMode;
        }

        // Clear previous content
        this.elements.diagramPreview.innerHTML = '';

        try {
            if (renderType === 'mermaid') {
                this.renderMermaid(code);
            } else if (renderType === 'plantuml') {
                this.renderPlantuml(code);
            } else if (renderType === 'md') {
                this.renderMarkdown(code);
            } else {
                this.renderPlainText(code);
            }
        } catch (error) {
            console.error('Error rendering diagram:', error);
            this.renderError(error);
        }
    }

    /**
     * Renders Mermaid diagram
     * @param {string} code - Mermaid code
     * @private
     */
    renderMermaid(code) {
        if (!window.mermaid || !this.elements.diagramPreview) {
            throw new Error('Mermaid library not loaded');
        }

        const codeToRender = String(code || '');

        window.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark',
            securityLevel: 'loose'
        });

        window.mermaid.render('mermaid-diagram', codeToRender).then(({ svg }) => {
            this.elements.diagramPreview.innerHTML = svg;
            const svgElement = this.elements.diagramPreview.querySelector('svg');
            this.applySvgPanZoom(svgElement);
        }).catch(error => {
            throw new Error(`Mermaid rendering failed: ${error.message}`);
        });
    }

    /**
     * Renders PlantUML diagram
     * @param {string} code - PlantUML code
     * @private
     */
    async renderPlantuml(code) {
        if (!window.plantumlEncoder || !this.elements.diagramPreview) {
            throw new Error('PlantUML encoder not loaded');
        }

        // Validate PlantUML code
        const trimmedCode = (code || '').trim();
        if (!trimmedCode) {
            throw new Error('PlantUML code is empty');
        }

        // Check if code starts with @startuml
        if (!trimmedCode.startsWith('@startuml')) {
            throw new Error('Invalid PlantUML code: must start with @startuml');
        }

        try {
            console.log('Encoding PlantUML code, length:', trimmedCode.length);
            const encoded = window.plantumlEncoder.encode(trimmedCode);

            if (!encoded) {
                throw new Error('Failed to encode PlantUML code');
            }

            const imageUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
            console.log('PlantUML URL length:', imageUrl.length);

            // Check URL length limit (PlantUML has limits)
            if (imageUrl.length > 2000) {
                throw new Error('PlantUML code too complex. URL length exceeds limit.');
            }

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(imageUrl, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('PlantUML server response:', response.status, response.statusText);
                throw new Error(`PlantUML server error: ${response.status} ${response.statusText}`);
            }

            const svgText = await response.text();

            if (!svgText || svgText.length < 100) {
                throw new Error('Invalid PlantUML response: SVG too small');
            }

            this.elements.diagramPreview.innerHTML = svgText;
            const svgElement = this.elements.diagramPreview.querySelector('svg');
            this.applySvgPanZoom(svgElement);
        } catch (error) {
            console.error('PlantUML rendering failed:', error);

            // Provide more specific error messages
            let errorMessage = error.message;
            if (error.message.includes('PlantUML')) {
                errorMessage = 'Failed to render PlantUML diagram';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'PlantUML rendering timed out';
            }

            throw new Error(errorMessage);
        }
    }

    /**
     * Applies SVG normalization and pan/zoom behaviour for previews
     * @param {SVGElement|null} svgElement - SVG element to enhance
     * @param {Object} [options={}] - Additional pan/zoom options
     * @private
     */
    applySvgPanZoom(svgElement, options = {}) {
        if (!svgElement) {
            console.warn('SVG element not found for preview rendering');
            return;
        }

        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        svgElement.style.maxWidth = 'none';
        svgElement.style.width = 'auto';
        svgElement.style.height = 'auto';
        svgElement.style.display = 'block';

        if (!window.svgPanZoom) {
            return null;
        }

        if (svgElement._panZoomInstance && typeof svgElement._panZoomInstance.destroy === 'function') {
            svgElement._panZoomInstance.destroy();
        }

        const defaultOptions = {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: true,
            contain: true,
            center: true,
            minZoom: 0.5,
            maxZoom: 10,
            zoomScaleSensitivity: 0.2,
            dblClickZoomEnabled: true,
            mouseWheelZoomEnabled: true,
            preventMouseEventsDefault: false
        };

        svgElement._panZoomInstance = svgPanZoom(svgElement, { ...defaultOptions, ...options });
        return svgElement._panZoomInstance;
    }

    /**
     * Renders plain text content
     * @param {string} code - Text content
     * @private
     */
    renderPlainText(code) {
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
        // Clear any previous content first
        this.elements.diagramPreview.innerHTML = '';

        const errorDiv = document.createElement('div');
        errorDiv.className = 'd-flex align-items-center justify-content-center h-100 text-center';
        errorDiv.style.padding = '2rem';

        let errorIcon = 'fas fa-exclamation-triangle';
        let errorTitle = 'Error rendering diagram';
        let errorClass = 'text-danger';

        // Special handling for PlantUML errors
        if (error.message.includes('PlantUML')) {
            errorIcon = 'fas fa-code-branch';
            errorTitle = 'PlantUML Rendering Error';
            errorClass = 'text-warning';
        }

        errorDiv.innerHTML = `
            <div class="${errorClass}" style="max-width: 600px;">
                <i class="${errorIcon} fa-4x mb-4"></i>
                <h4 class="mb-3">${errorTitle}</h4>
                <div class="alert alert-${errorClass === 'text-warning' ? 'warning' : 'danger'} p-3">
                    <strong>Error Details:</strong><br>
                    ${error.message}
                </div>
                <small class="text-muted mt-3 d-block">
                    Check your diagram syntax and try again.
                </small>
            </div>
        `;

        this.elements.diagramPreview.appendChild(errorDiv);

        // Also show notification for PlantUML errors
        if (error.message.includes('PlantUML')) {
            this.showNotification(`PlantUML Error: ${error.message}`, 'warning');
        }
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
                this.elements.fileNameInput.value = this.getDefaultFileName(fileType);
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
        
        // Add folder options
        const project = window.diagramApp ? window.diagramApp.model.getCurrentProject() : null;
        if (project) {
            this.addFolderOptions(project.files, 'root', selectedPath);
        }
    }

    /**
     * Recursively adds folder options
     * @param {Object} files - Files collection
     * @param {string} itemId - Current item ID
     * @param {string} selectedPath - Selected path
     * @private
     */
    addFolderOptions(files, itemId, selectedPath) {
        const item = files[itemId];
        if (!item || item.type !== 'folder') return;

        const isRoot = itemId === 'root' || item.path === '/';
        if (!isRoot) {
            const option = document.createElement('option');
            option.value = item.path;
            option.textContent = item.path;
            if (item.path === selectedPath) {
                option.selected = true;
            }
            this.elements.fileLocation.appendChild(option);
        }

        // Add subfolders
        if (Array.isArray(item.children)) {
            item.children.forEach(childId => {
                this.addFolderOptions(files, childId, selectedPath);
            });
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
     * Starts inline editing for a tree item
     * @param {string} itemId - Item ID to edit
     * @public
     */
    startInlineEdit(itemId) {
        // Prevent any default event handling
        event?.preventDefault();
        event?.stopPropagation();
        
        const item = document.querySelector(`.tree-item[data-id="${itemId}"]`);
        if (!item) return;
        
        const nameSpan = item.querySelector('.name');
        if (!nameSpan) return;
        
        const currentName = nameSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'inline-edit-input';
        input.style.width = `${Math.max(nameSpan.offsetWidth, 100)}px`;
        
        // Replace span with input
        nameSpan.parentNode.replaceChild(input, nameSpan);
        input.focus();
        input.select();
        
        // Store original name for cancel
        input.dataset.originalName = currentName;
        input.dataset.itemId = itemId;
        
        // Event handlers
        input.addEventListener('blur', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.finishInlineEdit(input, false);
        });
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishInlineEdit(input, false);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.finishInlineEdit(input, true);
            }
        });
    }

    /**
     * Finishes inline editing
     * @param {HTMLInputElement} input - The input element
     * @param {boolean} cancel - Whether to cancel the edit
     * @private
     */
    finishInlineEdit(input, cancel) {
        const itemId = input.dataset.itemId;
        const newName = cancel ? input.dataset.originalName : input.value.trim();
        
        // Check if input is still a child of its parent
        if (!input.parentNode || !input.parentNode.contains(input)) {
            return; // Input was already replaced or removed
        }
        
        // Replace input back to span
        const span = document.createElement('span');
        span.className = 'name';
        span.textContent = newName;
        span.setAttribute('ondblclick', `window.diagramApp.view.startInlineEdit('${itemId}')`);
        
        try {
            input.parentNode.replaceChild(span, input);
        } catch (error) {
            console.warn('Failed to replace input element:', error);
            return;
        }
        
        // Save if not cancelled and name changed
        if (!cancel && newName && newName !== input.dataset.originalName) {
            try {
                window.diagramApp.controller.handleInlineRename(itemId, newName);
            } catch (error) {
                console.error('Rename failed:', error);
                // Revert visual change
                span.textContent = input.dataset.originalName;
                this.showNotification('Failed to rename item', 'error');
            }
        }
    }

    /**
     * Shows notification message
     * @param {string} message - Message to display
     * @param {string} type - Notification type
     * @public
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
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
     * Retrieves the current diagram content from editor or model
     * @returns {string|null} Diagram content or null if unavailable
     * @public
     */
    getCurrentDiagramContent() {
        let content = '';

        if (this.editor) {
            content = this.editor.getValue() || '';
        }

        if (!content || !content.trim()) {
            const currentFile = window.diagramApp ? window.diagramApp.model.getCurrentFile() : null;
            content = currentFile ? currentFile.content || '' : '';
        }

        return content && content.trim().length ? content : null;
    }

    /**
     * Opens diagram content in a new browser tab
     * @param {string} content - Diagram source
     * @private
     */
    openDiagramInNewTab(content) {
        const type = this.detectFileType(content);

        if (type === 'mermaid') {
            this.renderMermaidToNewTab(content);
        } else if (type === 'plantuml') {
            this.renderPlantumlToNewTab(content);
        } else {
            this.openPlainTextInNewTab(content);
        }
    }

    /**
     * Renders Mermaid content into a new tab
     * @param {string} content - Mermaid source
     * @private
     */
    async renderMermaidToNewTab(content) {
        if (!window.mermaid) {
            this.showNotification('Mermaid library not loaded', 'error');
            return;
        }

        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';

        window.mermaid.initialize({
            startOnLoad: false,
            theme,
            securityLevel: 'loose'
        });

        try {
            const { svg } = await window.mermaid.render('new-tab-mermaid-' + Date.now(), content);
            this.openSvgInNewTab(svg);
        } catch (error) {
            this.showNotification(`Mermaid rendering failed: ${error.message}`, 'error');
        }
    }

    /**
     * Renders PlantUML content into a new tab
     * @param {string} content - PlantUML source
     * @private
     */
    async renderPlantumlToNewTab(content) {
        if (!window.plantumlEncoder) {
            this.showNotification('PlantUML encoder not loaded', 'error');
            return;
        }

        try {
            const encoded = window.plantumlEncoder.encode(content);
            const imageUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch PlantUML diagram: ${response.statusText}`);
            }

            const svgText = await response.text();
            this.openSvgInNewTab(svgText);
        } catch (error) {
            this.showNotification(`PlantUML rendering failed: ${error.message}`, 'error');
        }
    }

    /**
     * Opens plain text content in a new tab
     * @param {string} content - Text content
     * @private
     */
    openPlainTextInNewTab(content) {
        const blob = new Blob([`<pre style="font-family: monospace; padding: 16px;">${this.escapeHtml(content)}</pre>`], {
            type: 'text/html'
        });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
    }

    /**
     * Opens SVG markup in a new tab
     * @param {string} svgMarkup - SVG markup
     * @private
     */
    openSvgInNewTab(svgMarkup) {
        const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
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

// Default export for convenience
export default DiagramView;
