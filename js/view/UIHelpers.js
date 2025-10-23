/**
 * UI Helpers Module - Enterprise Diagram IDE
 * Provides reusable UI helper functions for the DiagramView.
 */

'use strict';

/**
 * Escapes HTML characters for safe display.
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Displays a notification message in the UI.
 * @param {string} message - Message to display
 * @param {string} [type='info'] - Notification type
 */
export function showNotification(message, type = 'info') {
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
 * Starts inline editing for a tree item.
 * @param {Object} view - DiagramView instance
 * @param {string} itemId - Item ID to edit
 */
export function startInlineEdit(view, itemId) {
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

    nameSpan.parentNode.replaceChild(input, nameSpan);
    input.focus();
    input.select();

    input.dataset.originalName = currentName;
    input.dataset.itemId = itemId;

    input.addEventListener('blur', (e) => {
        e.preventDefault();
        e.stopPropagation();
        finishInlineEdit(view, input, false);
    });

    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            finishInlineEdit(view, input, false);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finishInlineEdit(view, input, true);
        }
    });
}

/**
 * Finishes inline editing for a tree item.
 * @param {Object} view - DiagramView instance
 * @param {HTMLInputElement} input - The input element
 * @param {boolean} cancel - Whether to cancel the edit
 */
export function finishInlineEdit(view, input, cancel) {
    const itemId = input.dataset.itemId;
    const newName = cancel ? input.dataset.originalName : (input.value || '').trim();

    if (!input.parentNode || !input.parentNode.contains(input)) {
        return;
    }

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

    if (!cancel && newName && newName !== input.dataset.originalName) {
        try {
            window.diagramApp.controller.handleInlineRename(itemId, newName);
        } catch (error) {
            console.error('Rename failed:', error);
            span.textContent = input.dataset.originalName;
            showNotification('Failed to rename item', 'error');
        }
    }
}
