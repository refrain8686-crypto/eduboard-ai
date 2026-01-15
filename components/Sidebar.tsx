
import React from 'react';
import {
  Pencil, Eraser, Square, Circle, Type, Trash2,
  Undo2, Redo2, Highlighter, Paintbrush, MousePointer2,
  ChevronRight, Triangle, ArrowRight, Star, Wand2
} from 'lucide-react';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { Tool } from '../types';

const Sidebar: React.FC<{ undo: () => void, redo: () => void, deleteSelection: () => void }> = (props) => {
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const {
    tool, setTool, color, setColor, toolWidths, setLineWidth,
    setFontSize, clearBoard, history, past, future,
    selectedIndices, setIsShapePickerOpen, isShapePickerOpen,
    isSmoothingEnabled, setIsSmoothingEnabled
  } = useWhiteboardStore();

  const { undo, redo, deleteSelection } = props;

  const selectedIndex = selectedIndices.length === 1 ? selectedIndices[0] : null;
  const selectedElement = selectedIndex !== null ? history[selectedIndex] : null;
  const isTextTool = tool === 'text' || selectedElement?.tool === 'text';
  const isShapeToolActive = ['rect', 'circle', 'triangle', 'arrow', 'star'].includes(tool);

  const colors = [
    '#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'
  ];

  const mainTools: { id: Tool; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Seleccionar' },
    { id: 'pencil', icon: Pencil, label: 'Lápiz' },
    { id: 'marker', icon: Paintbrush, label: 'Marcador' },
    { id: 'highlighter', icon: Highlighter, label: 'Resaltador' },
    { id: 'text', icon: Type, label: 'Texto' },
    { id: 'eraser', icon: Eraser, label: 'Borrador' },
  ];

  const currentLineWidth = selectedElement ? selectedElement.lineWidth : toolWidths[tool];

  return (
    <aside className="w-20 md:w-32 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4 z-20 shadow-xl overflow-y-auto scrollbar-hide">
      <div className="flex space-x-1">
        <button onClick={undo} disabled={past.length === 0} className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"><Undo2 size={16} /></button>
        <button onClick={redo} disabled={future.length === 0} className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"><Redo2 size={16} /></button>
      </div>

      <div className="w-16 h-[1px] bg-gray-100" />

      <div className="flex flex-col space-y-1.5 w-full px-2">
        {mainTools.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              setIsShapePickerOpen(false);
            }}
            className={`flex items-center justify-center p-3 rounded-xl transition-all ${tool === t.id ? 'bg-indigo-600 text-white shadow-md scale-105' : 'text-gray-400 hover:bg-gray-50'
              }`}
            title={t.label}
          >
            <t.icon size={20} />
          </button>
        ))}

        {/* Botón de Figuras */}
        <button
          onClick={() => setIsShapePickerOpen(!isShapePickerOpen)}
          className={`relative w-full flex items-center justify-center p-3 rounded-xl transition-all ${isShapeToolActive || isShapePickerOpen ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'text-gray-400 hover:bg-gray-50'
            }`}
          title="Figuras"
        >
          <Square size={20} />
          <div className={`absolute -right-1 bottom-1 w-2 h-2 rounded-full bg-indigo-600 transition-transform ${isShapePickerOpen ? 'scale-100' : 'scale-0'}`} />
        </button>

        <div className="h-[1px] bg-gray-100 mx-2 my-1" />

        {/* Botón de Suavizado de Trazo */}
        <button
          onClick={() => setIsSmoothingEnabled(!isSmoothingEnabled)}
          className={`w-full flex items-center justify-center p-3 rounded-xl transition-all ${isSmoothingEnabled ? 'bg-amber-100 text-amber-600 shadow-inner' : 'text-gray-300 hover:bg-gray-50'
            }`}
          title={isSmoothingEnabled ? "Suavizado Activo" : "Activar Suavizado"}
        >
          <Wand2 size={20} />
        </button>
      </div>

      <div className="w-16 h-[1px] bg-gray-100" />

      <div className="flex flex-col items-center space-y-1 w-full px-2">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Grosor</span>
        <input
          type="number" min="1" max="100"
          value={isTextTool && selectedElement ? (selectedElement.fontSize || 18) : currentLineWidth}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 1;
            if (isTextTool) setFontSize(val);
            else setLineWidth(val);
          }}
          className="w-16 text-xs p-1 bg-gray-50 border border-gray-200 rounded font-bold text-center text-indigo-600 outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>

      <div className="w-16 h-[1px] bg-gray-100" />

      <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-2xl">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white ring-2 ring-indigo-600 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col space-y-2 pb-2">
        <button onClick={() => setShowClearConfirm(true)} className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Limpiar todo"><Trash2 size={20} /></button>
      </div>

      {/* Modal de Confirmación de Limpieza */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-[320px] flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300 mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-red-50 p-4 rounded-2xl">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">¿Borrar todo?</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Esta acción eliminará todos los elementos de la pizarra. Podrás deshacerlo después si te arrepientes.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => {
                  clearBoard();
                  setShowClearConfirm(false);
                }}
                className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-red-600 active:scale-95 transition-all"
              >
                Sí, borrar pizarra
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
