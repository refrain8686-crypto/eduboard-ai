import React, { useState } from 'react';
import { Share2, Users, Monitor, ZoomIn, ZoomOut, Maximize, LayoutGrid, Cast, Eye, X, Copy, Check } from 'lucide-react';
import { User } from '../types';
import { useWhiteboardStore } from '../store/whiteboardStore';

interface HeaderProps {
  roomId: string;
  onCopyLink?: () => void;
  user: User;
}

const Header: React.FC<HeaderProps> = ({ roomId, user }) => {
  const {
    scale, setScale, setOffset,
    isPresenter, setPresenterMode,
    isFollowing, setFollowMode
  } = useWhiteboardStore();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-20 shadow-sm relative">
      <div className="flex items-center space-x-4">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
          <Monitor className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-1">
            EduBoard <span className="text-indigo-600 font-black">AI</span>
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sala #{roomId}</p>
        </div>
      </div>

      {/* Pestaña de Zoom Central */}
      <div className="hidden sm:flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-2 py-1 gap-1 shadow-inner">
        <button
          onClick={() => setScale(scale - 0.1)}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
          title="Alejar"
        >
          <ZoomOut size={16} />
        </button>
        <div className="w-16 text-center text-[11px] font-black text-indigo-600 select-none">
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={() => setScale(scale + 0.1)}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
          title="Acercar"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
        <button
          onClick={handleResetView}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
          title="Restablecer vista"
        >
          <Maximize size={16} />
        </button>
      </div>

      {/* Collaboration Controls */}
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={() => setPresenterMode(!isPresenter)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${isPresenter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          title="Transmitir tu vista a los demás"
        >
          <Cast size={14} />
          {isPresenter ? 'Presentando' : 'Modo Presentador'}
        </button>

        <button
          onClick={() => setFollowMode(!isFollowing)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${isFollowing ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          title="Ver lo que ve el presentador"
          disabled={isPresenter}
        >
          <Eye size={14} />
          {isFollowing ? 'Siguiendo' : 'Seguir'}
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex -space-x-2 mr-2">
          <div
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: user.color }}
            title={`Tú: ${user.name}`}
          >
            {user.name.charAt(0)}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsShareOpen(!isShareOpen)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all text-xs font-bold shadow-sm ${isShareOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}
          >
            {isShareOpen ? <X size={14} /> : <Share2 size={14} />}
            <span className="hidden md:inline">{isShareOpen ? 'Cerrar' : 'Compartir'}</span>
          </button>

          {isShareOpen && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Invitar a Estudiantes</h3>
              <p className="text-xs text-gray-500 mb-4">Envía este enlace para que se unan a la pizarra en tiempo real.</p>

              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl mb-3 border border-gray-200">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="flex-1 bg-transparent text-xs text-gray-600 font-mono outline-none"
                />
                <button
                  onClick={handleCopy}
                  className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-white text-gray-500 hover:text-indigo-600 shadow-sm'}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              {isLocalhost && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 flex flex-col gap-1">
                  <strong>⚠️ Advertencia: Estás en modo Local</strong>
                  <p>Este enlace (localhost) solo funciona en tu computadora.</p>
                  <p>Para compartir con otros en internet, necesitas desplegar la aplicación (ej. Vercel, Netlify).</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => window.location.hash = ''}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-all text-xs font-bold shadow-sm"
          title="Volver al Inicio"
        >
          <LayoutGrid size={14} />
          <span className="hidden md:inline">Inicio</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
