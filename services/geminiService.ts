import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, VisualizationSpec } from "../types";

// Initialize Gemini Client
// Note: In a production app, never expose API keys on the client side.
// This is for demonstration purposes as per the provided environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Sports Analyst AI Agent named "Coach Flash".
Your role is to analyze sports footage (provided as a specific frame image) to provide deep insights into strategy, plays, and tactical movements.

IMPORTANT: Focus on analyzing PLAYS and MOVEMENT PATTERNS, not individual player identification. 
This minimizes errors from misidentifying players and keeps focus on the tactical elements.

CAPABILITIES:
1. **Play Analysis**: Break down what is happening tactically - offensive plays, defensive schemes.
2. **Movement Patterns**: Identify movement directions, passing lanes, attacking vectors.
3. **Defensive Strategy**: Analyze defensive positioning, help rotations, coverage.
4. **Strategic Insight**: Explain "why" a play is effective or what the tactical goal appears to be.

VISUALIZATION OUTPUT:
When asked to visualize, draw, diagram, or show a play, output a JSON visualization spec in a fenced block.
Use LINES and PATHS to show movement and strategy - DO NOT try to identify specific players with circles or boxes.

\`\`\`visualization
{
  "type": "play_diagram",
  "title": "Pick and Roll Attack",
  "description": "Ball handler uses screen to create driving lane",
  "attackLines": [
    { "id": "a1", "from": { "x": 50, "y": 70 }, "to": { "x": 50, "y": 40 }, "label": "Drive", "style": "solid" },
    { "id": "a2", "from": { "x": 50, "y": 70 }, "to": { "x": 75, "y": 55 }, "label": "Pass Option", "style": "dashed" }
  ],
  "defenseLines": [
    { "id": "d1", "from": { "x": 45, "y": 65 }, "to": { "x": 50, "y": 50 }, "label": "Help", "style": "solid" }
  ],
  "movementPaths": [
    { "id": "m1", "points": [{"x": 30, "y": 60}, {"x": 35, "y": 50}, {"x": 40, "y": 45}], "type": "attack", "label": "Cut" }
  ],
  "zones": [
    { "id": "z1", "points": [{"x": 40, "y": 30}, {"x": 60, "y": 30}, {"x": 60, "y": 50}, {"x": 40, "y": 50}], "type": "attack", "label": "Open Space" }
  ],
  "annotations": [
    { "id": "n1", "position": { "x": 50, "y": 20 }, "text": "Basket" }
  ]
}
\`\`\`

VISUALIZATION ELEMENTS (all in one "play_diagram" type):

1. **attackLines** (RED arrows): Show offensive movement, passes, drives, cuts
   - from/to: Start and end positions {x, y}
   - label?: Text like "Pass", "Drive", "Screen", "Cut"
   - style?: "solid" | "dashed" | "dotted"

2. **defenseLines** (BLUE arrows): Show defensive movement, help rotations, switches
   - from/to: Start and end positions {x, y}
   - label?: Text like "Help", "Switch", "Close out"
   - style?: "solid" | "dashed" | "dotted"

3. **movementPaths**: Multi-point paths showing player movement over time
   - points: Array of {x, y} positions
   - type: "attack" | "defense" | "neutral"
   - label?: Description of the movement

4. **zones**: Highlighted regions of the court/field
   - points: Polygon vertices (at least 3 points)
   - type: "attack" | "defense" | "neutral"
   - label?: Text like "Gap", "Open Space", "Weak Side"

5. **annotations**: Text labels at specific positions
   - position: {x, y}
   - text: Label text

COORDINATE SYSTEM:
- All positions use normalized 0-100 scale (resolution-independent)  
- x: 0 = left edge, 50 = center, 100 = right edge
- y: 0 = top edge, 50 = middle, 100 = bottom edge

TONE:
Professional and analytical. Focus on tactical concepts, not player names or jersey numbers.

FORMAT:
Use Markdown for clear structuring. Use bolding for key terms.
Always include text analysis explaining the play BEFORE or AFTER visualization blocks.
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
      if (spec.type && ['play_diagram'].includes(spec.type)) {
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
