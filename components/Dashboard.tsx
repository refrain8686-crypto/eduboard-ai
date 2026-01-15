
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ExternalLink, Calendar, LayoutGrid, LogIn, LogOut, Mail, Lock } from 'lucide-react';
import { generateRoomId } from '../utils/room';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

interface SavedBoard {
    id: string;
    name: string;
    createdAt: number;
    lastModified: number;
    ownerEmail?: string;
}

interface DashboardProps {
    onJoinRoom: (roomId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onJoinRoom }) => {
    const [boards, setBoards] = useState<SavedBoard[]>([]);
    const [newBoardName, setNewBoardName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('eduboard_boards');
        if (saved) {
            setBoards(JSON.parse(saved));
        }
    }, []);

    const saveBoards = (newBoards: SavedBoard[]) => {
        setBoards(newBoards);
        localStorage.setItem('eduboard_boards', JSON.stringify(newBoards));
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Registro exitoso! Ya puedes iniciar sesión.');
                setIsSignUp(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setAuthError(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        setAuthError(null);
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
        } catch (error: any) {
            setAuthError(error.message);
        }
    };


    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleCreateBoard = () => {
        if (!newBoardName.trim()) return;

        const newBoard: SavedBoard = {
            id: generateRoomId(),
            name: newBoardName,
            createdAt: Date.now(),
            lastModified: Date.now(),
            ownerEmail: user?.email
        };

        saveBoards([newBoard, ...boards]);
        setNewBoardName('');
        setIsCreating(false);
        onJoinRoom(newBoard.id);
    };

    const handleDeleteBoard = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de que quieres borrar esta pizarra?')) {
            saveBoards(boards.filter(b => b.id !== id));
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div></div>;
    }

    // Si no hay usuario, mostrar Landing con Login (Alternativa Correo)
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md w-full">
                    <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform rotate-3">
                        <LayoutGrid className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">EduBoard <span className="text-indigo-600">AI</span></h1>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Tu pizarra colaborativa inteligente.
                    </p>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {authError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                    {authError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-bold text-lg"
                            >
                                {isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
                            </button>
                        </form>

                        <div className="mt-6 flex flex-col gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">O continúa con</span></div>
                            </div>

                            <button
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all font-bold"
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                                <span>Google</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-bold mt-2"
                            >
                                {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate gratis'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">Mis Pizarras</h1>
                        </div>
                        <p className="text-gray-500">Bienvenido, <span className="font-bold text-indigo-600">{user.email}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-bold"
                        >
                            <Plus size={20} /> Nueva Pizarra
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-3 bg-white text-gray-500 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-500 transition-all"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {isCreating && (
                    <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in slide-in-from-top-4">
                        <h3 className="text-lg font-bold mb-4">Crear Nueva Pizarra</h3>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newBoardName}
                                onChange={(e) => setNewBoardName(e.target.value)}
                                placeholder="Nombre de la clase o tema..."
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                            />
                            <button
                                onClick={handleCreateBoard}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold"
                            >
                                Crear
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boards.map(board => (
                        <div
                            key={board.id}
                            onClick={() => onJoinRoom(board.id)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={(e) => handleDeleteBoard(board.id, e)}
                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                    title="Borrar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                                {board.name}
                            </h2>
                            <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} /> {new Date(board.createdAt).toLocaleDateString()}
                                </span>
                                {board.ownerEmail && (
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Admin</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {boards.length === 0 && !isCreating && (
                        <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <p>No tienes pizarras guardadas. ¡Crea una nueva para empezar!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
