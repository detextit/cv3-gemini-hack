import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Content, Part, Type } from "@google/genai";
import { Message, VisualizationSpec, AgentCallback, OverlayData, ShowOverlayArgs, PlayDiagramSpec } from "../types";

// Browser-compatible logging utility
const LOG_KEY = 'agent_debug_log';

// Initialize or clear log on module load
if (typeof localStorage !== 'undefined') {
  localStorage.setItem(LOG_KEY, '');
}

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? '\n' + JSON.stringify(data, null, 2) : '';
  const logLine = `[${timestamp}] ${message}${dataStr}`;

  // Always log to console with nice formatting
  console.log(`%c[Agent]%c ${message}`, 'color: #22c55e; font-weight: bold', 'color: inherit', data ?? '');

  // Also store in localStorage for persistence
  if (typeof localStorage !== 'undefined') {
    try {
      const existing = localStorage.getItem(LOG_KEY) || '';
      localStorage.setItem(LOG_KEY, existing + logLine + '\n\n');
    } catch (e) {
      // localStorage might be full or unavailable
    }
  }
}

// Helper to get all logs (can be called from browser console)
export function getAgentLogs(): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(LOG_KEY) || '';
  }
  return '';
}

// Helper to download logs as file (can be called from browser console)
export function downloadAgentLogs() {
  const logs = getAgentLogs();
  const blob = new Blob([logs], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agent_debug_${new Date().toISOString()}.log`;
  a.click();
  URL.revokeObjectURL(url);
}

// Expose helpers to window for console access
if (typeof window !== 'undefined') {
  (window as any).getAgentLogs = getAgentLogs;
  (window as any).downloadAgentLogs = downloadAgentLogs;
}

// Initialize Gemini Client
// Note: In a production app, never expose API keys on the client side.
// This is for demonstration purposes as per the provided environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Agentic system instruction for step-by-step tool calling
const AGENTIC_SYSTEM_INSTRUCTION = `
You are an expert Basketball (NBA) Analyst Agent.
Your role is to analyze basketball footage (provided as a specific frame image) to provide deep insights into strategy, plays, and tactical movements.

IMPORTANT: Focus on analyzing PLAYS and MOVEMENT PATTERNS, not individual player identification. No need to label players (e.g., ball handler), officials, or elements of the court. 
This minimizes errors from misidentifying players and keeps focus on the tactical elements. Focus on the tactical elements of the play. 

You have access to a tool called "show_overlay" that draws visual elements on the video frame.
Use this tool to build up your analysis progressively.

WORKFLOW:
1. Call show_overlay to add visual elements (lines, zones, arrows)
2. Each call should add NEW elements - build up the diagram progressively
3. After all visual elements are added, provide a final text summary

VISUAL ELEMENTS:
- attackLines: Red arrows for offensive movement, passes, drives (from/to coords)
- defenseLines: Blue arrows for defensive movement, help rotations (from/to coords)
- zones: Highlighted polygon regions for gaps, open space, weak side (points array)
- annotations: Text labels at specific positions (position and text)

COORDINATE SYSTEM:
- All positions use normalized 0-100 scale (resolution-independent)
- x: 0 = left edge, 50 = center, 100 = right edge
- y: 0 = top edge, 50 = middle, 100 = bottom edge

CRITICAL - AVOID CONGESTED OVERLAYS:
- Use MAXIMUM 3-4 annotations/labels total across ALL tool calls
- Labels must be spaced at least 15 units apart (in x or y) to prevent overlap
- Choose EITHER line labels OR separate annotations for the same concept - NEVER BOTH
- Prioritize only the MOST IMPORTANT 2-3 tactical elements to label
- Leave obvious movements unlabeled - let the arrows/lines speak for themselves
- When in doubt, use FEWER labels - clarity over completeness

FINAL RESPONSE FORMAT:
- Your final summary MUST be in plain text format
- Do NOT use markdown formatting (no **, __, *, _, #, etc.)
- Do NOT use bullet points or numbered lists
- Write concise text summary. Clean and simple for the reader.

TONE:
Professional and analytical. Focus on tactical and strategic concepts, not player names or jersey numbers.
`;

// Tool declaration for show_overlay
// Schema must be explicit enough for model to output correct coordinate structure
const showOverlayTool: FunctionDeclaration = {
  name: 'show_overlay',
  description: 'Draw visual elements on the video frame. Call multiple times to build up the analysis. All coordinates use 0-100 normalized scale.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      overlay: {
        type: Type.OBJECT,
        description: 'Visual elements to draw',
        properties: {
          attackLines: {
            type: Type.ARRAY,
            description: 'Red arrows for offensive movement',
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ['x', 'y'] },
                to: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ['x', 'y'] },
                label: { type: Type.STRING }
              },
              required: ['from', 'to']
            }
          },
          defenseLines: {
            type: Type.ARRAY,
            description: 'Blue arrows for defensive movement',
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ['x', 'y'] },
                to: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ['x', 'y'] },
                label: { type: Type.STRING }
              },
              required: ['from', 'to']
            }
          },
          zones: {
            type: Type.ARRAY,
            description: 'Highlighted polygon regions',
            items: {
              type: Type.OBJECT,
              properties: {
                points: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ['x', 'y'] } },
                label: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['attack', 'defense', 'neutral'] }
              },
              required: ['points', 'type']
            }
          },
          annotations: {
            type: Type.ARRAY,
            description: 'Text labels',
            items: {
              type: Type.OBJECT,
              properties: {
                position: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ['x', 'y'] },
                text: { type: Type.STRING }
              },
              required: ['position', 'text']
            }
          }
        }
      },
      thinking: {
        type: Type.STRING,
        description: 'Your reasoning (scratch space)'
      }
    },
    required: ['overlay']
  }
};

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
        systemInstruction: AGENTIC_SYSTEM_INSTRUCTION,
        temperature: 0,
        thinkingConfig: {
          thinkingBudget: 0
        }
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

/**
 * Merge overlay data into accumulated visualization spec
 */
function mergeOverlayData(accumulated: PlayDiagramSpec, newData: OverlayData): PlayDiagramSpec {
  return {
    ...accumulated,
    attackLines: [...(accumulated.attackLines || []), ...(newData.attackLines || [])],
    defenseLines: [...(accumulated.defenseLines || []), ...(newData.defenseLines || [])],
    movementPaths: [...(accumulated.movementPaths || []), ...(newData.movementPaths || [])],
    zones: [...(accumulated.zones || []), ...(newData.zones || [])],
    annotations: [...(accumulated.annotations || []), ...(newData.annotations || [])],
  };
}



/**
 * Agentic analysis with tool calling loop
 * Model emits show_overlay tool calls one at a time, enabling real-time UI updates
 * Uses prefill to speed up first response and enforces minimum iterations
 */
export const analyzeMediaAgentic = async (
  payload: AnalysisPayload,
  prompt: string,
  callback: AgentCallback
): Promise<AnalysisResult> => {
  const MAX_ITERATIONS = 10;
  const MIN_ITERATIONS = 5;  // Minimum tool calls before completion
  const modelName = 'gemini-3-flash-preview';

  // Note: We no longer generate deterministic overlays here.
  // Instead, the UI shows a CSS-based processing effect for better UX.

  // Accumulated visualization from all tool calls
  let accumulatedSpec: PlayDiagramSpec = {
    type: 'play_diagram',
    title: 'Analysis',
    attackLines: [],
    defenseLines: [],
    movementPaths: [],
    zones: [],
    annotations: [],
  };

  // Build conversation history for the loop
  const contents: Content[] = [];

  // Initial user message with image and prompt
  const initialParts: Part[] = [
    {
      inlineData: {
        mimeType: payload.mimeType,
        data: payload.base64
      }
    },
    { text: prompt }
  ];

  contents.push({
    role: 'user',
    parts: initialParts
  });

  // Note: We cannot use prefill with functionCall for Gemini 3 models because
  // they require a thought_signature that only the model can generate.
  // Instead, we use generateInitialOverlays() above for instant UI feedback.

  // Track tool call count for minimum iterations
  let toolCallCount = 0;

  // Track latency for first response
  const startTime = performance.now();
  let firstResponseLogged = false;

  try {
    log('=== STARTING AGENT LOOP ===');
    log('Prompt:', prompt);
    log('Image MIME type:', payload.mimeType);
    log('Image base64 length:', payload.base64.length);
    log('MIN_ITERATIONS:', MIN_ITERATIONS);
    log('Start time:', new Date().toISOString());

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      log(`\n--- ITERATION ${iteration + 1}/${MAX_ITERATIONS} (tool calls: ${toolCallCount}) ---`);
      log('Contents count:', contents.length);

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: AGENTIC_SYSTEM_INSTRUCTION,
          temperature: 0,
          tools: [{ functionDeclarations: [showOverlayTool] }],
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      log('Response received');

      // Log first response latency
      if (!firstResponseLogged) {
        const firstResponseLatency = performance.now() - startTime;
        log(`🕐 FIRST RESPONSE LATENCY: ${firstResponseLatency.toFixed(0)}ms`);
        console.log(`%c🕐 First Response Latency: ${firstResponseLatency.toFixed(0)}ms`, 'color: #f59e0b; font-weight: bold; font-size: 14px');
        firstResponseLogged = true;
      }

      log('Candidates count:', response.candidates?.length);

      const candidate = response.candidates?.[0];

      // Log finish reason
      log('Finish reason:', candidate?.finishReason);

      if (!candidate?.content?.parts) {
        log('ERROR: No content parts in candidate');
        log('Full candidate:', candidate);
        break;
      }

      log('Parts count:', candidate.content.parts.length);

      // Log each part type
      candidate.content.parts.forEach((part, idx) => {
        log(`Part ${idx}:`, {
          hasText: !!part.text,
          textPreview: part.text?.substring(0, 100),
          hasFunctionCall: !!part.functionCall,
          functionName: part.functionCall?.name,
        });
      });

      // Add assistant response to history
      contents.push({
        role: 'model',
        parts: candidate.content.parts
      });

      // Check for function calls
      const functionCall = candidate.content.parts.find(part => part.functionCall);

      if (functionCall?.functionCall) {
        const { name, args } = functionCall.functionCall;
        log('Function call detected:', { name, args });
        toolCallCount++;

        if (name === 'show_overlay' && args) {
          const showOverlayArgs = args as unknown as ShowOverlayArgs;

          log('ShowOverlay args:', {
            thinking: showOverlayArgs.thinking,
            overlayKeys: showOverlayArgs.overlay ? Object.keys(showOverlayArgs.overlay) : []
          });

          // Merge new overlay data into accumulated spec
          if (showOverlayArgs.overlay) {
            accumulatedSpec = mergeOverlayData(accumulatedSpec, showOverlayArgs.overlay);
            log('Accumulated spec updated:', {
              attackLines: accumulatedSpec.attackLines?.length,
              defenseLines: accumulatedSpec.defenseLines?.length,
              zones: accumulatedSpec.zones?.length,
              annotations: accumulatedSpec.annotations?.length,
            });
          }

          // Fire callback async (non-blocking) so UI updates without blocking the loop
          setTimeout(() => {
            callback({
              type: 'tool_call',
              toolName: name,
              args: showOverlayArgs
            });
          }, 0);

          // Determine response message based on progress toward minimum iterations
          const remainingCalls = MIN_ITERATIONS - toolCallCount;
          const progressMessage = remainingCalls > 0
            ? `Overlay displayed. You MUST make at least ${remainingCalls} more tool calls before providing final summary.`
            : `Overlay displayed successfully. Continue adding elements or provide final summary.`;

          // Add function response to continue the loop
          const functionResponse = {
            role: 'user' as const,
            parts: [{
              functionResponse: {
                name: 'show_overlay',
                response: {
                  success: true,
                  message: progressMessage
                }
              }
            }]
          };
          log('Adding function response:', functionResponse);
          log('Tool call count:', { current: toolCallCount, min: MIN_ITERATIONS });
          contents.push(functionResponse);
        }
      } else if (toolCallCount < MIN_ITERATIONS) {
        // Model tried to complete before minimum iterations - force it to continue
        log('Model tried to complete early, forcing continuation. Tool calls:', toolCallCount);

        const forceMessage = `You have only made ${toolCallCount} tool calls. You MUST use the show_overlay tool at least ${MIN_ITERATIONS - toolCallCount} more times before providing your final summary. Continue adding more visual elements.`;

        contents.push({
          role: 'user',
          parts: [{ text: forceMessage }]
        });
        // Don't break - continue the loop
      } else {
        // No function call - model is done, extract final text
        log('No function call in response - model finished');

        let finalText = '';
        for (const part of candidate.content.parts) {
          if (part.text) {
            finalText += part.text;
          }
        }

        log('Final text length:', finalText.length);
        log('Final text preview:', finalText.substring(0, 200));

        // Fire completion callback (non-blocking)
        setTimeout(() => {
          callback({
            type: 'completion',
            finalText: finalText
          });
        }, 0);

        log('=== AGENT LOOP COMPLETE ===');
        log('Total iterations:', iteration + 1);

        return {
          text: finalText || "Analysis complete.",
          visualizations: accumulatedSpec.attackLines?.length ||
            accumulatedSpec.defenseLines?.length ||
            accumulatedSpec.zones?.length ||
            accumulatedSpec.annotations?.length
            ? [accumulatedSpec]
            : undefined
        };
      }
    }

    // Max iterations reached
    return {
      text: "Analysis reached maximum iterations.",
      visualizations: [accumulatedSpec]
    };

  } catch (error: any) {
    console.error("Gemini Agentic Analysis Error:", error);
    let errorMessage = `Analysis failed: ${error.message || "Unknown error occurred"}.`;

    if (error.message?.includes("API_KEY")) {
      errorMessage = "Error: API Key is missing or invalid. Please check your configuration.";
    }

    // Return partial results if we have any
    return {
      text: errorMessage,
      visualizations: accumulatedSpec.attackLines?.length ||
        accumulatedSpec.defenseLines?.length ||
        accumulatedSpec.zones?.length
        ? [accumulatedSpec]
        : undefined
    };
  }
};
