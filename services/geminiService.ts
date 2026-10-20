import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

let ai: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenerativeAI(GEMINI_API_KEY);
}

const MODELS_TO_TRY = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3-flash-preview"];

export const analyzeWhiteboard = async (base64Image: string) => {
  if (!ai) {
    return "El Tutor IA no esta configurado. Por favor, añade tu VITE_GEMINI_API_KEY al archivo .env.local o a Vercel.";
  }

  const prompt = "Analiza el contenido de esta pizarra educativa. Si hay problemas matemáticos, resuélvelos paso a paso. Si hay dibujos, notas o diagramas, explica qué son pedagógicamente. Sé conciso, claro y amable como un tutor. Responde en español.";
  const inlineData = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image.split(',')[1] || base64Image,
    },
  };

  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, inlineData]);
      const text = result.response.text();
      if (text) {
        return text;
      }
    } catch (error: any) {
      console.warn(`Error al usar modelo ${modelName}:`, error);
      lastError = error;
    }
  }

  console.error("Error calling Gemini API on all candidate models:", lastError);
  return `Lo siento, hubo un problema al consultar al tutor inteligente (${lastError?.message || 'error de conexión'}). Por favor, inténtalo de nuevo en unos momentos.`;
};
