/**
 * Model Module - Enterprise Diagram IDE
 * Manages application state, data persistence, and business logic.
 *
 * This module provides the core data model for the Diagram IDE, handling
 * project state, file operations, and application settings.
 *
 * @module Model
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

import { FileSystem } from './FileSystem.js';

/**
 * DiagramModel class - Manages application data and state
 * @class
 */
export class DiagramModel {
    /**
     * Creates a new DiagramModel instance
     * @constructor
     */
    constructor() {
        /**
         * File system instance for data persistence
         * @type {FileSystem}
         * @private
         */
        this.fileSystem = new FileSystem();

        /**
         * Application settings
         * @type {Object}
         * @private
         */
        this.settings = {
            theme: 'light',
            scale: 100,
            fontSize: 14,
            autoSave: true
        };

        /**
         * Current view identifier
         * @type {string}
         * @private
         */
        this.currentView = 'editor';

        /**
         * Currently opened file
         * @type {Object|null}
         * @private
         */
        this.currentFile = null;

        /**
         * Current project reference
         * @type {Object|null}
         * @private
         */
        this.currentProject = null;

        // Initialize model
        this.loadSettings();
        this.initializeProject();
    }

    /**
     * Loads application settings from localStorage
     * @private
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('diagramIDE_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error.message);
        }
    }

    /**
     * Saves application settings to localStorage
     * @private
     */
    saveSettings() {
        try {
            localStorage.setItem('diagramIDE_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error.message);
        }
    }

    /**
     * Initializes project on model startup
     * @private
     */
    initializeProject() {
        this.currentProject = this.fileSystem.getCurrentProject();
        if (!this.currentProject) {
            // Create default project
            this.currentProject = this.fileSystem.createProject('My Project');
        }
    }

    /**
     * Updates application settings
     * @param {Object} newSettings - Settings to update
     * @public
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    /**
     * Retrieves current application settings
     * @returns {Object} Current settings
     * @public
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Creates a new project
     * @param {string} name - Project name
     * @public
     */
    createNewProject(name) {
        this.currentProject = this.fileSystem.createProject(name);
        this.currentFile = null;
    }

    /**
     * Retrieves current project
     * @returns {Object|null} Current project object
     * @public
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * Retrieves all projects
     * @returns {Object} Projects collection
     * @public
     */
    getProjects() {
        return this.fileSystem.getProjects();
    }

    /**
     * Sets current view
     * @param {string} view - View identifier
     * @public
     */
    setCurrentView(view) {
        this.currentView = view;
    }

    /**
     * Retrieves current view
     * @returns {string} Current view identifier
     * @public
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Opens a file for editing
     * @param {string} fileId - File identifier
     * @public
     */
    openFile(fileId) {
        const file = this.fileSystem.getItem(fileId);
        if (file && file.type === 'file') {
            this.currentFile = file;
            this.setCurrentView('editor');
        }
    }

    /**
     * Retrieves currently opened file
     * @returns {Object|null} Current file object
     * @public
     */
    getCurrentFile() {
        return this.currentFile;
    }

    /**
     * Saves content to current file
     * @param {string} content - File content
     * @public
     */
    saveCurrentFile(content) {
        if (this.currentFile) {
            this.fileSystem.updateFileContent(this.currentFile.id, content);
            this.currentFile.content = content;
            this.currentFile.modified = new Date().toISOString();
        }
    }

    /**
     * Creates a new file
     * @param {string} name - File name
     * @param {string} [parentPath='/'] - Parent folder path
     * @param {string} [content=''] - File content
     * @returns {Object} Created file object
     * @public
     */
    createFile(name, parentPath = '/', content = '') {
        return this.fileSystem.createItem(parentPath, name, 'file', content);
    }

    /**
     * Creates a new folder
     * @param {string} name - Folder name
     * @param {string} [parentPath='/'] - Parent folder path
     * @returns {Object} Created folder object
     * @public
     */
    createFolder(name, parentPath = '/') {
        return this.fileSystem.createItem(parentPath, name, 'folder');
    }

    /**
     * Renames an item
     * @param {string} id - Item identifier
     * @param {string} newName - New name
     * @public
     */
    renameItem(id, newName) {
        this.fileSystem.renameItem(id, newName);

        // Update current file reference if renamed
        if (this.currentFile && this.currentFile.id === id) {
            this.currentFile = this.fileSystem.getItem(id);
        }
    }

    /**
     * Deletes an item
     * @param {string} id - Item identifier
     * @public
     */
    deleteItem(id) {
        // Clear current file if deleted
        if (this.currentFile && this.currentFile.id === id) {
            this.currentFile = null;
        }

        this.fileSystem.deleteItem(id);
    }

    /**
     * Exports current project
     * @returns {Promise<Blob>} Project data blob
     * @public
     */
    async exportCurrentProject() {
        if (this.currentProject) {
            return await this.fileSystem.exportProject(this.currentProject.id);
        }
        return null;
    }

    /**
     * Imports project data
     * @param {Object} importData - Project import data
     * @public
     */
    importProject(importData) {
        this.currentProject = this.fileSystem.importProject(importData);
    }
}

// Default export for convenience
export default DiagramModel;
