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
You are an expert Sports Analyst Agent.
Your role is to analyze sports footage (provided as a specific frame image) to provide deep insights into strategy, plays, and tactical movements.

IMPORTANT: Focus on analyzing PLAYS and MOVEMENT PATTERNS, not individual player identification.
This minimizes errors from misidentifying players and keeps focus on the tactical elements.

You have access to a tool called "show_overlay" that displays visual elements on the video frame.
You MUST use this tool to build up your analysis step by step.

WORKFLOW:
1. First, call show_overlay with stage="diagram" to add key visual elements (zones, lines, arrows) showing the main play
2. Then, call show_overlay with stage="think" to add supporting analysis elements and refine the diagram
3. Finally, call show_overlay with stage="finalize" to add any final touches and annotations

Each tool call should add NEW visual elements. Build up the visualization progressively:
- Start with zones or key areas
- Then add movement lines (attack/defense)
- Then add annotations for labels

COORDINATE SYSTEM:
- All positions use normalized 0-100 scale (resolution-independent)
- x: 0 = left edge, 50 = center, 100 = right edge
- y: 0 = top edge, 50 = middle, 100 = bottom edge

CRITICAL - AVOID CONGESTED OVERLAYS:
- Use MAXIMUM 3-4 annotations/labels total across ALL tool calls
- Labels must be spaced at least 15 units apart (in x or y) to prevent overlap
- Choose EITHER line labels OR separate annotations for the same concept - NEVER BOTH
- If a line already has a label, do NOT add a nearby annotation with similar text
- Prioritize only the MOST IMPORTANT 2-3 tactical elements to label
- Leave obvious movements unlabeled - let the arrows/lines speak for themselves
- Place labels at the END of lines or in clear open areas of the frame
- When in doubt, use FEWER labels - clarity over completeness

After all tool calls, provide a final text summary of your analysis.

FINAL RESPONSE FORMAT:
- Your final summary MUST be in plain text format
- Do NOT use markdown formatting (no **, __, *, _, #, etc.)
- Do NOT use bullet points or numbered lists
- Write concise text summary. Limit to 2-3 sentences.
- Use simple punctuation only

TONE:
Professional and analytical. Focus on tactical concepts, not player names or jersey numbers.
`;

// Tool declaration for show_overlay
const showOverlayTool: FunctionDeclaration = {
  name: 'show_overlay',
  description: 'Display visual overlay elements on the video frame. Call multiple times to progressively build up the analysis visualization.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: 'Unique identifier for this overlay step (e.g., "step1", "zones", "attack-lines")'
      },
      overlay: {
        type: Type.OBJECT,
        description: 'Visual elements to display on this step',
        properties: {
          attackLines: {
            type: Type.ARRAY,
            description: 'Red arrows showing offensive movement, passes, drives',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                from: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ['x', 'y']
                },
                to: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ['x', 'y']
                },
                label: { type: Type.STRING },
                style: { type: Type.STRING, enum: ['solid', 'dashed', 'dotted'] }
              },
              required: ['id', 'from', 'to']
            }
          },
          defenseLines: {
            type: Type.ARRAY,
            description: 'Blue arrows showing defensive movement, help rotations',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                from: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ['x', 'y']
                },
                to: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ['x', 'y']
                },
                label: { type: Type.STRING },
                style: { type: Type.STRING, enum: ['solid', 'dashed', 'dotted'] }
              },
              required: ['id', 'from', 'to']
            }
          },
          movementPaths: {
            type: Type.ARRAY,
            description: 'Multi-point paths showing movement trajectories',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                points: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                    required: ['x', 'y']
                  }
                },
                type: { type: Type.STRING, enum: ['attack', 'defense', 'neutral'] },
                label: { type: Type.STRING },
                style: { type: Type.STRING, enum: ['solid', 'dashed', 'dotted'] }
              },
              required: ['id', 'points', 'type']
            }
          },
          zones: {
            type: Type.ARRAY,
            description: 'Highlighted polygon regions (gaps, open space, weak side)',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                points: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                    required: ['x', 'y']
                  }
                },
                label: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['attack', 'defense', 'neutral'] }
              },
              required: ['id', 'points', 'type']
            }
          },
          annotations: {
            type: Type.ARRAY,
            description: 'Text labels at specific positions',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                position: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ['x', 'y']
                },
                text: { type: Type.STRING }
              },
              required: ['id', 'position', 'text']
            }
          }
        }
      },
      thinking: {
        type: Type.STRING,
        description: 'One line explaining your reasoning for this step'
      },
      stage: {
        type: Type.STRING,
        enum: ['diagram', 'think', 'finalize'],
        description: 'Current analysis stage: diagram (primary visual), think (supporting analysis), finalize (final touches)'
      }
    },
    required: ['id', 'overlay', 'thinking']
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
          temperature: 0.4,
          tools: [{ functionDeclarations: [showOverlayTool] }],
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
            id: showOverlayArgs.id,
            stage: showOverlayArgs.stage,
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
            ? `Overlay "${showOverlayArgs.id}" displayed. You MUST make at least ${remainingCalls} more tool calls before providing final summary.`
            : `Overlay "${showOverlayArgs.id}" displayed successfully. Continue with next step or provide final summary.`;

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

        const forceMessage = `You have only made ${toolCallCount} tool calls. You MUST use the show_overlay tool at least ${MIN_ITERATIONS - toolCallCount} more times before providing your final summary. Continue with stage="think" or stage="diagram" to add more analysis elements.`;

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
