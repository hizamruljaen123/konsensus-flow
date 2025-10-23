'use strict';

import { showNotification } from './UIHelpers.js';

export class ErrorPanelManager {
    constructor(elements, view) {
        this.elements = elements;
        this.view = view;
    }

    addError(error) {
        if (!this.elements.errorMessages) {
            return;
        }

        const placeholder = this.elements.errorMessages.querySelector('.error-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message error';
        errorElement.innerHTML = `
            <div class="error-content">
                <strong>${error.message}</strong>
            </div>
            <div class="error-actions">
                <button class="btn btn-sm btn-outline-primary ai-repair-error-btn">
                    <i class="fas fa-robot me-1"></i>AI Repair
                </button>
                <button class="btn btn-sm btn-outline-secondary retry-error-btn">
                    <i class="fas fa-redo me-1"></i>Retry
                </button>
            </div>
        `;

        const aiRepairBtn = errorElement.querySelector('.ai-repair-error-btn');
        const retryBtn = errorElement.querySelector('.retry-error-btn');

        if (aiRepairBtn) {
            aiRepairBtn.addEventListener('click', () => {
                this.view.requestAIRepair();
            });
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                const currentCode = this.view.getCurrentDiagramContent();
                if (currentCode) {
                    this.view.renderDiagram(currentCode);
                }
            });
        }

        this.elements.errorMessages.appendChild(errorElement);
        this.updateErrorCount();
        this.showErrorPanel();
    }

    clearErrors() {
        if (!this.elements.errorMessages) {
            return;
        }

        this.elements.errorMessages.innerHTML = '';

        const placeholder = document.createElement('div');
        placeholder.className = 'error-placeholder text-muted text-center p-3';
        placeholder.innerHTML = `
            <i class="fas fa-check-circle fa-2x mb-2"></i>
            <p class="mb-0">No errors detected</p>
        `;
        this.elements.errorMessages.appendChild(placeholder);

        this.updateErrorCount();
    }

    updateErrorCount() {
        if (!this.elements.errorCount) {
            return;
        }

        const errorCount = this.elements.errorMessages.querySelectorAll('.error-message').length;
        if (errorCount > 0) {
            this.elements.errorCount.textContent = errorCount;
            this.elements.errorCount.style.display = 'inline';
        } else {
            this.elements.errorCount.style.display = 'none';
        }
    }

    toggleErrorPanel() {
        if (!this.elements.errorPanel) {
            return;
        }

        const isCollapsed = this.elements.errorPanel.classList.contains('collapsed');
        if (isCollapsed) {
            this.showErrorPanel();
        } else {
            this.hideErrorPanel();
        }
    }

    showErrorPanel() {
        if (!this.elements.errorPanel) {
            return;
        }

        this.elements.errorPanel.classList.remove('collapsed');
        this.elements.errorPanel.style.display = 'flex';

        if (this.elements.toggleErrorPanel) {
            const icon = this.elements.toggleErrorPanel.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-chevron-up';
            }
            this.elements.toggleErrorPanel.title = 'Collapse Panel';
        }
    }

    hideErrorPanel() {
        if (!this.elements.errorPanel) {
            return;
        }

        this.elements.errorPanel.classList.add('collapsed');

        if (this.elements.toggleErrorPanel) {
            const icon = this.elements.toggleErrorPanel.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-chevron-down';
            }
            this.elements.toggleErrorPanel.title = 'Expand Panel';
        }
    }
}
