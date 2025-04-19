/**
 * Chat Widget with Ollama Integration
 * Uses the Cogito 3B model to provide AI assistance for the GenAI Canvas
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatButton = document.getElementById('chat-button');
    const chatContainer = document.getElementById('chat-container');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const statusIndicator = document.querySelector('.status-indicator');

    // Ollama API configuration
    const OLLAMA_API = 'http://localhost:3000/api';
    let MODEL = '';

    // Model selector
    const modelSelector = document.getElementById('model-selector');

    // Function to populate model dropdown
    async function populateModelDropdown() {
        try {
            const response = await fetch(`${OLLAMA_API}/tags`);

            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];

                // Clear the dropdown
                modelSelector.innerHTML = '';

                if (models.length === 0) {
                    // No models found
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No models available';
                    modelSelector.appendChild(option);
                    return;
                }

                // Sort models alphabetically
                models.sort((a, b) => a.name.localeCompare(b.name));

                // Add each model to the dropdown
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelector.appendChild(option);

                    // Set the first model as default if MODEL is empty
                    if (MODEL === '' && model === models[0]) {
                        MODEL = model.name;
                        option.selected = true;
                    }
                });

                // Trigger change event to update UI
                const event = new Event('change');
                modelSelector.dispatchEvent(event);
            } else {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
        } catch (error) {
            console.error('Error populating model dropdown:', error);
            // Add a default option
            modelSelector.innerHTML = '<option value="">Error loading models</option>';
        }
    }

    // Chat state
    let isChatOpen = false;
    let isOllamaAvailable = false;
    let isWaitingForResponse = false;

    // Initialize chat
    initChat();

    // Event listeners
    chatButton.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);
    sendButton.addEventListener('click', sendMessage);
    document.getElementById('clear-chat').addEventListener('click', clearChat);

    // Model selection event listener
    modelSelector.addEventListener('change', function() {
        MODEL = this.value;
        console.log(`Model changed to ${MODEL}`);
        // Check connection with the new model
        checkOllamaStatus();
    });

    document.getElementById('check-connection').addEventListener('click', () => {
        // Add a message to indicate checking connection
        addAIMessage("Checking connection to Ollama...");
        // Check connection
        checkOllamaStatus();
        // Add a visual feedback by rotating the button
        const button = document.getElementById('check-connection');
        button.style.transform = 'translateY(-50%) rotate(360deg)';
        setTimeout(() => {
            button.style.transform = 'translateY(-50%)';
        }, 1000);
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    /**
     * Clear the chat history
     */
    function clearChat() {
        // Clear all messages
        chatMessages.innerHTML = '';

        // Add a system message
        addAIMessage("Chat history cleared. How can I help you with your AI Canvas?");

        // Add visual feedback
        const button = document.getElementById('clear-chat');
        button.classList.add('active');
        setTimeout(() => {
            button.classList.remove('active');
        }, 300);
    }

    /**
     * Initialize the chat widget
     */
    async function initChat() {
        // First populate the model dropdown
        await populateModelDropdown();

        // Then check if Ollama is available
        await checkOllamaStatus();

        // Add welcome message
        setTimeout(() => {
            addAIMessage(`👋 Hi there! I'm your AI assistant powered by Ollama. I can help you improve your AI Canvas by providing suggestions and answering questions. What would you like help with today?`);
        }, 500);
    }

    /**
     * Toggle chat widget visibility
     */
    function toggleChat() {
        isChatOpen = !isChatOpen;
        chatContainer.style.display = isChatOpen ? 'flex' : 'none';

        if (isChatOpen) {
            chatInput.focus();
            // Check Ollama status when opening chat
            checkOllamaStatus();
        }
    }

    /**
     * Check if Ollama is available
     */
    async function checkOllamaStatus() {
        try {
            console.log(`Checking Ollama connection at ${OLLAMA_API}...`);

            const response = await fetch(`${OLLAMA_API}/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Ollama models:', data.models.map(m => m.name));

                const hasSelectedModel = data.models.some(model => model.name === MODEL);
                console.log(`Has ${MODEL} model:`, hasSelectedModel);

                if (hasSelectedModel) {
                    isOllamaAvailable = true;
                    statusIndicator.classList.remove('offline');
                    // Update the model selector to show it's connected
                    modelSelector.style.borderColor = '#4cc9f0';
                    console.log('Ollama connection successful');
                } else {
                    throw new Error(`Model '${MODEL}' not found. Please run: ollama pull ${MODEL}`);
                }
            } else {
                console.error(`Ollama API check failed with status: ${response.status}`);
                throw new Error(`Ollama service responded with status ${response.status}`);
            }
        } catch (error) {
            console.error('Ollama connection error:', error);
            isOllamaAvailable = false;
            statusIndicator.classList.add('offline');
            // Reset the model selector to show it's offline
            modelSelector.style.borderColor = '#f72585';

            // Add error message if chat is open and no messages yet
            if (isChatOpen && chatMessages.children.length <= 1) {
                addAIMessage(`⚠️ I couldn't connect to Ollama. Please make sure:
1. The proxy server is running: node js/proxy-server.js
2. Ollama is installed and running: ollama serve
3. You have at least one model installed (run: ollama pull ${MODEL || 'cogito:3b'})`);
            }
        }
    }

    /**
     * Send a message to the AI
     */
    async function sendMessage() {
        const message = chatInput.value.trim();

        if (!message || isWaitingForResponse) return;

        // Add user message to chat
        addUserMessage(message);

        // Clear input
        chatInput.value = '';

        // Check if Ollama is available
        if (!isOllamaAvailable) {
            addAIMessage("⚠️ I can't process your request because Ollama is not available. Please check your connection and try again.");
            checkOllamaStatus();
            return;
        }

        // Show thinking indicator
        const thinkingId = showThinking();
        isWaitingForResponse = true;

        try {
            // Get canvas data for context
            const canvasData = getCanvasData();

            // Format canvas data as context
            const context = formatCanvasContext(canvasData);

            // Prepare prompt with context
            const prompt = `
You are an AI assistant helping a user with their AI Canvas.
The canvas is a tool for planning and analyzing both traditional and generative AI projects.

Here's the current state of the user's canvas:
${context}

Based on this information, please provide helpful, constructive feedback and suggestions.
Focus on helping the user improve their canvas entries and think more deeply about their AI project.

User message: ${message}
`;

            // Send request to Ollama
            console.log("Sending explanation request to Ollama...");
            const response = await fetch(`${OLLAMA_API}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7
                    }
                })
            });

            console.log('Ollama response status:', response.status);

            if (!response.ok) {
                throw new Error('Failed to get response from Ollama');
            }

            const data = await response.json();

            // Remove thinking indicator
            removeThinking(thinkingId);

            // Add AI response to chat
            addAIMessage(data.response);

        } catch (error) {
            console.error('Error getting AI response:', error);

            // Remove thinking indicator
            removeThinking(thinkingId);

            // Add detailed error message
            if (error.message.includes('Failed to fetch')) {
                addAIMessage(`Error: Could not connect to the AI service. Please ensure the proxy server is running:\n\nnode js/proxy-server.js`);
                isOllamaAvailable = false;
                // Re-check connection
                checkOllamaStatus();
            } else {
                addAIMessage(`Sorry, I encountered an error while processing your request: ${error.message}. Please try again later.`);
            }
        } finally {
            isWaitingForResponse = false;
        }
    }

    /**
     * Add a user message to the chat
     */
    function addUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.textContent = text;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    /**
     * Add an AI message to the chat
     */
    function addAIMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message ai-message';
        messageElement.innerHTML = formatMessage(text);
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    /**
     * Show thinking indicator
     * @returns {string} ID of the thinking element
     */
    function showThinking() {
        const id = 'thinking-' + Date.now();
        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'message thinking';
        thinkingElement.id = id;

        // Add dots
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            thinkingElement.appendChild(dot);
        }

        chatMessages.appendChild(thinkingElement);
        scrollToBottom();
        return id;
    }

    /**
     * Remove thinking indicator
     */
    function removeThinking(id) {
        const thinkingElement = document.getElementById(id);
        if (thinkingElement) {
            thinkingElement.remove();
        }
    }

    /**
     * Format message with markdown-like syntax
     */
    function formatMessage(text) {
        // Convert line breaks to <br>
        text = text.replace(/\n/g, '<br>');

        // Bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic text
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code blocks
        text = text.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');

        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Lists
        text = text.replace(/^\d+\.\s+(.*?)(?=<br>|$)/gm, '<li>$1</li>');
        text = text.replace(/^-\s+(.*?)(?=<br>|$)/gm, '<li>$1</li>');

        // Replace consecutive list items with a list
        text = text.replace(/(<li>.*?<\/li>)+/g, (match) => {
            return '<ul class="chat-list">' + match + '</ul>';
        });

        // Headings
        text = text.replace(/^###\s+(.*?)(?=<br>|$)/gm, '<h4>$1</h4>');
        text = text.replace(/^##\s+(.*?)(?=<br>|$)/gm, '<h3>$1</h3>');
        text = text.replace(/^#\s+(.*?)(?=<br>|$)/gm, '<h2>$1</h2>');

        return text;
    }

    /**
     * Scroll chat to bottom
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Get all canvas data
     */
    function getCanvasData() {
        const canvasData = {};

        document.querySelectorAll('.section').forEach(section => {
            const sectionId = section.id;
            canvasData[sectionId] = {};

            // Get textarea values
            section.querySelectorAll('textarea').forEach(element => {
                canvasData[sectionId]['textarea'] = element.value;
            });
        });

        return canvasData;
    }

    /**
     * Format canvas data as context for the AI
     */
    function formatCanvasContext(canvasData) {
        let context = '';

        // Map section IDs to readable names
        const sectionNames = {
            'task-type': 'Task Type',
            'human-judgment': 'Human Judgment & Oversight',
            'action': 'Action',
            'outcome': 'Outcome',
            'input-data': 'Input Data / Prompts / Features',
            'training-data': 'Training/Fine-tuning Data',
            'feedback-loop': 'Feedback Loop',
            'value-proposition': 'Value Proposition',
            'risks-responsible-ai': 'Risks & Responsible AI',
            'model-selection': 'Model Selection & Prompt Engineering',
            'content-moderation': 'Content Moderation & Quality Control',
            'transparency-ux': 'Transparency & User Experience'
        };

        // Format each section
        Object.entries(canvasData).forEach(([sectionId, data]) => {
            const sectionName = sectionNames[sectionId] || sectionId;
            context += `## ${sectionName}\n`;

            // Add textarea content
            if (data.textarea) {
                context += `${data.textarea}\n`;
            } else {
                context += `[Empty]\n`;
            }

            // No additional data for data-training section anymore

            context += '\n';
        });

        return context;
    }
});
