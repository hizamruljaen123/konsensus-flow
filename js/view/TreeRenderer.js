'use strict';

import { detectDiagramType } from '../utils/DiagramUtils.js';
import { escapeHtml } from './UIHelpers.js';

/**
 * Builds HTML for project tree display recursively.
 * @param {Object} files - Files collection
 * @param {string} itemId - Item ID to start from
 * @param {string|null} selectedItemId - Currently selected item ID
 * @returns {string} HTML string
 */
export function buildProjectTreeHtml(files, itemId = 'root', selectedItemId = null) {
    const item = files[itemId];
    if (!item) {
        return '';
    }

    const isSelected = selectedItemId === itemId;
    const isFolder = item.type === 'folder';
    const isExpanded = item.expanded !== false;
    const typeBadge = isFolder ? '' : getFileTypeBadge(item);

    let html = `
        <div class="tree-item ${isSelected ? 'selected' : ''} ${isFolder ? 'folder' : 'file'} ${!isExpanded ? 'collapsed' : ''}" data-id="${itemId}">
            ${isFolder ? `<span class="toggle">${isExpanded ? '▼' : '▶'}</span>` : ''}
            <div class="item-content">
                <i class="fas fa-${isFolder ? 'folder' : 'file'}"></i>
                <span class="name" ondblclick="window.diagramApp.view.startInlineEdit('${itemId}')">${escapeHtml(item.name)}</span>
                ${typeBadge}
            </div>
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
                <ul class="dropdown-menu">
                    ${isFolder ? getFolderActionsHtml() : getFileActionsHtml()}
                </ul>
            </div>
        </div>
    `;

    if (isFolder && isExpanded && Array.isArray(item.children)) {
        html += '<div class="children">';
        item.children.forEach(childId => {
            html += buildProjectTreeHtml(files, childId, selectedItemId);
        });
        html += '</div>';
    }

    return html;
}

function getFolderActionsHtml() {
    return `
        <li><a class="dropdown-item" href="#" data-action="new-file"><i class="fas fa-file-plus me-2"></i>New File</a></li>
        <li><a class="dropdown-item" href="#" data-action="new-folder"><i class="fas fa-folder-plus me-2"></i>New Folder</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item text-danger" href="#" data-action="delete"><i class="fas fa-trash me-2"></i>Delete</a></li>
    `;
}

function getFileActionsHtml() {
    return `
        <li><a class="dropdown-item" href="#" data-action="download-svg"><i class="fas fa-image me-2"></i>Download SVG</a></li>
        <li><a class="dropdown-item" href="#" data-action="download-png"><i class="fas fa-file-image me-2"></i>Download PNG</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item text-danger" href="#" data-action="delete"><i class="fas fa-trash me-2"></i>Delete</a></li>
    `;
}

function getFileTypeBadge(item) {
    const typeInfo = resolveFileTypeInfo(item);
    if (!typeInfo) {
        return '';
    }
    return `<span class="file-type-badge ${typeInfo.className}">${typeInfo.label}</span>`;
}

function resolveFileTypeInfo(item) {
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
