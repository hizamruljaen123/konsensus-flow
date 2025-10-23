'use strict';

/**
 * Attaches event listeners for the DiagramView UI components.
 * @param {Object} view - DiagramView instance
 */
export function attachEventListeners(view) {
    const { elements } = view;

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', () => view.toggleTheme());
    }

    if (elements.previewMode) {
        elements.previewMode.addEventListener('change', (e) => {
            view.previewMode = e.target.value;
            view.updatePreviewType();
            const currentFile = view.model ? view.model.getCurrentFile() : null;
            if (currentFile) {
                view.renderDiagram(currentFile.content);
            }
        });
    }

    if (elements.fullscreenBtn) {
        elements.fullscreenBtn.addEventListener('click', () => view.showFullscreenModal());
    }

    if (elements.zoomInBtn) {
        elements.zoomInBtn.addEventListener('click', () => view.zoomIn());
    }
    if (elements.zoomOutBtn) {
        elements.zoomOutBtn.addEventListener('click', () => view.zoomOut());
    }
    if (elements.zoomFitBtn) {
        elements.zoomFitBtn.addEventListener('click', () => view.zoomFit());
    }
    if (elements.zoomResetBtn) {
        elements.zoomResetBtn.addEventListener('click', () => view.zoomReset());
    }

    if (elements.clearErrorsBtn) {
        elements.clearErrorsBtn.addEventListener('click', () => view.clearErrors());
    }
    if (elements.toggleErrorPanel) {
        elements.toggleErrorPanel.addEventListener('click', () => view.toggleErrorPanel());
    }

    document.addEventListener('click', (e) => {
        const dropdownItem = e.target.closest('.dropdown-item');
        if (dropdownItem) {
            const action = dropdownItem.getAttribute('data-action');
            const treeItem = dropdownItem.closest('.tree-item');
            if (treeItem && action) {
                e.preventDefault();
                view.handleDropdownAction(action, treeItem.getAttribute('data-id'));
            }
        }
    });
}

/**
 * Attaches context menu interactions to the DiagramView.
 * @param {Object} view - DiagramView instance
 */
export function attachContextMenu(view) {
    const { elements } = view;

    document.addEventListener('click', (e) => {
        if (elements.contextMenu && !elements.contextMenu.contains(e.target)) {
            view.hideContextMenu();
        }
    });

    if (elements.projectTree) {
        elements.projectTree.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            view.showContextMenu(e.clientX, e.clientY, e.target);
        });
    }
}
