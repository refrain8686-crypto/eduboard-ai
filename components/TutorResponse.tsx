import React from 'react';

interface TutorResponseProps {
  content: string;
}

// Limpia cualquier residuo de código LaTeX a símbolos amigables Unicode
export const cleanMathText = (raw: string): string => {
  if (!raw) return '';
  let s = raw;

  // Fracciones: \frac{a}{b} -> a/b
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');

  // Raíces: \sqrt[n]{x} -> n√(x), \sqrt{x} -> √(x)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Operadores matemáticos
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\div/g, '÷');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\leq?/g, '≤');
  s = s.replace(/\\geq?/g, '≥');
  s = s.replace(/\\infty/g, '∞');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');

  // Potencias comunes
  s = s.replace(/\^2\b|\^\{2\}/g, '²');
  s = s.replace(/\^3\b|\^\{3\}/g, '³');
  s = s.replace(/\^0\b|\^\{0\}/g, '⁰');
  s = s.replace(/\^1\b|\^\{1\}/g, '¹');
  s = s.replace(/\^4\b|\^\{4\}/g, '⁴');
  s = s.replace(/\^5\b|\^\{5\}/g, '⁵');
  s = s.replace(/\^n\b|\^\{n\}/g, 'ⁿ');

  // Eliminar signos de dólar $ y $$
  s = s.replace(/\$\$([^\$]+)\$\$/g, '$1');
  s = s.replace(/\$([^\$]+)\$/g, '$1');

  // Limpiar barras invertidas sueltas antes de letras
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s;
};

// Formatea texto inline como negrita, cursiva o código
export const renderInline = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-gray-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono border border-indigo-100">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const TutorResponse: React.FC<TutorResponseProps> = ({ content }) => {
  if (!content) return null;

  const cleaned = cleanMathText(content);
  const rawLines = cleaned.split('\n');

  return (
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
      {rawLines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Encabezados: ###, ##, #
        if (trimmed.startsWith('#')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <div key={idx} className="pt-2 pb-1 border-b border-indigo-100">
              <h3 className="text-sm md:text-base font-extrabold text-indigo-900 flex items-center gap-2">
                {renderInline(headerText)}
              </h3>
            </div>
          );
        }

        // Resaltado de resultado final
        if (
          trimmed.includes('Resultado final') ||
          trimmed.includes('Respuesta:') ||
          trimmed.includes('Solución:') ||
          trimmed.startsWith('🎯')
        ) {
          return (
            <div
              key={idx}
              className="my-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl shadow-sm flex items-center gap-2.5 text-emerald-900"
            >
              <span className="text-xl">🎯</span>
              <div className="text-xs md:text-sm font-bold">
                {renderInline(trimmed.replace(/^🎯\s*/, ''))}
              </div>
            </div>
          );
        }

        // Pasos enumerados: 1., 2., 3., etc.
        const stepMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (stepMatch) {
          const stepNum = stepMatch[1];
          const stepText = stepMatch[2];
          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 bg-indigo-50/50 hover:bg-indigo-50/80 rounded-2xl border border-indigo-100/70 transition-all shadow-sm"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                {stepNum}
              </div>
              <div className="flex-1 text-gray-800 text-xs md:text-sm leading-snug">
                {renderInline(stepText)}
              </div>
            </div>
          );
        }

        // Viñetas: - o *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 text-gray-700">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              <div className="flex-1 text-xs md:text-sm">{renderInline(trimmed.slice(2))}</div>
            </div>
          );
        }

        // Bloque de fórmula o ecuación destacada
        const isEquation =
          (trimmed.includes('=') || trimmed.includes('√') || trimmed.includes('→')) &&
          trimmed.length < 60 &&
          !trimmed.includes('Queremos') &&
          !trimmed.includes('sabemos') &&
          !trimmed.includes('Por lo tanto');

        if (isEquation) {
          return (
            <div
              key={idx}
              className="my-2 py-2 px-3 bg-white border border-indigo-200/80 rounded-xl shadow-sm text-center font-semibold text-indigo-900 text-sm tracking-wide"
            >
              {renderInline(trimmed)}
            </div>
          );
        }

        // Párrafo normal
        return (
          <p key={idx} className="text-gray-700 text-xs md:text-sm">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export default TutorResponse;
