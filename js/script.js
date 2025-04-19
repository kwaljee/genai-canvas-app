document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const analyzeButton = document.getElementById('analyze-button');
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const exportButton = document.getElementById('export-button');
    const analysisResultsDiv = document.getElementById('analysis-results');

    // Store previous analysis results for comparison
    let previousAnalysisScores = {};

    // Store current analysis scores
    let currentAnalysisScores = {};

    // Initialize cards with 0% scores
    function initializeScores() {
        // First, remove any existing score indicators to prevent duplicates
        document.querySelectorAll('.score-container').forEach(el => el.remove());
        document.querySelectorAll('.section-score').forEach(el => el.remove());

        document.querySelectorAll('.section').forEach(section => {
            const heading = section.querySelector('h2');
            if (heading) {
                // Double-check that there are no existing score containers
                const existingScores = heading.querySelectorAll('.score-container, .section-score');
                if (existingScores.length > 0) {
                    existingScores.forEach(el => el.remove());
                }

                // Create score indicator with label
                const scoreElement = document.createElement('div');
                scoreElement.className = 'score-container';

                // Add label
                const scoreLabel = document.createElement('span');
                scoreLabel.className = 'score-title';
                scoreLabel.textContent = 'Quality Score';

                // Add score value
                const scoreValue = document.createElement('span');
                scoreValue.className = 'section-score low';
                scoreValue.textContent = '0%';

                // Add to container
                scoreElement.appendChild(scoreLabel);
                scoreElement.appendChild(scoreValue);

                // Add to heading
                heading.appendChild(scoreElement);
            }
        });
    }

    // Call initialization on page load
    initializeScores();

    // Sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    // Check if sidebar state is stored in localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }

    // Toggle sidebar when button is clicked
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        // Update toggle button text
        sidebarToggle.innerHTML = sidebar.classList.contains('collapsed') ? '&gt;' : '&times;';
        // Store sidebar state in localStorage
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Set initial toggle button text based on sidebar state
    sidebarToggle.innerHTML = sidebar.classList.contains('collapsed') ? '&gt;' : '&times;';

    // Event Listeners
    analyzeButton.addEventListener('click', analyzeCanvas);
    saveButton.addEventListener('click', saveCanvas);
    loadButton.addEventListener('click', loadCanvas);
    exportButton.addEventListener('click', exportCanvasToPDF);

    // Get notification element
    const notificationDiv = document.getElementById('notification');

    // Show notification instead of using alert
    const showNotification = (message, isError = false) => {
        // Update notification
        notificationDiv.textContent = message;
        notificationDiv.className = `notification ${isError ? 'error' : 'success'} show`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notificationDiv.className = 'notification';
        }, 3000);
    };

    // Analyze canvas functionality
    async function analyzeCanvas() {
        try {
            // Show loading state
            analysisResultsDiv.innerHTML = '<h3>Canvas Analysis</h3><div class="loading-spinner"><div></div><div></div><div></div></div><p>Generating AI recommendations...</p>';
            analysisResultsDiv.style.display = 'block';
            analysisResultsDiv.scrollIntoView({ behavior: 'smooth' });

            // Get all data from the canvas
            const canvasData = getCanvasData();

            // We'll just check for non-empty sections

            // Check if there are any non-empty sections
            const nonEmptySections = Object.entries(canvasData)
                .filter(([_, data]) => data.textarea && data.textarea.trim() !== '');

            if (nonEmptySections.length === 0) {
                // If all sections are empty, show a message
                analysisResultsDiv.innerHTML = '<h3>Canvas Analysis</h3><p class="warning">⚠️ All sections are empty. Please fill in at least one section before analyzing.</p>';
                return;
            }

            // Format canvas data for the LLM
            const formattedData = formatCanvasForLLM(canvasData);

            // Generate analysis using LLM
            try {
                const analysisResponse = await getLLMAnalysis(formattedData);

                // Display the analysis with a simple header
                let analysisHTML = '<h3>Recommendations</h3>';

                // We'll skip displaying empty sections warning in the analysis section
                // since we're focusing only on overall recommendations

                // Process and display LLM recommendations
                analysisHTML += '<div class="ai-recommendations">';

                // Parse and format the LLM response
                const formattedResponse = formatLLMResponse(analysisResponse);
                analysisHTML += formattedResponse;

                analysisHTML += '</div>';

                // Display the analysis
                analysisResultsDiv.innerHTML = analysisHTML;

                // Display scores on section cards
                displayScoresOnCards();

                // Scroll to analysis results
                analysisResultsDiv.scrollIntoView({ behavior: 'smooth' });
            } catch (llmError) {
                console.error('LLM analysis error:', llmError);

                // Clear any existing scores
                currentAnalysisScores = {};
                document.querySelectorAll('.score-container').forEach(el => el.remove());

                // Reinitialize with 0% scores
                initializeScores();

                // Fallback to basic analysis if LLM fails
                let analysisHTML = '<h3>Recommendations</h3><p class="warning">⚠️ Could not generate AI recommendations.</p>';

                // Skip displaying empty sections warning

                // Basic checks
                if (canvasData['value-proposition']?.textarea) {
                    analysisHTML += '<p>✅ Value proposition is defined</p>';
                } else {
                    analysisHTML += '<p class="warning">⚠️ Value proposition is not clearly defined</p>';
                }

                if (canvasData['problem']?.textarea) {
                    analysisHTML += '<p>✅ Problem statement is defined</p>';
                } else {
                    analysisHTML += '<p class="warning">⚠️ Problem statement is missing</p>';
                }

                if (canvasData['ethical-considerations']?.textarea) {
                    analysisHTML += '<p>✅ Ethical considerations are addressed</p>';
                } else {
                    analysisHTML += '<p class="warning">⚠️ Ethical considerations are not addressed</p>';
                }

                analysisResultsDiv.innerHTML = analysisHTML;
            }
        } catch (error) {
            console.error('Analysis error:', error);
            showNotification('Error analyzing canvas: ' + error.message, true);
            analysisResultsDiv.innerHTML = '<h3>Recommendations</h3><p class="warning">Error analyzing canvas. Please try again.</p>';

            // Clear any existing scores
            currentAnalysisScores = {};
            document.querySelectorAll('.score-container').forEach(el => el.remove());

            // Reinitialize with 0% scores
            initializeScores();
        }
    }

    /**
     * Format canvas data for LLM analysis
     */
    function formatCanvasForLLM(canvasData) {
        let formattedData = '';

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
            formattedData += `## ${sectionName}\n`;

            // Add textarea content
            if (data.textarea && data.textarea.trim() !== '') {
                formattedData += `${data.textarea}\n`;
            } else {
                formattedData += `[EMPTY SECTION - NO CONTENT]\n`;
            }

            // No additional data for data-training section anymore

            formattedData += '\n';
        });

        return formattedData;
    }

    /**
     * Display scores on section cards
     */
    function displayScoresOnCards() {
        // First, remove any existing score indicators
        document.querySelectorAll('.score-container').forEach(el => el.remove());
        // Also remove any standalone section-score elements that might have been added
        document.querySelectorAll('.section-score').forEach(el => el.remove());

        // Map section names to their IDs
        const sectionNameToId = {
            'Task Type': 'task-type',
            'Human Judgment & Oversight': 'human-judgment',
            'Action': 'action',
            'Outcome': 'outcome',
            'Input Data / Prompts / Features': 'input-data',
            'Training/Fine-tuning Data': 'training-data',
            'Feedback Loop': 'feedback-loop',
            'Value Proposition': 'value-proposition',
            'Risks & Responsible AI': 'risks-responsible-ai',
            'Model Selection & Prompt Engineering': 'model-selection',
            'Content Moderation & Quality Control': 'content-moderation',
            'Transparency & User Experience': 'transparency-ux'
        };

        // Add score indicators to each section
        Object.entries(currentAnalysisScores).forEach(([sectionName, score]) => {
            // Find the section ID
            const sectionId = sectionNameToId[sectionName];
            if (!sectionId) return;

            // Find the section heading
            const heading = document.querySelector(`#${sectionId} h2`);
            if (!heading) return;

            // Double-check that there are no existing score containers
            const existingScores = heading.querySelectorAll('.score-container, .section-score');
            if (existingScores.length > 0) {
                existingScores.forEach(el => el.remove());
            }

            // Determine score class
            let scoreClass = 'low';
            if (score >= 70) {
                scoreClass = 'high';
            } else if (score >= 40) {
                scoreClass = 'medium';
            }

            // Create score indicator with label
            const scoreElement = document.createElement('div');
            scoreElement.className = 'score-container';

            // Add label
            const scoreLabel = document.createElement('span');
            scoreLabel.className = 'score-title';
            scoreLabel.textContent = 'Quality Score';

            // Add score value
            const scoreValue = document.createElement('span');
            scoreValue.className = `section-score ${scoreClass}`;
            scoreValue.textContent = `${score}%`;

            // Add to container
            scoreElement.appendChild(scoreLabel);
            scoreElement.appendChild(scoreValue);

            // Add to heading
            heading.appendChild(scoreElement);
        });

        // Update sections without specific scores to show 0%
        document.querySelectorAll('.section').forEach(section => {
            const heading = section.querySelector('h2');
            // Make sure there's no score element already
            if (!heading.querySelector('.score-container') && !heading.querySelector('.section-score')) {
                // Create score indicator with label
                const scoreElement = document.createElement('div');
                scoreElement.className = 'score-container';

                // Add label
                const scoreLabel = document.createElement('span');
                scoreLabel.className = 'score-title';
                scoreLabel.textContent = 'Quality Score';

                // Add score value
                const scoreValue = document.createElement('span');
                scoreValue.className = 'section-score low';
                scoreValue.textContent = '0%';

                // Add to container
                scoreElement.appendChild(scoreLabel);
                scoreElement.appendChild(scoreValue);

                // Add to heading
                heading.appendChild(scoreElement);
            }
        });
    }

    /**
     * Format the LLM response into HTML with quality scores and recommendations
     */
    function formatLLMResponse(response) {
        let html = '';

        // Create a new object to store the current scores
        const currentScores = {};

        // Split the response into main sections
        const mainSections = response.split(/\s*#\s+/);

        // Process quality scores - we'll extract them but not display in the analysis section
        const qualityScoreSection = mainSections.find(section =>
            section.trim().startsWith('QUALITY SCORES') ||
            section.trim().startsWith('Quality Scores'));

        if (qualityScoreSection) {
            // We'll extract scores but not display them in the analysis section
            // They will be shown on the cards instead

            // Extract scores using regex - with multiple patterns to handle different formats
            // This makes our parsing more robust to slight variations in LLM output
            const scorePatterns = [
                /-\s*(.*?):\s*(\d+)%/g,  // Markdown list format: - Section: 80%
                /([^\n:]+):\s*(\d+)%/g,  // Simple format: Section: 80%
                /([^\n:]+)\s*-\s*(\d+)%/g // Alternative format: Section - 80%
            ];

            let foundScores = false;
            let match;

            // Try each pattern until we find scores
            for (const pattern of scorePatterns) {
                const regex = new RegExp(pattern);
                let text = qualityScoreSection;

                // Reset the lastIndex to start from the beginning
                regex.lastIndex = 0;

                while ((match = regex.exec(text)) !== null) {
                    foundScores = true;
                    const section = match[1].trim();
                    const score = parseInt(match[2]);

                    // Store the current score in both local and global variables
                    currentScores[section] = score;
                    currentAnalysisScores[section] = score;

                    // Determine score class for the card display (handled in displayScoresOnCards)
                    // Check for score changes for logging
                    if (previousAnalysisScores[section] !== undefined) {
                        const prevScore = previousAnalysisScores[section];
                        const difference = score - prevScore;

                        if (difference > 0) {
                            console.log(`${section} improved by ${difference}%`);
                        } else if (difference < 0) {
                            console.log(`${section} decreased by ${Math.abs(difference)}%`);
                        }
                    }

                    // We'll skip creating the score bar HTML since we're displaying scores on cards
                    // Just log for debugging
                    console.log(`Score for ${section}: ${score}%`);
                }

                // If we found scores with this pattern, no need to try others
                if (foundScores) break;
            }

            // If no scores were found with any pattern
            if (!foundScores) {
                console.warn('No scores found in the LLM response. This might be due to formatting issues.');
                console.log('Raw response:', qualityScoreSection);

                // Make sure we don't have any leftover HTML from score processing
                html = '';
            }
        }

        // We'll skip displaying section recommendations in the analysis section
        // since they're more relevant to individual sections
        // Just extract them for reference
        const sectionRecommendationsSection = mainSections.find(section =>
            section.trim().startsWith('SECTION RECOMMENDATIONS') ||
            section.trim().startsWith('Section Recommendations'));

        if (sectionRecommendationsSection) {
            // Just log them for debugging
            console.log('Section recommendations found:', sectionRecommendationsSection);

            // We'll skip displaying these recommendations
            // Just extract them for potential future use
        }

        // Process overall recommendations - this will be the main content of our analysis section
        const overallRecommendationsSection = mainSections.find(section =>
            section.trim().startsWith('OVERALL RECOMMENDATIONS') ||
            section.trim().startsWith('Overall Recommendations'));

        if (overallRecommendationsSection) {
            html += '<div class="overall-recommendations">';

            // Extract numbered recommendations
            const recommendations = overallRecommendationsSection.match(/\d+\.\s*([^\n]+)/g);

            if (recommendations && recommendations.length > 0) {
                html += '<ol>';
                recommendations.forEach(rec => {
                    // Remove the number and period
                    const cleanRec = rec.replace(/^\d+\.\s*/, '');
                    html += `<li>${cleanRec}</li>`;
                });
                html += '</ol>';
            } else {
                // If we couldn't extract numbered recommendations, just use the whole section
                const content = overallRecommendationsSection.replace(/^OVERALL RECOMMENDATIONS\s*/i, '').trim();
                html += `<p>${content.replace(/\n/g, '<br>')}</p>`;
            }

            html += '</div>';
        }

        // If we couldn't parse the response properly, show a helpful message
        if (html === '') {
            html = '<h3>Recommendations</h3><p>No specific recommendations could be generated. Please add more content to your canvas sections and try again.</p>';
        }

        // Update the previous scores for next comparison
        if (Object.keys(currentScores).length > 0) {
            previousAnalysisScores = {...currentScores};
        }

        return html;
    }

    /**
     * Get LLM analysis of canvas data
     */
    async function getLLMAnalysis(formattedData) {
        // Ollama API configuration
        const OLLAMA_API = 'http://localhost:3000/api';
        const MODEL = 'cogito:3b';

        // Create prompt for analysis
        const prompt = `
You are an AI assistant analyzing an AI Canvas. The canvas is a tool for planning and analyzing both traditional and generative AI projects.

Here's the current state of the canvas:
${formattedData}

Provide the following in your response, using EXACTLY this format:

# QUALITY SCORES

IMPORTANT: ONLY include scores for sections that have actual content. DO NOT score empty sections or sections marked as [EMPTY SECTION - NO CONTENT].

For each non-empty section, provide a score using EXACTLY this format:
- Section Name: X%

Example:
- Value Proposition: 75%
- Problem: 60%

Rate each from 0-100% based on completeness, specificity, and quality.

# SECTION RECOMMENDATIONS

IMPORTANT: ONLY provide recommendations for sections that have actual content. DO NOT recommend improvements for empty sections.

Choose up to 3 non-empty sections that need the most improvement and would have the biggest impact if improved. For each section:

## [Section Name]
[Specific recommendation for improving this section, referencing the actual content]

If fewer than 3 sections have content, only provide recommendations for those that do.

# OVERALL RECOMMENDATIONS

Provide 1-3 general recommendations for improving the canvas as a whole, based ONLY on the sections that have content. If very few sections have content, focus on suggesting which empty sections should be filled in first and why.

1. [First overall recommendation]
2. [Second overall recommendation]
3. [Third overall recommendation]

Make your recommendations specific, actionable, and concise. Focus on how to improve the quality and completeness of the canvas.
`;

        // Send request to Ollama
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
                    temperature: 0.1
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from Ollama');
        }

        const data = await response.json();
        return data.response || 'No recommendations available.';
    }

    // Get all canvas data
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

    // Save canvas data
    function saveCanvas() {
        try {
            const canvasData = getCanvasData();

            // Add scores to the canvas data
            const canvasDataWithScores = {
                sections: canvasData,
                scores: currentAnalysisScores,
                lastUpdated: new Date().toISOString()
            };

            // Save to local storage
            localStorage.setItem('generativeAICanvasData', JSON.stringify(canvasDataWithScores));

            // Create a downloadable JSON file
            const dataStr = JSON.stringify(canvasDataWithScores, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            // Show notification for local storage save
            showNotification('Canvas saved to browser storage.');

            // Create a download link for the JSON file
            const exportFileDefaultName = 'genai-canvas-' + new Date().toISOString().slice(0, 10) + '.json';

            // Ask user if they want to download the file
            if (confirm('Canvas saved to browser storage. Do you want to download a JSON file backup?')) {
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.style.display = 'none';
                document.body.appendChild(linkElement);
                linkElement.click();
                document.body.removeChild(linkElement);

                // Show notification for file download
                showNotification('JSON file downloaded successfully!');
            }
        } catch (error) {
            console.error('Save error:', error);
            showNotification('Error saving canvas: ' + error.message, true);
        }
    }

    // Load canvas data
    function loadCanvas() {
        try {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            // Show options dialog
            const loadOption = confirm('Load from:\n\n- Click OK to load from a JSON file\n- Click Cancel to load from browser storage');

            if (loadOption) {
                // Load from file
                fileInput.onchange = function(event) {
                    const file = event.target.files[0];
                    if (!file) {
                        document.body.removeChild(fileInput);
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const loadedData = JSON.parse(e.target.result);

                            // Handle both old format (just canvasData) and new format (with scores)
                            if (loadedData.sections) {
                                // New format with scores
                                populateCanvasFromData(loadedData.sections);

                                // Load scores if available
                                if (loadedData.scores) {
                                    currentAnalysisScores = loadedData.scores;
                                    displayScoresOnCards();
                                }

                                showNotification('Canvas loaded successfully from file with scores!');
                            } else {
                                // Old format (just canvasData)
                                populateCanvasFromData(loadedData);
                                showNotification('Canvas loaded successfully from file!');
                            }
                        } catch (parseError) {
                            console.error('JSON parse error:', parseError);
                            showNotification('Error parsing JSON file: ' + parseError.message, true);
                        }
                        document.body.removeChild(fileInput);
                    };

                    reader.onerror = function() {
                        showNotification('Error reading file', true);
                        document.body.removeChild(fileInput);
                    };

                    reader.readAsText(file);
                };

                fileInput.click();
            } else {
                // Load from local storage
                const savedData = localStorage.getItem('generativeAICanvasData');

                if (savedData) {
                    const loadedData = JSON.parse(savedData);

                    // Handle both old format (just canvasData) and new format (with scores)
                    if (loadedData.sections) {
                        // New format with scores
                        populateCanvasFromData(loadedData.sections);

                        // Load scores if available
                        if (loadedData.scores) {
                            currentAnalysisScores = loadedData.scores;
                            displayScoresOnCards();
                        }

                        showNotification('Canvas loaded successfully from browser storage with scores!');
                    } else {
                        // Old format (just canvasData)
                        populateCanvasFromData(loadedData);
                        showNotification('Canvas loaded successfully from browser storage!');
                    }
                } else {
                    showNotification('No saved canvas data found in browser storage.', true);
                }

                document.body.removeChild(fileInput);
            }
        } catch (error) {
            console.error('Load error:', error);
            showNotification('Error loading canvas: ' + error.message, true);
        }
    }

    // Helper function to populate canvas from data
    function populateCanvasFromData(canvasData) {
        // Populate form elements with saved data
        document.querySelectorAll('.section').forEach(section => {
            const sectionId = section.id;
            const sectionData = canvasData[sectionId] || {};

            // Set textarea and select values
            section.querySelectorAll('textarea, select').forEach(element => {
                const tagName = element.tagName.toLowerCase();
                if (sectionData[tagName] !== undefined) {
                    element.value = sectionData[tagName];
                }
            });

            // Set checkbox values
            section.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if (sectionData[checkbox.name] !== undefined) {
                    checkbox.checked = sectionData[checkbox.name];
                }
            });
        });
    }

    // Export canvas to PDF
    function exportCanvasToPDF() {
        try {
            // Create a message to inform the user about PDF export
            showNotification('Preparing PDF report for download...');

            // Get all canvas data
            const canvasData = getCanvasData();

            // Create a printable version of the canvas
            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                showNotification('Pop-up blocked. Please allow pop-ups for this site.', true);
                return;
            }

            // Get current date and time for the report
            const now = new Date();
            const formattedDate = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedTime = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Create the HTML content for the print window with professional report styling
            let printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>AI Canvas Analyzer Report</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

                        :root {
                            --primary: #4361ee;
                            --secondary: #3f37c9;
                            --accent: #4cc9f0;
                            --text: #333;
                            --light-bg: #f8f9fa;
                            --border: #e0e0e0;
                        }

                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                        }

                        @page {
                            margin: 1in;
                            size: letter;
                            @bottom-center {
                                content: "Page " counter(page) " of " counter(pages);
                            }
                        }

                        body {
                            font-family: 'Roboto', Arial, sans-serif;
                            color: var(--text);
                            line-height: 1.6;
                            padding: 0;
                            margin: 0;
                            background-color: white;
                            counter-reset: page;
                        }

                        .report {
                            max-width: 1000px;
                            margin: 0 auto;
                            padding: 40px;
                        }

                        .report-header {
                            text-align: center;
                            margin-bottom: 20px;
                        }

                        .report-title {
                            color: var(--primary);
                            margin-bottom: 5px;
                        }

                        .report-subtitle {
                            color: #666;
                            margin-bottom: 10px;
                            font-size: 1.1rem;
                        }

                        .report-date {
                            font-size: 0.9rem;
                            color: #888;
                        }

                        .page-footer {
                            position: running(footer);
                            text-align: center;
                            padding-top: 10px;
                            border-top: 1px solid var(--border);
                            font-size: 12px;
                            color: #666;
                        }

                        @page {
                            @bottom-center { content: element(footer) }
                        }

                        /* Report sections styling */
                        .report-section {
                            margin-bottom: 30px;
                            page-break-inside: avoid;
                            border: 1px solid var(--border);
                            border-radius: 8px;
                            overflow: hidden;
                        }

                        .section-header {
                            display: flex;
                            align-items: center;
                            background-color: var(--light-bg);
                            padding: 15px;
                            border-bottom: 1px solid var(--border);
                        }

                        .section-number {
                            width: 30px;
                            height: 30px;
                            background-color: var(--primary);
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            margin-right: 15px;
                        }

                        .section-title {
                            margin: 0;
                            color: var(--primary);
                            font-size: 1.2rem;
                        }

                        .section-content {
                            padding: 20px;
                        }

                        .executive-summary {
                            background-color: var(--light-bg);
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                            border-left: 4px solid var(--primary);
                        }

                        .executive-summary h2 {
                            color: var(--primary);
                            margin-top: 0;
                            margin-bottom: 15px;
                            font-size: 1.5rem;
                        }

                        .summary-content {
                            padding-left: 10px;
                        }

                        .summary-content p {
                            margin-bottom: 10px;
                        }

                        .executive-summary p {
                            margin-bottom: 10px;
                        }

                        .report-header {
                            text-align: center;
                            margin-bottom: 40px;
                            padding-bottom: 20px;
                            border-bottom: 1px solid var(--border);
                        }

                        .report-title {
                            font-size: 28px;
                            color: var(--primary);
                            margin-bottom: 10px;
                            font-weight: 700;
                        }

                        .report-subtitle {
                            font-size: 16px;
                            color: #666;
                            font-weight: 300;
                        }

                        .report-date {
                            margin-top: 15px;
                            font-size: 14px;
                            color: #666;
                        }

                        .report-section {
                            margin-bottom: 30px;
                            page-break-inside: avoid;
                        }

                        .section-header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 15px;
                            padding-bottom: 8px;
                            border-bottom: 2px solid var(--accent);
                        }

                        .section-number {
                            background-color: var(--primary);
                            color: white;
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 500;
                            margin-right: 10px;
                            flex-shrink: 0;
                        }

                        .section-title {
                            font-size: 20px;
                            color: var(--secondary);
                            font-weight: 500;
                        }

                        .section-content {
                            background-color: var(--light-bg);
                            padding: 20px;
                            border-radius: 8px;
                            border-left: 4px solid var(--primary);
                        }

                        .section-content p {
                            margin-bottom: 10px;
                        }

                        .data-item {
                            margin-top: 15px;
                            padding-top: 15px;
                            border-top: 1px dashed var(--border);
                        }

                        .data-label {
                            font-weight: 500;
                            color: var(--secondary);
                            margin-right: 10px;
                        }

                        .checkbox-item {
                            display: flex;
                            align-items: center;
                            margin-top: 8px;
                        }

                        .checkbox-icon {
                            color: var(--accent);
                            margin-right: 8px;
                        }

                        .report-footer {
                            margin-top: 50px;
                            padding-top: 20px;
                            border-top: 1px solid var(--border);
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                        }

                        .page-break {
                            page-break-after: always;
                        }

                        .executive-summary {
                            margin: 30px 0;
                            padding: 25px;
                            background-color: rgba(76, 201, 240, 0.1);
                            border-radius: 8px;
                            border-left: 4px solid var(--accent);
                        }

                        .executive-summary h2 {
                            color: var(--secondary);
                            margin-bottom: 15px;
                            font-size: 22px;
                        }

                        @media print {
                            body {
                                padding: 0;
                                background-color: white;
                            }

                            .report {
                                padding: 20px;
                                max-width: 100%;
                            }

                            .no-print {
                                display: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="report">
                        <div class="report-header">
                            <h1 class="report-title">AI Canvas Analyzer Report</h1>
                            <p class="report-subtitle">A comprehensive overview of your AI project</p>
                            <p class="report-date">Generated on ${formattedDate} at ${formattedTime}</p>
                        </div>
                        <hr>
            `;

            // Extract key information for executive summary
            const taskType = canvasData['task-type']?.textarea || 'Not defined';
            const valueProp = canvasData['value-proposition']?.textarea || 'Not defined';
            const outcome = canvasData['outcome']?.textarea || 'Not defined';

            // Add page footer only (header is already in the report-header)
            printContent += `
                <div class="page-footer">
                    <p>Page <span class="pageNumber"></span> of <span class="totalPages"></span></p>
                    <p>Generated using the AI Canvas Analyzer Tool</p>
                </div>
            `;

            // Add executive summary
            printContent += `
                <div class="executive-summary">
                    <h2>Executive Summary</h2>
                    <div class="summary-content">
                        <p><strong>Task Type:</strong> ${taskType.length > 200 ? taskType.substring(0, 200) + '...' : taskType}</p>
                        <p><strong>Value Proposition:</strong> ${valueProp.length > 200 ? valueProp.substring(0, 200) + '...' : valueProp}</p>
                        <p><strong>Outcome:</strong> ${outcome.length > 200 ? outcome.substring(0, 200) + '...' : outcome}</p>
                    </div>
                </div>
            `;

            // Add each section to the print content
            let sectionCounter = 1;
            document.querySelectorAll('.section').forEach(section => {
                const sectionId = section.id;
                const sectionTitle = section.querySelector('h2').textContent.replace(/^\d+\.\s*/, ''); // Remove numbering
                const sectionData = canvasData[sectionId] || {};

                printContent += `
                    <div class="report-section">
                        <div class="section-header">
                            <div class="section-number">${sectionCounter}</div>
                            <h2 class="section-title">${sectionTitle}</h2>
                        </div>
                        <div class="section-content">
                `;

                // Add textarea content
                if (sectionData.textarea) {
                    printContent += `<p>${sectionData.textarea.replace(/\n/g, '<br>')}</p>`;
                } else {
                    printContent += `<p><em>No information provided</em></p>`;
                }

                // No additional data for data-training section anymore

                printContent += `
                        </div>
                    </div>
                `;

                sectionCounter++;
            });

            // Add closing tags
            printContent += `
                    </div>
                    <script>
                        window.onload = function() {
                            // Add page numbers
                            const totalPages = Math.ceil(document.body.scrollHeight / 1056); // Approximate A4 height in pixels
                            document.querySelectorAll('.totalPages').forEach(el => {
                                el.textContent = totalPages;
                            });

                            // Handle page numbers during print
                            const style = document.createElement('style');
                            style.textContent = '@media print { .pageNumber::before { content: counter(page); } }';
                            document.head.appendChild(style);

                            // Small delay to ensure styles are loaded
                            setTimeout(function() {
                                window.print();
                            }, 800);
                        }
                    </script>
                </body>
                </html>
            `;

            // Write to the print window and trigger print
            printWindow.document.open();
            // Using document.write is deprecated but still the most reliable way for print windows
            // We're using it here with the understanding that it's for a print window
            printWindow.document.write(printContent);
            printWindow.document.close();

        } catch (error) {
            console.error('Export error:', error);
            showNotification('Error exporting canvas: ' + error.message, true);
        }
    }
});