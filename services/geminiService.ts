import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, VisualizationSpec } from "../types";

// Initialize Gemini Client
// Note: In a production app, never expose API keys on the client side.
// This is for demonstration purposes as per the provided environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Sports Analyst AI Agent named "Coach Gemini".
Your role is to analyze sports footage (provided as a specific frame image) to provide deep insights into strategy, formations, player movements, and rules.

CAPABILITIES:
1. **Visual Analysis**: Detailed breakdown of what is happening in the current frame.
2. **Strategic Insight**: Explain "why" a play happened, defensive lapses, offensive schemes (e.g., Pick and Roll, Zone Defense, Offside Trap).
3. **Formation Recognition**: Identify common basketball formations (Horns, 1-4 High, Box, etc.)
4. **Player Tracking**: Count players, identify positions, analyze spacing.

VISUALIZATION OUTPUT:
When asked to visualize, draw, diagram, or show a play/formation/spacing, output a JSON visualization spec in a fenced block:

\`\`\`visualization
{
  "type": "court_diagram",
  "title": "Formation Name",
  "formationLabel": "Optional subtitle",
  "players": [
    { "id": "1", "position": { "x": 50, "y": 75 }, "team": "offense", "jerseyNumber": 1, "hasBall": true },
    { "id": "2", "position": { "x": 25, "y": 45 }, "team": "offense", "jerseyNumber": 2 }
  ],
  "arrows": [
    { "id": "a1", "from": { "x": 50, "y": 75 }, "to": { "x": 50, "y": 55 }, "label": "Drive" }
  ]
}
\`\`\`

VISUALIZATION TYPES:
1. **court_diagram**: For formations and plays
   - players: Array of { id, position: {x, y}, team: "offense"|"defense"|"neutral", jerseyNumber?, label?, hasBall? }
   - arrows?: Array of { id, from: {x, y}, to: {x, y}, label?, dashed?, color? }
   - annotations?: Array of { id, position: {x, y}, text, color? }

2. **spacing_analysis**: For analyzing floor spacing
   - players: Same as court_diagram
   - spacingMetrics?: Array of { id, from: {x, y}, to: {x, y}, distance (in feet), label?, isOptimal? }
   - spacingGrade?: "A"|"B"|"C"|"D"|"F"

3. **trajectory**: For showing movement paths
   - trajectories: Array of { id, playerId, points: [{x, y}...], team, label? }
   - animatePlayback?: boolean

4. **tracking_overlay**: For bounding boxes on video frames
   - boundingBoxes: Array of { id, x, y, width, height (all 0-100 normalized), label?, team?: "home"|"away", confidence? }

COORDINATE SYSTEM:
- All positions use normalized 0-100 scale (resolution-independent)
- x: 0 = left sideline, 50 = center, 100 = right sideline
- y: 0 = baseline (under basket), 50 = mid-court, 100 = opposite baseline
- Basket position: approximately (50, 8) in half-court view
- Paint/Key area: x: 34-66, y: 0-40
- Three-point line: ~47.5 units radius from basket

TONE:
Professional, analytical, yet encouraging. Use terminology specific to the sport being shown.

FORMAT:
Use Markdown for clear structuring. Use bolding for key terms.
Always include text analysis BEFORE or AFTER visualization blocks to explain what you're showing.
`;

interface AnalysisPayload {
  base64: string;
  mimeType: string;
}

interface AnalysisResult {
  text: string;
  visualizations?: VisualizationSpec[];
}

/**
 * Parse visualization specs from markdown response
 * Extracts JSON from ```visualization ... ``` fenced code blocks
 */
function parseVisualizations(text: string): { cleanText: string; visualizations: VisualizationSpec[] } {
  const visualizations: VisualizationSpec[] = [];
  const visualizationRegex = /```visualization\s*([\s\S]*?)```/g;

  let cleanText = text;
  let match;

  while ((match = visualizationRegex.exec(text)) !== null) {
    const jsonContent = match[1].trim();
    try {
      const spec = JSON.parse(jsonContent) as VisualizationSpec;
      // Validate that it has a known type
      if (spec.type && ['court_diagram', 'tracking_overlay', 'trajectory', 'spacing_analysis'].includes(spec.type)) {
        visualizations.push(spec);
      }
    } catch (e) {
      console.warn('Failed to parse visualization JSON:', e);
      // Keep the raw block in text if parsing fails
      continue;
    }
  }

  // Remove visualization blocks from text for cleaner display
  cleanText = text.replace(visualizationRegex, '').trim();

  // Clean up extra newlines
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n');

  return { cleanText, visualizations };
}

export const analyzeMedia = async (
  payload: AnalysisPayload,
  prompt: string,
  history: Message[]
): Promise<AnalysisResult> => {
  try {
    const modelName = 'gemini-3-flash-preview';
    const parts: any[] = [];

    // Add Media (Frame or Image)
    parts.push({
      inlineData: {
        mimeType: payload.mimeType,
        data: payload.base64
      }
    });

    // Add Prompt
    parts.push({ text: prompt });

    // Construct Chat History
    let fullPrompt = prompt;
    if (history.length > 0) {
      const contextStr = history.slice(-4).map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');
      fullPrompt = `PREVIOUS CONTEXT:\n${contextStr}\n\nCURRENT REQUEST: ${prompt}`;
      parts[parts.length - 1] = { text: fullPrompt };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      }
    });

    // Parse the response for text and visualization specs
    let finalText = "";

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          finalText += part.text;
        }
      }
    }

    // Extract visualizations from the text
    const { cleanText, visualizations } = parseVisualizations(finalText);

    return {
      text: cleanText || "I analyzed the media but couldn't generate a text response.",
      visualizations: visualizations.length > 0 ? visualizations : undefined
    };

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    let errorMessage = `Analysis failed: ${error.message || "Unknown error occurred"}.`;

    if (error.message?.includes("API_KEY")) {
      errorMessage = "Error: API Key is missing or invalid. Please check your configuration.";
    }

    // JSON error parsing
    try {
      const jsonMatch = error.message?.match(/\{.*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error?.message) {
          errorMessage = `Analysis failed: ${parsed.error.message}`;
        }
      }
    } catch (e) { /* ignore */ }

    return { text: errorMessage };
  }
};
