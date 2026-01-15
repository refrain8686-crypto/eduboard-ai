
import React, { useState, useEffect, useRef } from 'react';
import Whiteboard from './components/Whiteboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { User } from './types';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const whiteboardRef = useRef<any>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Basic room routing using location hash
    const checkHash = () => {
      const hash = window.location.hash.replace('#', '');
      setRoomId(hash); // Empty hash means dashboard
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  useEffect(() => {
    // Assign a random identity for this session if not exists
    if (!currentUser) {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
      setCurrentUser({
        id: Math.random().toString(36).substring(7),
        name: `Usuario ${Math.floor(Math.random() * 100)}`,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Force an update once the ref might be attached
    setTimeout(() => forceUpdate({}), 500);
  }, [currentUser]);

  const handleJoinRoom = (id: string) => {
    window.location.hash = id;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('¡Enlace de la sala copiado! Compártelo con tu estudiante.');
  };

  // Loading state only for user
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Dashboard View
  if (!roomId) {
    return <Dashboard onJoinRoom={handleJoinRoom} />;
  }

  // Whiteboard View
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        roomId={roomId}
        onCopyLink={handleCopyLink}
        user={currentUser}
      />
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          undo={() => whiteboardRef.current?.undo()}
          redo={() => whiteboardRef.current?.redo()}
          deleteSelection={() => whiteboardRef.current?.deleteSelection()}
        />
        <main className="flex-1 bg-white relative">
          <Whiteboard ref={whiteboardRef} user={currentUser} roomId={roomId} />
        </main>
      </div>
    </div>
  );
};

export default App;
