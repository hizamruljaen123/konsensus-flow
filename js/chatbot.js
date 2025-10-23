// Chatbot module for Konsensus Flow
import CONFIG from './config.js';

class Chatbot {
    constructor() {
        this.messages = [];
        this.isOpen = false;

        // Configure marked for better code highlighting
        this.configureMarked();

        this.init();
    }

    configureMarked() {
        // Configure marked options for better rendering
        window.marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false,
            highlight: function(code, lang) {
                // Use highlight.js for syntax highlighting
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {
                        console.warn('Highlight.js error:', err);
                    }
                }
                return hljs.highlightAuto(code).value;
            }
        });
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        const togglePanelBtn = document.getElementById('toggle-chatbot-panel');
        const fullscreenBtn = document.getElementById('expand-chatbot-fullscreen');
        const fullscreenSendBtn = document.getElementById('chatbot-fullscreen-send');
        const fullscreenInput = document.getElementById('chatbot-fullscreen-input');
        const fullscreenModal = document.getElementById('chatbotFullscreenModal');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        if (togglePanelBtn) {
            togglePanelBtn.addEventListener('click', () => this.togglePanel());
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.openFullscreen());
        }

        if (fullscreenSendBtn) {
            fullscreenSendBtn.addEventListener('click', () => this.sendMessage(true));
        }

        if (fullscreenInput) {
            fullscreenInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage(true);
                }
            });
        }

        if (fullscreenModal) {
            fullscreenModal.addEventListener('shown.bs.modal', () => this.syncMessagesToFullscreen());
            fullscreenModal.addEventListener('hidden.bs.modal', () => this.syncMessagesFromFullscreen());
        }
    }


    togglePanel() {
        const panel = document.getElementById('chatbot-panel');
        const icon = document.querySelector('#toggle-chatbot-panel i');

        if (panel) {
            panel.classList.toggle('collapsed');
            const isCollapsed = panel.classList.contains('collapsed');
            icon.className = isCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    }

    openFullscreen() {
        const modal = new bootstrap.Modal(document.getElementById('chatbotFullscreenModal'));
        modal.show();
    }

    syncMessagesToFullscreen() {
        const panelMessages = document.getElementById('chatbot-messages');
        const fullscreenMessages = document.getElementById('chatbot-fullscreen-messages');

        if (panelMessages && fullscreenMessages) {
            fullscreenMessages.innerHTML = panelMessages.innerHTML;
            fullscreenMessages.scrollTop = fullscreenMessages.scrollHeight;
        }
    }

    syncMessagesFromFullscreen() {
        const panelMessages = document.getElementById('chatbot-messages');
        const fullscreenMessages = document.getElementById('chatbot-fullscreen-messages');

        if (panelMessages && fullscreenMessages) {
            panelMessages.innerHTML = fullscreenMessages.innerHTML;
            panelMessages.scrollTop = panelMessages.scrollHeight;
        }
    }

    async sendMessage(isFullscreen = false) {
        const input = isFullscreen
            ? document.getElementById('chatbot-fullscreen-input')
            : document.getElementById('chatbot-input');
        const message = input.value.trim();

        if (!message) return;

        this.addMessage('user', message, isFullscreen);
        input.value = '';

        // Show typing indicator
        this.showTyping(isFullscreen);

        try {
            const response = await this.callGeminiAPI(message);
            this.hideTyping(isFullscreen);
            this.addMessage('bot', response, isFullscreen);

            // Process code insertion only for non-fullscreen mode
            if (!isFullscreen) {
                this.processCodeInResponse(response);
            }
        } catch (error) {
            this.hideTyping(isFullscreen);
            this.addMessage('bot', 'Sorry, I encountered an error. Please try again.', isFullscreen);
            console.error('Chatbot error:', error);
        }
    }

    async callGeminiAPI(message) {
        const endpoint = `${CONFIG.GEMINI_BASE_URL.replace(/\/$/, '')}/models/${CONFIG.GEMINI_MODEL}:generateContent`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': CONFIG.GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: message
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        if (!candidate || !candidate.content || !Array.isArray(candidate.content.parts)) {
            throw new Error('Invalid response from Gemini API');
        }

        const text = candidate.content.parts
            .map((part) => part.text || '')
            .join('\n')
            .trim();

        return text || 'No response generated by Gemini.';
    }

    addMessage(type, content, isFullscreen = false) {
        const messagesContainer = isFullscreen
            ? document.getElementById('chatbot-fullscreen-messages')
            : document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${type}`;

        if (type === 'bot') {
            // Render Markdown for bot messages (syntax highlighting handled by marked)
            messageDiv.innerHTML = window.marked.parse(content);

            // Add language labels to code blocks
            setTimeout(() => {
                messageDiv.querySelectorAll('pre code').forEach((block) => {
                    // Extract language from class (added by marked/highlight.js)
                    const classes = block.className.split(' ');
                    let language = 'text'; // default
                    for (const cls of classes) {
                        if (cls.startsWith('language-')) {
                            language = cls.replace('language-', '');
                            break;
                        } else if (cls.startsWith('hljs')) {
                            // If no specific language, it might be auto-detected
                            language = 'auto';
                            break;
                        }
                    }

                    // Set data-language for CSS styling
                    block.parentElement.setAttribute('data-language', language);
                });
            }, 0);
        } else {
            // Use plain text for user messages
            messageDiv.textContent = content;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTyping(isFullscreen = false) {
        const messagesContainer = isFullscreen
            ? document.getElementById('chatbot-fullscreen-messages')
            : document.getElementById('chatbot-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chatbot-message bot typing';
        typingDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i>Thinking...';
        typingDiv.id = isFullscreen ? 'typing-indicator-fullscreen' : 'typing-indicator';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping(isFullscreen = false) {
        const typingIndicator = document.getElementById(isFullscreen ? 'typing-indicator-fullscreen' : 'typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    processCodeInResponse(response) {
        // Extract code blocks from the response (between ```)
        const codeBlocks = response.match(/```[\s\S]*?```/g);

        if (codeBlocks && codeBlocks.length > 0) {
            // Take the first code block and extract the content
            const codeBlock = codeBlocks[0];
            const code = codeBlock.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '');

            // Insert into the code editor
            this.insertCodeIntoEditor(code);
        }
    }

    insertCodeIntoEditor(code) {
        // Get the Ace editor instance from the view
        const editor = window.diagramApp ? window.diagramApp.view.editor : null;
        if (editor) {
            // Replace entire content with new code
            editor.setValue(code, -1);
        } else {
            console.warn('Ace editor not found');
        }
    }
}

// Export for use in app.js
export default Chatbot;
