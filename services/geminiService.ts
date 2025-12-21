
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

const getApiBase = () => {
  // Optional override for extension/other environments
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, '');
  return '';
};

export const generateCodeFromDesign = async (
  base64Image: string,
  userGuidance: string = '',
  previousCode: GeneratedCode | null = null
): Promise<GeneratedCode> => {
  try {
    const optimizedBase64 = await optimizeImage(base64Image);

    const response = await fetch(`${getApiBase()}/api/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image: optimizedBase64,
        userGuidance,
        previousCode,
        model: GEMINI_MODEL_VISION,
        systemPrompt: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Backend error (${response.status} ${response.statusText}): ${errorText}`
      );
    }

    return (await response.json()) as GeneratedCode;
  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    throw error;
  }
};
