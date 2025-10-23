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
                console.log('Fullscreen button clicked');
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

        let html = `
            <div class="tree-item ${isSelected ? 'selected' : ''} ${isFolder ? 'folder' : 'file'} ${!isExpanded ? 'collapsed' : ''}" data-id="${itemId}">
                ${isFolder ? `<span class="toggle">${isExpanded ? '▼' : '▶'}</span>` : ''}
                <i class="fas fa-${isFolder ? 'folder' : 'file'}"></i>
                <span class="name" ondblclick="window.diagramApp.view.startInlineEdit('${itemId}')">${this.escapeHtml(item.name)}</span>
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

        const trimmed = content.trim();

        // Mermaid syntax detection
        if (trimmed.includes('graph ') ||
            trimmed.includes('flowchart ') ||
            trimmed.includes('sequenceDiagram') ||
            trimmed.includes('classDiagram') ||
            trimmed.includes('stateDiagram') ||
            /^\s*graph\s+/.test(trimmed)) {
            return 'mermaid';
        }

        // PlantUML syntax detection
        if (trimmed.startsWith('@startuml') ||
            trimmed.startsWith('@startmindmap') ||
            trimmed.startsWith('@startwbs') ||
            trimmed.includes('skinparam') ||
            (trimmed.includes('->') && trimmed.includes(':'))) {
            return 'plantuml';
        }

        return 'unknown';
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
            renderType = this.detectFileType(code);
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
        console.log('Rendering Mermaid with code:', codeToRender); // Debugging line

        window.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark',
            securityLevel: 'loose'
        });

        window.mermaid.render('mermaid-diagram', codeToRender).then(({ svg }) => {
            this.elements.diagramPreview.innerHTML = svg;
            const svgElement = this.elements.diagramPreview.querySelector('svg');
            if (svgElement && window.svgPanZoom) {
                svgPanZoom(svgElement, {
                    zoomEnabled: true,
                    controlIconsEnabled: true,
                    fit: true,
                    center: true,
                    minZoom: 0.5,
                    maxZoom: 10
                });
            }
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

        try {
            const encoded = window.plantumlEncoder.encode(code);
            const imageUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
            
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch PlantUML diagram: ${response.statusText}`);
            }
            const svgText = await response.text();

            this.elements.diagramPreview.innerHTML = svgText;
            const svgElement = this.elements.diagramPreview.querySelector('svg');

            if (svgElement && window.svgPanZoom) {
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgElement.removeAttribute('width');
                svgElement.removeAttribute('height');

                svgPanZoom(svgElement, {
                    zoomEnabled: true,
                    controlIconsEnabled: true,
                    fit: true,
                    center: true,
                    minZoom: 0.5,
                    maxZoom: 10
                });
            }
        } catch (error) {
            console.error('PlantUML rendering failed:', error);
            this.renderError(new Error(`PlantUML rendering failed: ${error.message}`));
        }
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
        const errorDiv = document.createElement('div');
        errorDiv.className = 'd-flex align-items-center justify-content-center h-100';
        errorDiv.innerHTML = `
            <div class="text-center text-danger">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <p>Error rendering diagram: ${error.message}</p>
            </div>
        `;

        this.elements.diagramPreview.appendChild(errorDiv);
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
            this.addFolderOptions(project.files, 'root', '', selectedPath);
        }
    }

    /**
     * Recursively adds folder options
     * @param {Object} files - Files collection
     * @param {string} itemId - Current item ID
     * @param {string} prefix - Path prefix
     * @param {string} selectedPath - Selected path
     * @private
     */
    addFolderOptions(files, itemId, prefix, selectedPath) {
        const item = files[itemId];
        if (!item || item.type !== 'folder') return;
        
        const fullPath = prefix ? `${prefix}/${item.name}` : `/${item.name}`;
        const option = document.createElement('option');
        option.value = fullPath;
        option.textContent = fullPath;
        if (fullPath === selectedPath) {
            option.selected = true;
        }
        this.elements.fileLocation.appendChild(option);
        
        // Add subfolders
        if (item.children) {
            item.children.forEach(childId => {
                this.addFolderOptions(files, childId, fullPath, selectedPath);
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
        if (!this.elements.fullscreenModal || !this.elements.fullscreenPreview) {
            return;
        }

        // Get current file content
        const currentFile = window.diagramApp ? window.diagramApp.model.getCurrentFile() : null;
        if (!currentFile || !currentFile.content) {
            this.showNotification('No diagram to display in full screen', 'warning');
            return;
        }

        // Clear previous content
        this.elements.fullscreenPreview.innerHTML = '<div style="color: white; font-size: 24px;">Loading fullscreen preview...</div>';

        // Store content for rendering
        this._fullscreenContent = currentFile.content;

        // Show modal
        this.elements.fullscreenModal.show();

        // Render after modal is shown (with small delay)
        setTimeout(() => {
            this.renderDiagramFullscreen(this._fullscreenContent);
            this._fullscreenContent = null;
        }, 300);
    }

    /**
     * Renders diagram in fullscreen mode with enhanced pan and zoom
     * @param {string} code - Diagram code
     * @private
     */
    renderDiagramFullscreen(code) {
        console.log('Rendering diagram in fullscreen:', code.substring(0, 100) + '...');
        let renderType;
        if (this.previewMode === 'auto') {
            renderType = this.detectFileType(code);
        } else {
            renderType = this.previewMode;
        }
        console.log('Detected render type:', renderType);

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
        console.log('Rendering Mermaid in fullscreen');
        if (!window.mermaid || !this.elements.fullscreenPreview) {
            throw new Error('Mermaid library not loaded');
        }

        window.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark',
            securityLevel: 'loose'
        });

        const renderCallback = (svgCode) => {
            console.log('Mermaid render callback received SVG');
            this.elements.fullscreenPreview.innerHTML = svgCode;
            const svgElement = this.elements.fullscreenPreview.querySelector('svg');
            if (svgElement && window.svgPanZoom) {
                console.log('Applying svgPanZoom to fullscreen SVG');
                // Enhanced pan and zoom for fullscreen
                svgPanZoom(svgElement, {
                    zoomEnabled: true,
                    controlIconsEnabled: true,
                    fit: true,
                    center: true,
                    minZoom: 0.1,
                    maxZoom: 20,
                    zoomScaleSensitivity: 0.2,
                    dblClickZoomEnabled: true,
                    mouseWheelZoomEnabled: true,
                    preventMouseEventsDefault: false
                });
            } else {
                console.warn('SVG element or svgPanZoom not found');
            }
        };

        const id = 'fullscreen-mermaid-' + Date.now();
        console.log('Calling mermaid.render with id:', id);
        window.mermaid.render(id, code).then(({ svg }) => {
            console.log('Mermaid render promise resolved');
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

            if (svgElement && window.svgPanZoom) {
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgElement.removeAttribute('width');
                svgElement.removeAttribute('height');

                // Enhanced pan and zoom for fullscreen
                svgPanZoom(svgElement, {
                    zoomEnabled: true,
                    controlIconsEnabled: true,
                    fit: true,
                    center: true,
                    minZoom: 0.1,
                    maxZoom: 20,
                    zoomScaleSensitivity: 0.2,
                    dblClickZoomEnabled: true,
                    mouseWheelZoomEnabled: true,
                    preventMouseEventsDefault: false
                });
            }
        } catch (error) {
            console.error('PlantUML fullscreen rendering failed:', error);
            this.renderErrorFullscreen(new Error(`PlantUML fullscreen rendering failed: ${error.message}`));
        }
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
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true
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
