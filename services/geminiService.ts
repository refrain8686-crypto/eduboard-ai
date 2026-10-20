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

  const prompt = `Actúa como un tutor educativo de matemáticas y ciencias para estudiantes.
Analiza con atención el contenido de la pizarra (problemas, ejercicios, dibujos o diagramas).

REGLAS DE FORMATO ESCOLARES (MUY IMPORTANTE):
1. NO uses código LaTeX crudo (NUNCA uses barras invertidas ni signos de dólar como $\\sqrt{x}$, $$\\frac{a}{b}$$, \\times, \\div, etc.). Para los alumnos es muy difícil de leer y se ve confuso.
2. Escribe todos los símbolos matemáticos directamente en caracteres legibles de texto plano y Unicode:
   - Usa '√' para raíces: por ejemplo, √(9), √(3²).
   - Usa potencias legibles: 3², x³, y⁴.
   - Usa '×' para multiplicación y '÷' o '/' para división.
   - Usa '=', '≠', '≈', '±', '≤', '≥'.
   - Para fracciones escribe: (numerador / denominador).
3. Estructura la explicación paso a paso con números (1., 2., 3.):
   - En cada paso pon un título en negrita (ej: 1. **Planteamiento:** explicación...).
4. Si hay una respuesta final, resáltala claramente al final con:
   🎯 **Resultado final:** [respuesta]
5. Usa un tono motivador, amable, claro y pedagógico. Responde siempre en español.`;

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
