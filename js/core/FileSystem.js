/**
 * FileSystem Module - Enterprise Diagram IDE
 * Handles localStorage-based file operations for the Diagram IDE application.
 *
 * This module provides a complete file system abstraction using browser localStorage,
 * supporting hierarchical folder structures, file operations, and project management.
 *
 * @module FileSystem
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

/**
 * FileSystem class - Manages localStorage-based file operations
 * @class
 */
export class FileSystem {
    /**
     * Creates a new FileSystem instance
     * @param {string} [storageKey='diagramIDE_projects'] - localStorage key for data persistence
     */
    constructor(storageKey = 'diagramIDE_projects') {
        /**
         * localStorage key for project data persistence
         * @type {string}
         * @private
         */
        this.storageKey = storageKey;

        /**
         * In-memory project data structure
         * @type {Object}
         * @private
         */
        this.projects = this.loadProjects();
    }

    /**
     * Loads projects data from localStorage
     * @returns {Object} Projects data structure with current project and project list
     * @private
     */
    loadProjects() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {
                currentProject: null,
                projects: {}
            };
        } catch (error) {
            console.warn('Failed to load projects from localStorage:', error.message);
            return {
                currentProject: null,
                projects: {}
            };
        }
    }

    /**
     * Saves projects data to localStorage
     * @private
     */
    saveProjects() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.projects));
        } catch (error) {
            console.error('Failed to save projects to localStorage:', error.message);
        }
    }

    /**
     * Creates a new project with default structure
     * @param {string} name - Project name
     * @returns {Object} Created project object
     * @public
     */
    createProject(name) {
        const projectId = 'project_' + Date.now();

        const project = {
            id: projectId,
            name: name,
            created: new Date().toISOString(),
            files: {
                'root': {
                    type: 'folder',
                    name: 'root',
                    path: '/',
                    children: [],
                    expanded: true
                }
            },
            settings: {
                theme: 'dark',
                scale: 100,
                fontSize: 14
            }
        };

        this.projects.projects[projectId] = project;
        this.projects.currentProject = projectId;
        this.saveProjects();

        return project;
    }

    /**
     * Retrieves the current active project
     * @returns {Object|null} Current project object or null if none selected
     * @public
     */
    getCurrentProject() {
        if (!this.projects.currentProject) {
            return null;
        }
        return this.projects.projects[this.projects.currentProject] || null;
    }

    /**
     * Sets the current active project
     * @param {string} projectId - Project identifier
     * @public
     */
    setCurrentProject(projectId) {
        if (this.projects.projects[projectId]) {
            this.projects.currentProject = projectId;
            this.saveProjects();
        }
    }

    /**
     * Retrieves all projects
     * @returns {Object} Projects collection
     * @public
     */
    getProjects() {
        return this.projects.projects;
    }

    /**
     * Creates a new file or folder item
     * @param {string} parentPath - Parent folder path
     * @param {string} name - Item name
     * @param {string} type - Item type ('file' or 'folder')
     * @param {string} [content=''] - File content (ignored for folders)
     * @returns {Object} Created item object
     * @public
     */
    createItem(parentPath, name, type, content = '') {
        const project = this.getCurrentProject();
        if (!project) {
            throw new Error('No current project selected');
        }

        const itemId = type + '_' + Date.now();
        const fullPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;

        const item = {
            id: itemId,
            type: type,
            name: name,
            path: fullPath,
            content: type === 'file' ? content : '',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        if (type === 'folder') {
            item.children = [];
            item.expanded = true;
        }

        project.files[itemId] = item;

        // Add to parent folder's children
        const parentId = this.findItemByPath(parentPath);
        if (parentId && project.files[parentId]) {
            const parentItem = project.files[parentId];
            if (parentItem.type === 'folder') {
                if (!Array.isArray(parentItem.children)) {
                    parentItem.children = [];
                }
                parentItem.children.push(itemId);
            }
        }

        this.saveProjects();
        return item;
    }

    /**
     * Finds an item by its path
     * @param {string} path - Item path
     * @returns {string|null} Item ID or null if not found
     * @private
     */
    findItemByPath(path) {
        const project = this.getCurrentProject();
        if (!project) {
            return null;
        }

        for (const [id, item] of Object.entries(project.files)) {
            if (item.path === path) {
                return id;
            }
        }
        return null;
    }

    /**
     * Retrieves an item by its ID
     * @param {string} id - Item identifier
     * @returns {Object|null} Item object or null if not found
     * @public
     */
    getItem(id) {
        const project = this.getCurrentProject();
        return project ? project.files[id] || null : null;
    }

    /**
     * Updates file content
     * @param {string} id - File identifier
     * @param {string} content - New content
     * @public
     */
    updateFileContent(id, content) {
        const project = this.getCurrentProject();
        if (project && project.files[id] && project.files[id].type === 'file') {
            project.files[id].content = content;
            project.files[id].modified = new Date().toISOString();
            this.saveProjects();
        }
    }

    /**
     * Renames an item
     * @param {string} id - Item identifier
     * @param {string} newName - New name
     * @public
     */
    renameItem(id, newName) {
        const project = this.getCurrentProject();
        if (!project || !project.files[id]) {
            return;
        }

        const item = project.files[id];
        const oldPath = item.path;
        const pathParts = oldPath.split('/');
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');

        item.name = newName;
        item.path = newPath;
        item.modified = new Date().toISOString();

        // Update paths for children if it's a folder
        if (item.type === 'folder') {
            this.updateChildrenPaths(id, oldPath, newPath);
        }

        this.saveProjects();
    }

    /**
     * Updates children paths recursively
     * @param {string} folderId - Folder identifier
     * @param {string} oldPath - Old path
     * @param {string} newPath - New path
     * @private
     */
    updateChildrenPaths(folderId, oldPath, newPath) {
        const project = this.getCurrentProject();
        if (!project) {
            return;
        }

        const folder = project.files[folderId];
        if (!folder || folder.type !== 'folder') {
            return;
        }

        folder.children.forEach(childId => {
            const child = project.files[childId];
            if (child) {
                child.path = child.path.replace(oldPath, newPath);
                if (child.type === 'folder') {
                    this.updateChildrenPaths(childId, oldPath, newPath);
                }
            }
        });
    }

    /**
     * Deletes an item and its children recursively
     * @param {string} id - Item identifier
     * @public
     */
    deleteItem(id) {
        const project = this.getCurrentProject();
        if (!project || !project.files[id]) {
            return;
        }

        const item = project.files[id];

        // Remove from parent's children
        const parentPath = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
        const parentId = this.findItemByPath(parentPath);
        if (parentId && project.files[parentId]) {
            project.files[parentId].children = project.files[parentId].children.filter(childId => childId !== id);
        }

        // Delete item and children recursively
        this.deleteItemRecursive(id, project);
        this.saveProjects();
    }

    /**
     * Deletes an item recursively
     * @param {string} id - Item identifier
     * @param {Object} project - Project object
     * @private
     */
    deleteItemRecursive(id, project) {
        const item = project.files[id];
        if (!item) {
            return;
        }

        if (item.type === 'folder' && item.children) {
            item.children.forEach(childId => {
                this.deleteItemRecursive(childId, project);
            });
        }

        delete project.files[id];
    }

    /**
     * Exports project as JSON blob
     * @param {string} projectId - Project identifier
     * @returns {Promise<Blob>} JSON blob for download
     * @public
     */
    async exportProject(projectId) {
        const project = this.projects.projects[projectId];
        if (!project) {
            throw new Error('Project not found');
        }

        const exportData = {
            name: project.name,
            exported: new Date().toISOString(),
            files: {}
        };

        // Collect all files
        for (const [id, item] of Object.entries(project.files)) {
            if (item.type === 'file') {
                exportData.files[item.path] = {
                    content: item.content,
                    modified: item.modified
                };
            }
        }

        // Create blob
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        return blob;
    }

    /**
     * Gets all folder paths in the current project for UI dropdowns
     * @returns {Array} Array of folder paths
     * @public
     */
    getFolderPaths() {
        const project = this.getCurrentProject();
        if (!project) {
            return [];
        }

        const folders = [];

        const collectFolders = (itemId) => {
            const item = project.files[itemId];
            if (!item || item.type !== 'folder') {
                return;
            }

            folders.push({
                id: itemId,
                path: item.path,
                name: item.name
            });

            if (Array.isArray(item.children)) {
                item.children.forEach(childId => collectFolders(childId));
            }
        };

        collectFolders('root');
        return folders;
    }

    /**
     * Gets all folder paths as simple string array for dropdown options
     * @returns {Array} Array of folder path strings
     * @public
     */
    getFolderPathStrings() {
        const paths = this.getFolderPaths().map(folder => folder.path || '/');

        // Ensure root path is included first and remove duplicates
        const unique = new Set(['/']);
        paths.forEach(path => {
            if (path && path !== '/') {
                unique.add(path);
            }
        });

        return Array.from(unique);
    }
}

// Default export for convenience
export default FileSystem;
