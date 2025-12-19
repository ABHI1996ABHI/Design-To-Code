
import { GEMINI_MODEL_VISION, SYSTEM_PROMPT } from '../constants';
import { GeneratedCode } from '../types';

async function optimizeImage(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = 1600;
      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  });
}

export const generateCodeFromDesign = async (
  base64Image: string, 
  userGuidance: string = '', 
  previousCode: GeneratedCode | null = null
): Promise<GeneratedCode> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Please add it to your .env.local file.');
    }

    const optimizedBase64 = await optimizeImage(base64Image);
    const base64Data = optimizedBase64.split(',')[1];
    const mimeType = 'image/jpeg';

    let promptText = SYSTEM_PROMPT;
    
    if (previousCode) {
      promptText += `
\n### CURRENT CODE TO MODIFY:
HTML: ${previousCode.html}
CSS: ${previousCode.css}
JS: ${previousCode.javascript}

### NEW GUIDANCE:
${userGuidance}

Update the current code based on this guidance. Maintain the 1350px width and specified heading classes.`;
    } else {
      promptText += `\n### INITIAL GUIDANCE:\n${userGuidance || 'Follow the design exactly.'}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_VISION}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                { inlineData: { mimeType, data: base64Data } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 30000
          },
          // These fields mirror the SDK usage; if the model
          // ignores them it will still return text content.
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              html: { type: "string" },
              css: { type: "string" },
              javascript: { type: "string" }
            },
            required: ["html", "css", "javascript"]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: any = await response.json();

    // The API returns candidates with content.parts[].text
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
      null;

    if (!text) {
      throw new Error("Empty or unexpected AI response format");
    }

    return JSON.parse(text) as GeneratedCode;
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
