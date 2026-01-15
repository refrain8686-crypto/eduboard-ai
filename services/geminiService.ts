
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

let ai: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenerativeAI(GEMINI_API_KEY);
}

export const analyzeWhiteboard = async (base64Image: string) => {
  if (!ai) {
    return "El Tutor IA no está configurado. Por favor, añade tu VITE_GEMINI_API_KEY al archivo .env.local.";
  }
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      "Analiza el contenido de esta pizarra. Si hay problemas matemáticos, resuélvelos paso a paso. Si hay dibujos o diagramas, explica qué son. Sé conciso y amable como un tutor educativo. Responde en español.",
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image.split(',')[1],
        },
      },
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Lo siento, hubo un error al analizar la pizarra. Por favor, inténtalo de nuevo.";
  }
};
