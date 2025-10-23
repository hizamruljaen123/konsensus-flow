/**
 * PanZoom Library - Enterprise Diagram IDE
 * Handles SVG pan and zoom functionality with custom controls
 *
 * This module provides a complete pan and zoom solution for SVG diagrams,
 * with touch support, mouse wheel, and custom control buttons.
 *
 * @module PanZoom
 * @version 1.0.0
 * @author Diagram IDE Team
 * @license MIT
 */

'use strict';

/**
 * PanZoom class - Manages SVG pan and zoom functionality
 * @class
 */
export class PanZoom {
    /**
     * Creates a new PanZoom instance
     * @param {SVGElement} svgElement - The SVG element to apply pan/zoom to
     * @param {Object} [options={}] - Configuration options
     * @param {Object} [options.controls=null] - Reference to control buttons
     * @param {boolean} [options.zoomEnabled=true] - Enable zoom functionality
     * @param {boolean} [options.panEnabled=true] - Enable pan functionality
     * @param {number} [options.minZoom=0.1] - Minimum zoom level
     * @param {number} [options.maxZoom=10] - Maximum zoom level
     * @param {number} [options.zoomScaleSensitivity=0.2] - Zoom sensitivity
     * @param {boolean} [options.dblClickZoomEnabled=true] - Enable double-click zoom
     * @param {boolean} [options.mouseWheelZoomEnabled=true] - Enable mouse wheel zoom
     * @param {boolean} [options.fitOnLoad=true] - Fit diagram to container on initialization
     */
    constructor(svgElement, options = {}) {
        /**
         * The SVG element being controlled
         * @type {SVGElement}
         * @private
         */
        this.svgElement = svgElement;

        /**
         * Configuration options
         * @type {Object}
         * @private
         */
        this.options = {
            controls: null,
            zoomEnabled: true,
            panEnabled: true,
            minZoom: 0.1,
            maxZoom: 10,
            zoomScaleSensitivity: 0.2,
            dblClickZoomEnabled: true,
            mouseWheelZoomEnabled: true,
            fitOnLoad: true,
            ...options
        };

        /**
         * Current zoom level
         * @type {number}
         * @private
         */
        this.currentZoom = 1;

        /**
         * Current pan position
         * @type {Object}
         * @private
         */
        this.currentPan = { x: 0, y: 0 };

        /**
         * Is currently dragging
         * @type {boolean}
         * @private
         */
        this.isDragging = false;

        /**
         * Last mouse position
         * @type {Object}
         * @private
         */
        this.lastMousePos = { x: 0, y: 0 };

        /**
         * Initial pinch distance for touch zoom
         * @type {number|null}
         * @private
         */
        this.initialPinchDistance = null;

        /**
         * Initial zoom level for touch zoom
         * @type {number|null}
         * @private
         */
        this.initialZoom = null;

        // Initialize pan-zoom functionality
        this.initialize();
    }

    /**
     * Initializes the pan-zoom functionality
     * @private
     */
    initialize() {
        if (!this.svgElement) {
            console.warn('PanZoom: No SVG element provided');
            return;
        }

        // Apply basic SVG styling
        this.applySvgStyling();

        // Setup event listeners for native pan and zoom
        this.setupEventListeners();

        // Setup control buttons if provided
        if (this.options.controls) {
            this.setupControlButtons();
        }

        // Setup touch and gesture support
        this.setupTouchSupport();

        // Fit to container initially if enabled
        if (this.options.fitOnLoad) {
            setTimeout(() => this.fit(), 100);
        }
    }

    /**
     * Applies basic styling to the SVG element
     * @private
     */
    applySvgStyling() {
        // Remove any existing width/height attributes to allow responsive sizing
        this.svgElement.removeAttribute('width');
        this.svgElement.removeAttribute('height');

        // Apply responsive styling
        Object.assign(this.svgElement.style, {
            maxWidth: '100%',
            width: 'auto',
            height: 'auto',
            display: 'block',
            cursor: this.options.panEnabled ? 'grab' : 'default'
        });
    }

    /**
     * Sets up native event listeners for pan and zoom
     * @private
     */
    setupEventListeners() {
        if (!this.options.zoomEnabled && !this.options.panEnabled) return;

        // Mouse wheel for zoom
        if (this.options.zoomEnabled && this.options.mouseWheelZoomEnabled) {
            this.svgElement.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }

        // Mouse events for pan
        if (this.options.panEnabled) {
            this.svgElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.svgElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.svgElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.svgElement.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        }

        // Double-click for zoom
        if (this.options.zoomEnabled && this.options.dblClickZoomEnabled) {
            this.svgElement.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        }

        // Touch events
        if (this.options.panEnabled || this.options.zoomEnabled) {
            this.svgElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            this.svgElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.svgElement.addEventListener('touchend', this.handleTouchEnd.bind(this));
        }
    }

    /**
     * Handles mouse wheel events for zooming
     * @param {WheelEvent} event - Wheel event
     * @private
     */
    handleWheel(event) {
        event.preventDefault();

        const delta = event.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
        this.zoomBy(delta, event.clientX, event.clientY);
    }

    /**
     * Handles mouse down for pan start
     * @param {MouseEvent} event - Mouse down event
     * @private
     */
    handleMouseDown(event) {
        if (event.button !== 0) return; // Only left mouse button

        this.isDragging = true;
        this.lastMousePos = { x: event.clientX, y: event.clientY };
        this.updateCursor();
        event.preventDefault();
    }

    /**
     * Handles mouse move for panning
     * @param {MouseEvent} event - Mouse move event
     * @private
     */
    handleMouseMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.lastMousePos.x;
        const deltaY = event.clientY - this.lastMousePos.y;

        this.panBy(deltaX, deltaY);

        this.lastMousePos = { x: event.clientX, y: event.clientY };
        event.preventDefault();
    }

    /**
     * Handles mouse up for pan end
     * @param {MouseEvent} event - Mouse up event
     * @private
     */
    handleMouseUp(event) {
        this.isDragging = false;
        this.updateCursor();
    }

    /**
     * Handles double-click for zoom toggle
     * @param {MouseEvent} event - Double-click event
     * @private
     */
    handleDoubleClick(event) {
        const rect = this.svgElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Toggle between fit and 100% zoom
        if (Math.abs(this.currentZoom - 1) < 0.1) {
            this.fit();
        } else {
            this.setZoom(1);
            this.centerAt(centerX, centerY);
        }
    }

    /**
     * Handles touch start for multi-touch gestures
     * @param {TouchEvent} event - Touch start event
     * @private
     */
    handleTouchStart(event) {
        if (event.touches.length === 1 && this.options.panEnabled) {
            // Single touch - start pan
            this.isDragging = true;
            this.lastMousePos = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        } else if (event.touches.length === 2 && this.options.zoomEnabled) {
            // Two fingers - start pinch zoom
            event.preventDefault();
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.initialPinchDistance = this.getTouchDistance(touch1, touch2);
            this.initialZoom = this.currentZoom;
        }
    }

    /**
     * Handles touch move for pan and pinch zoom
     * @param {TouchEvent} event - Touch move event
     * @private
     */
    handleTouchMove(event) {
        if (event.touches.length === 1 && this.isDragging && this.options.panEnabled) {
            // Single touch pan
            const deltaX = event.touches[0].clientX - this.lastMousePos.x;
            const deltaY = event.touches[0].clientY - this.lastMousePos.y;

            this.panBy(deltaX, deltaY);

            this.lastMousePos = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
            event.preventDefault();
        } else if (event.touches.length === 2 && this.options.zoomEnabled) {
            // Pinch zoom
            event.preventDefault();
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = this.getTouchDistance(touch1, touch2);

            if (this.initialPinchDistance) {
                const scale = currentDistance / this.initialPinchDistance;
                const newZoom = this.initialZoom * scale;
                this.setZoom(Math.max(this.options.minZoom, Math.min(this.options.maxZoom, newZoom)));
            }
        }
    }

    /**
     * Handles touch end
     * @param {TouchEvent} event - Touch end event
     * @private
     */
    handleTouchEnd(event) {
        this.isDragging = false;
        this.initialPinchDistance = null;
        this.initialZoom = null;
    }

    /**
     * Calculates distance between two touch points
     * @param {Touch} touch1 - First touch point
     * @param {Touch} touch2 - Second touch point
     * @returns {number} Distance between touches
     * @private
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Sets up control button event listeners
     * @private
     */
    setupControlButtons() {
        if (!this.options.controls) return;

        const controls = this.options.controls;

        // Zoom in button
        if (controls.zoomInBtn) {
            controls.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }

        // Zoom out button
        if (controls.zoomOutBtn) {
            controls.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }

        // Fit button
        if (controls.zoomFitBtn) {
            controls.zoomFitBtn.addEventListener('click', () => this.fit());
        }

        // Reset button
        if (controls.zoomResetBtn) {
            controls.zoomResetBtn.addEventListener('click', () => this.reset());
        }
    }

    /**
     * Sets up touch and gesture support for mobile devices
     * @private
     */
    setupTouchSupport() {
        if (!this.panZoomInstance) return;

        // Touch events are handled by svg-pan-zoom library
        // We can add custom touch gestures here if needed
    }

    /**
     * Updates cursor based on interaction state
     * @private
     */
    updateCursor() {
        if (!this.svgElement) return;

        const cursor = this.isDragging ? 'grabbing' :
                      (this.options.panEnabled ? 'grab' : 'default');
        this.svgElement.style.cursor = cursor;
    }

    /**
     * Zooms in by one step
     * @returns {boolean} True if zoom was performed
     */
    zoomIn() {
        if (!this.options.zoomEnabled) return false;
        return this.zoomBy(1.2); // 20% zoom in
    }

    /**
     * Zooms out by one step
     * @returns {boolean} True if zoom was performed
     */
    zoomOut() {
        if (!this.options.zoomEnabled) return false;
        return this.zoomBy(0.8); // 20% zoom out
    }

    /**
     * Zooms by a given factor
     * @param {number} factor - Zoom factor (e.g., 1.2 for zoom in, 0.8 for zoom out)
     * @param {number} [centerX] - X coordinate to zoom towards
     * @param {number} [centerY] - Y coordinate to zoom towards
     * @returns {boolean} True if zoom was performed
     * @private
     */
    zoomBy(factor, centerX, centerY) {
        const newZoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, this.currentZoom * factor));

        if (newZoom === this.currentZoom) return false;

        // If center point provided, adjust pan to zoom towards that point
        if (centerX !== undefined && centerY !== undefined) {
            const rect = this.svgElement.getBoundingClientRect();
            const relativeX = centerX - rect.left;
            const relativeY = centerY - rect.top;

            // Calculate new pan position to keep the zoom center at the same screen position
            const zoomRatio = newZoom / this.currentZoom;
            const newPanX = centerX - rect.left - (relativeX * zoomRatio);
            const newPanY = centerY - rect.top - (relativeY * zoomRatio);

            this.currentPan.x = newPanX;
            this.currentPan.y = newPanY;
        }

        this.currentZoom = newZoom;
        this.applyTransform();
        return true;
    }

    /**
     * Pans by the given delta values
     * @param {number} deltaX - Horizontal pan amount
     * @param {number} deltaY - Vertical pan amount
     * @returns {boolean} True if pan was performed
     * @private
     */
    panBy(deltaX, deltaY) {
        if (!this.options.panEnabled) return false;

        this.currentPan.x += deltaX;
        this.currentPan.y += deltaY;
        this.applyTransform();
        return true;
    }

    /**
     * Fits the diagram to the container
     * @returns {boolean} True if fit was performed
     */
    fit() {
        if (!this.svgElement) return false;

        const container = this.svgElement.parentElement;
        if (!container) return false;

        const containerRect = container.getBoundingClientRect();
        const svgRect = this.svgElement.getBoundingClientRect();

        // Calculate scale to fit
        const scaleX = containerRect.width / svgRect.width;
        const scaleY = containerRect.height / svgRect.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

        this.currentZoom = scale;
        this.currentPan.x = (containerRect.width - svgRect.width * scale) / 2;
        this.currentPan.y = (containerRect.height - svgRect.height * scale) / 2;

        this.applyTransform();
        return true;
    }

    /**
     * Resets zoom and pan to initial state
     * @returns {boolean} True if reset was performed
     */
    reset() {
        this.currentZoom = 1;
        this.currentPan.x = 0;
        this.currentPan.y = 0;
        this.applyTransform();
        return true;
    }

    /**
     * Centers the view at the specified coordinates
     * @param {number} centerX - X coordinate to center on
     * @param {number} centerY - Y coordinate to center on
     * @returns {boolean} True if centering was performed
     * @private
     */
    centerAt(centerX, centerY) {
        const rect = this.svgElement.getBoundingClientRect();
        this.currentPan.x = centerX - rect.left - (rect.width * this.currentZoom) / 2;
        this.currentPan.y = centerY - rect.top - (rect.height * this.currentZoom) / 2;
        this.applyTransform();
        return true;
    }

    /**
     * Applies the current zoom and pan transform to the SVG element
     * @private
     */
    applyTransform() {
        if (!this.svgElement) return;

        const transform = `translate(${this.currentPan.x}px, ${this.currentPan.y}px) scale(${this.currentZoom})`;
        this.svgElement.style.transform = transform;
        this.svgElement.style.transformOrigin = 'top left';
    }

    /**
     * Sets the zoom level
     * @param {number} zoom - Zoom level to set
     * @returns {boolean} True if zoom was set
     */
    setZoom(zoom) {
        if (!this.options.zoomEnabled) return false;

        const clampedZoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
        if (clampedZoom === this.currentZoom) return false;

        this.currentZoom = clampedZoom;
        this.applyTransform();
        return true;
    }

    /**
     * Sets the pan position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {boolean} True if pan was set
     */
    setPan(x, y) {
        if (!this.options.panEnabled) return false;

        this.currentPan.x = x;
        this.currentPan.y = y;
        this.applyTransform();
        return true;
    }

    /**
     * Enables zoom functionality
     */
    enableZoom() {
        this.options.zoomEnabled = true;
    }

    /**
     * Disables zoom functionality
     */
    disableZoom() {
        this.options.zoomEnabled = false;
    }

    /**
     * Enables pan functionality
     */
    enablePan() {
        this.options.panEnabled = true;
        this.updateCursor();
    }

    /**
     * Disables pan functionality
     */
    disablePan() {
        this.options.panEnabled = false;
        this.updateCursor();
    }

    /**
     * Resizes the pan-zoom instance (call after container size changes)
     * @returns {boolean} True if resize was performed
     */
    resize() {
        // For native implementation, we don't need to do anything special on resize
        // The CSS transforms will adapt automatically
        return true;
    }

    /**
     * Destroys the pan-zoom instance and cleans up event listeners
     */
    destroy() {
        // Remove event listeners
        if (this.svgElement) {
            this.svgElement.removeEventListener('wheel', this.handleWheel);
            this.svgElement.removeEventListener('mousedown', this.handleMouseDown);
            this.svgElement.removeEventListener('mousemove', this.handleMouseMove);
            this.svgElement.removeEventListener('mouseup', this.handleMouseUp);
            this.svgElement.removeEventListener('mouseleave', this.handleMouseUp);
            this.svgElement.removeEventListener('dblclick', this.handleDoubleClick);
            this.svgElement.removeEventListener('touchstart', this.handleTouchStart);
            this.svgElement.removeEventListener('touchmove', this.handleTouchMove);
            this.svgElement.removeEventListener('touchend', this.handleTouchEnd);

            // Remove reference from SVG element
            delete this.svgElement._panZoomManager;
        }

        this.svgElement = null;
    }

    /**
     * Checks if pan-zoom is properly initialized
     * @returns {boolean} True if initialized and functional
     */
    isInitialized() {
        return this.svgElement !== null;
    }

    /**
     * Gets the SVG element being controlled
     * @returns {SVGElement|null} The SVG element
     */
    getSvgElement() {
        return this.svgElement;
    }

    /**
     * Gets the underlying pan-zoom implementation (for compatibility)
     * @returns {PanZoom} This instance
     */
    getPanZoomInstance() {
        return this;
    }
}

// Default export for convenience
export default PanZoom;
