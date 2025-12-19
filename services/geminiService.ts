
import { GoogleGenAI, Type } from "@google/genai";
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
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

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_VISION,
      contents: {
        parts: [
          { text: promptText },
          { inlineData: { mimeType, data: base64Data } }
        ]
      },
      config: {
        temperature: 0.1,
        maxOutputTokens: 30000, 
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            html: { type: Type.STRING },
            css: { type: Type.STRING },
            javascript: { type: Type.STRING }
          },
          required: ["html", "css", "javascript"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    return JSON.parse(text) as GeneratedCode;
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
