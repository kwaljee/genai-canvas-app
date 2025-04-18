# AI Canvas Analyzer App

A comprehensive tool for planning, analyzing, and documenting both traditional and generative AI projects. This application provides a structured canvas framework to help teams and individuals plan their AI initiatives effectively, whether they involve predictive/classification models or generative AI.


![image](https://github.com/user-attachments/assets/c99e80c8-b142-4d04-85e3-9c11955c9496)


## Features

- **Interactive Canvas**: 12-section framework for planning both traditional and generative AI projects
- **Quality Scoring**: AI-powered analysis of canvas content with percentage-based quality scores
- **Data Persistence**: Save/load canvas data as JSON files with quality scores included
- **PDF Export**: Generate professional report-style PDFs with proper formatting
- **AI Assistant**: Powered by Ollama with support for multiple local models
- **Canvas Analysis**: Get specific recommendations to improve your canvas content

## Project Structure

```
├── index.html          # Main application entry point
├── css/
│   └── style.css       # Application styling
├── js/
│   ├── script.js       # Main canvas functionality
│   ├── chat.js         # AI assistant and chat widget
│   └── proxy-server.js # Node.js proxy for Ollama API
└── README.md           # Project documentation
```

## Canvas Sections

1. **Task Type (Prediction/Generation)**: Define the core AI task (predict, classify, generate text/images/code, etc.)
2. **Human Judgment & Oversight**: Specify what human review, judgment, or approval is required for the AI output
3. **Action**: Describe what action will be taken based on the AI output (decision, publish, use internally)
4. **Outcome**: Define the desired outcome or impact of using the AI output
5. **Input Data / Prompts / Features**: Identify what input data, features, or prompts are needed to guide the AI
6. **Training/Fine-tuning Data**: Specify what data is used to train, pre-train, or fine-tune the AI model
7. **Feedback Loop**: Explain how you will collect feedback and use it to improve future AI outputs
8. **Value Proposition**: Articulate the business value of the AI solution (efficiency, creativity, cost savings, accuracy)
9. **Risks & Responsible AI**: Identify unique risks (bias, hallucination, privacy, compliance) and necessary guardrails
10. **Model Selection & Prompt Engineering**: Describe how you will select models and/or design prompts for optimal results
11. **Content Moderation & Quality Control**: Define processes to detect, filter, or correct inappropriate or low-quality outputs
12. **Transparency & User Experience**: Explain how you will communicate and design user interactions with the AI system

## Setup Instructions

### Prerequisites

1. Node.js installed on your system (required to run the proxy server)
2. Ollama installed on your system
3. At least one language model pulled in Ollama (e.g., Cogito 3B)

### Running the App

1. **Start Ollama**:
   ```
   ollama serve
   ```

2. **Pull a compatible model** (if you haven't already):
   ```
   ollama pull cogito:3b
   ```
   Note: You can use any model available in Ollama. The app will detect and list all installed models.

3. **Start the proxy server** (to handle CORS):
   ```
   node js/proxy-server.js
   ```

   The proxy server is necessary because browsers enforce a security policy called CORS (Cross-Origin Resource Sharing) that prevents the web page from directly communicating with the Ollama API. The proxy server adds the required CORS headers to make this communication possible.

4. **Open the app** by opening `index.html` in your browser

## Using the Application

### Canvas Tools

The sidebar contains all the tools you need to work with your canvas:

- **Analyze Canvas**: Uses AI to analyze your content and provide quality scores and recommendations
- **Save Canvas**: Saves your work to browser storage and downloads a JSON file
- **Load Canvas**: Loads your work from browser storage or from a JSON file
- **Export as PDF**: Creates a printable PDF report of your canvas

### AI Assistant

1. Click the chat button (💬) in the bottom-right corner
2. Select your preferred Ollama model from the dropdown
3. Ask questions about your Blended AI canvas or request suggestions
4. Use the "Check Connection" button to verify Ollama connectivity
5. Clear the conversation with the trash icon when needed

### Quality Scores

After analyzing your canvas, each section will display a quality score:

- **High (70-100%)**: Excellent content, specific and comprehensive
- **Medium (40-69%)**: Good content, could use more detail
- **Low (0-39%)**: Needs significant improvement

## Troubleshooting

If you encounter issues with the AI Assistant:

1. Make sure Ollama is running (`ollama serve`)
2. Make sure the proxy server is running (`node js/proxy-server.js`)
3. Check that you have at least one model available (`ollama list`)
4. Verify the connection using the "Check Connection" button
5. Check the browser console for error messages

### Proxy Server Alternatives

If you don't want to use Node.js, you have these alternatives:

1. **Configure Ollama with CORS headers**: You can modify the Ollama configuration to include CORS headers directly.

2. **Use a different CORS proxy**: There are browser extensions and other tools that can handle CORS for you.

3. **Run a simple server with Python**: If you have Python installed, you can use:
   ```
   # Python 3
   python -m http.server
   ```
   Then access the app at `http://localhost:8000`

## Saving and Loading Data

- Click "Save Canvas" to save to browser storage and download a JSON file
- Click "Load Canvas" to load from browser storage or upload a JSON file
- All quality scores are preserved when saving and loading

## Exporting as PDF

Click "Export as PDF" to generate a professional report that includes:

- Proper margins and formatting
- Header with date/time and title
- Section headers with quality scores
- Page numbers in the footer
- Clean, readable black and white format

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
