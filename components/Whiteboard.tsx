
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { Point, User, DrawStep, Tool } from '../types';
import { supabase } from '../supabaseClient';
import {
  Sparkles, BrainCircuit, PanelRightClose, Trash2,
  Bold, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette,
  Minus, Plus, Square, Circle, Triangle, ArrowRight, Star, X,
  ChevronsUp, ChevronUp, ChevronDown, ChevronsDown,
  Copy, Scissors, ClipboardPaste, Layers, Group, Ungroup, Monitor
} from 'lucide-react';
import { analyzeWhiteboard } from '../services/geminiService';

interface WhiteboardProps { user: User; roomId: string; }

const Whiteboard = React.forwardRef<any, WhiteboardProps>((props, ref) => {
  const { user, roomId } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tool = useWhiteboardStore(s => s.tool);
  const setTool = useWhiteboardStore(s => s.setTool);
  const color = useWhiteboardStore(s => s.color);
  const setColor = useWhiteboardStore(s => s.setColor);
  const toolWidths = useWhiteboardStore(s => s.toolWidths);
  const fontSize = useWhiteboardStore(s => s.fontSize);
  const setFontSize = useWhiteboardStore(s => s.setFontSize);
  const scale = useWhiteboardStore(s => s.scale);
  const setScale = useWhiteboardStore(s => s.setScale);
  const offset = useWhiteboardStore(s => s.offset);
  const setOffset = useWhiteboardStore(s => s.setOffset);
  const addStep = useWhiteboardStore(s => s.addStep);
  const updateStep = useWhiteboardStore(s => s.updateStep);
  const deleteSelection = useWhiteboardStore(s => s.deleteSelection);
  const undo = useWhiteboardStore(s => s.undo);
  const redo = useWhiteboardStore(s => s.redo);
  const clearBoardLocal = useWhiteboardStore(s => s.clearBoard);
  const triggerRedraw = useWhiteboardStore(s => s.triggerRedraw);
  const history = useWhiteboardStore(s => s.history);
  const removeStep = useWhiteboardStore(s => s.removeStep);
  const selectedIndices = useWhiteboardStore(s => s.selectedIndices);
  const setSelection = useWhiteboardStore(s => s.setSelection);
  const toggleSelection = useWhiteboardStore(s => s.toggleSelection);
  const editingIndex = useWhiteboardStore(s => s.editingIndex);
  const setEditingIndex = useWhiteboardStore(s => s.setEditingIndex);
  const fontFamily = useWhiteboardStore(s => s.fontFamily);
  const setTextStyle = useWhiteboardStore(s => s.setTextStyle);
  const fontWeight = useWhiteboardStore(s => s.fontWeight);
  const textDecoration = useWhiteboardStore(s => s.textDecoration);
  const textAlign = useWhiteboardStore(s => s.textAlign);
  const isShapePickerOpen = useWhiteboardStore(s => s.isShapePickerOpen);
  const setIsShapePickerOpen = useWhiteboardStore(s => s.setIsShapePickerOpen);
  const isSmoothingEnabled = useWhiteboardStore(s => s.isSmoothingEnabled);
  const setHistory = useWhiteboardStore(s => s.setHistory);
  const users = useWhiteboardStore(s => s.users);
  const updateUserCursor = useWhiteboardStore(s => s.updateUserCursor);
  const moveSelectionToFront = useWhiteboardStore(s => s.moveSelectionToFront);
  const moveSelectionToBack = useWhiteboardStore(s => s.moveSelectionToBack);
  const moveSelectionForward = useWhiteboardStore(s => s.moveSelectionForward);
  const moveSelectionBackward = useWhiteboardStore(s => s.moveSelectionBackward);
  const copySelection = useWhiteboardStore(s => s.copySelection);
  const cutSelection = useWhiteboardStore(s => s.cutSelection);
  const paste = useWhiteboardStore(s => s.paste);
  const groupSelection = useWhiteboardStore(s => s.groupSelection);
  const ungroupSelection = useWhiteboardStore(s => s.ungroupSelection);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [initialSelectedStep, setInitialSelectedStep] = useState<DrawStep | null>(null);

  const [textInput, setTextInput] = useState<{ x: number, y: number, w: number, h: number, value: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState<Point | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isFillPickerOpen, setIsFillPickerOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: Point, end: Point } | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [, forceUpdate] = useState({});

  const getPointsBox = useCallback((step: DrawStep) => {
    if (step.tool === 'text' || step.tool === 'image') {
      return { x1: step.points[0].x, y1: step.points[0].y, x2: step.points[0].x + (step.width || 200), y2: step.points[0].y + (step.height || 50) };
    }
    if (step.tool === 'group' && step.steps) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      step.steps.forEach(s => {
        const box = getPointsBox(s);
        minX = Math.min(minX, box.x1); minY = Math.min(minY, box.y1);
        maxX = Math.max(maxX, box.x2); maxY = Math.max(maxY, box.y2);
      });
      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
    }
    if (step.tool === 'circle') {
      const start = step.points[0];
      const end = step.points[step.points.length - 1];
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      return { x1: start.x - radius, y1: start.y - radius, x2: start.x + radius, y2: start.y + radius };
    }
    if (step.tool === 'star') {
      const start = step.points[0];
      const end = step.points[step.points.length - 1];
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      return { x1: start.x - radius, y1: start.y - radius, x2: start.x + radius, y2: start.y + radius };
    }
    const xs = step.points.map(p => p.x);
    const ys = step.points.map(p => p.y);
    return {
      x1: Math.min(...xs), y1: Math.min(...ys),
      x2: Math.max(...xs), y2: Math.max(...ys)
    };
  }, []);

  const getBoundingBox = useCallback((step: DrawStep) => {
    const box = getPointsBox(step);
    if (step.tool === 'text' || step.tool === 'group' || step.tool === 'image') return box;
    const margin = (step.lineWidth || 1);
    return {
      x1: box.x1 - margin, y1: box.y1 - margin,
      x2: box.x2 + margin, y2: box.y2 + margin
    };
  }, [getPointsBox]);

  const getGroupBoundingBox = useCallback(() => {
    if (selectedIndices.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedIndices.forEach(idx => {
      const step = history[idx];
      if (!step) return;
      const box = getBoundingBox(step);
      minX = Math.min(minX, box.x1); minY = Math.min(minY, box.y1);
      maxX = Math.max(maxX, box.x2); maxY = Math.max(maxY, box.y2);
    });
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }, [selectedIndices, history, getBoundingBox]);

  const selectedBox = getGroupBoundingBox();

  // --- Helpers for Synchronization ---
  const [isSubscribed, setIsSubscribed] = useState(false);

  const broadcast = useCallback((event: string, payload: any) => {
    const channel = (window as any).currentChannel;
    if (channel) {
      console.log(`[Sync] Broadcasting event "${event}":`, payload);
      channel.send({
        type: 'broadcast',
        event,
        payload: { ...payload, senderId: user.id }
      }).then((resp: any) => {
        if (resp === 'error' || resp?.error) console.error(`[Sync] Broadcast error (${event}):`, resp);
        else if (event !== 'cursor') console.log(`[Sync] Broadcast success (${event})`);
      });
    } else {
      console.warn('[Sync] Cannot broadcast, channel not available');
    }
  }, [user.id]);

  const finalizeText = useCallback(() => {
    if (textInput) {
      if (editingIndex !== null) {
        updateStep(editingIndex, { ...history[editingIndex], text: textInput.value, width: textInput.w, height: textInput.h });
      } else if (textInput.value.trim()) {
        addStep({
          tool: 'text', points: [{ x: textInput.x, y: textInput.y }], color, lineWidth: 1, fontSize, text: textInput.value, width: textInput.w, height: textInput.h,
          fontFamily, fontWeight, textDecoration, textAlign
        });
      }
    }
    setTextInput(null);
    setEditingIndex(null);
  }, [textInput, editingIndex, history, updateStep, addStep, color, fontSize, fontFamily, fontWeight, textDecoration, textAlign]);

  // Restore derived state for properties panel compatibility
  const selectedIndex = selectedIndices.length === 1 ? selectedIndices[0] : null;
  const selectedStep = selectedIndex !== null ? history[selectedIndex] : null;
  const isSelectedText = selectedStep?.tool === 'text';

  const undoWrapped = useCallback(() => {
    undo();
    setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
  }, [undo, broadcast]);

  const redoWrapped = useCallback(() => {
    redo();
    setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
  }, [redo, broadcast]);

  const deleteSelectionWrapped = useCallback(() => {
    const currentHistory = useWhiteboardStore.getState().history;
    const idsToDelete = selectedIndices
      .map(idx => currentHistory[idx]?.id)
      .filter((id): id is string => !!id);

    if (idsToDelete.length > 0) {
      supabase.from('whiteboard_history')
        .delete()
        .in('id', idsToDelete)
        .then(({ error }) => {
          if (error) console.error("Error deleting from DB:", error);
        });
    }

    deleteSelection();
    setTimeout(() => {
      broadcast('sync_history', { history: useWhiteboardStore.getState().history });
    }, 50);
  }, [deleteSelection, broadcast, selectedIndices]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !textInput) {
        setIsSpacePressed(true);
        if (e.target === document.body) e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') copySelection();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        // Handle via paste event
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') cutSelection();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redoWrapped();
        else undoWrapped();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!textInput && selectedIndices.length > 0) deleteSelectionWrapped();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [textInput, selectedIndices, deleteSelectionWrapped, copySelection, paste, cutSelection, undoWrapped, redoWrapped]);

  useImperativeHandle(ref, () => ({
    undo: undoWrapped,
    redo: redoWrapped,
    deleteSelection: deleteSelectionWrapped
  }));

  const clearBoard = useCallback(() => {
    clearBoardLocal();
    broadcast('board_cleared', {});
    supabase.from('whiteboard_history').delete().eq('room_id', roomId).then(({ error }) => {
      if (error) console.error("Error clearing DB:", error);
    });
  }, [clearBoardLocal, broadcast, roomId]);

  // --- Initial Load & Presenter Mode (Follow Me) ---
  const isPresenter = useWhiteboardStore(s => s.isPresenter);
  const isFollowing = useWhiteboardStore(s => s.isFollowing);
  const setIsAdmin = useWhiteboardStore(s => s.setIsAdmin);

  // Live Paths for Real-Time Drawing (Double Layer Strategy - Layer 1)
  const [livePaths, setLivePaths] = useState<Record<string, DrawStep>>({});
  const lastBroadcastRef = useRef<number>(0);

  useEffect(() => {
    // 1. Initial Load from DB (Persistence/Restore) & Ownership Check
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('whiteboard_history')
        .select('id, step_data')
        .eq('room_id', roomId)
        .order('id', { ascending: true });

      if (error) {
        console.error("Error loading history:", error);
      } else if (data && data.length > 0) {
        const fullHistory = data.map(item => ({
          ...(item.step_data as any),
          id: item.id?.toString() // Ensure we have the DB ID
        }));

        // Check for ownership claim
        const claimStep = fullHistory.find((s: any) => s.type === 'OWNERSHIP_CLAIM');
        if (claimStep && user.email) {
          if (claimStep.ownerEmail === user.email) {
            console.log("You are the owner of this board.");
            setIsAdmin(true);
          } else {
            console.log("You are a student/viewer.");
            setIsAdmin(false);
          }
        }
        // If no claim exists and I am logged in, I claim it! (First user logic)
        else if (!claimStep && user.email) {
          console.log("No owner found. Claiming ownership for", user.email);
          const claim = { type: 'OWNERSHIP_CLAIM', ownerEmail: user.email };
          await supabase.from('whiteboard_history').insert({
            room_id: roomId,
            step_data: claim,
            user_id: user.id
          });
          setIsAdmin(true);
        }

        // Filter out system steps from visual history
        const visualHistory = fullHistory.filter((s: any) => s.type !== 'OWNERSHIP_CLAIM');
        setHistory(visualHistory);
      } else if (data && data.length === 0 && user.email) {
        // Empty board, claim it immediately
        console.log("Empty board. Claiming ownership for", user.email);
        const claim = { type: 'OWNERSHIP_CLAIM', ownerEmail: user.email };
        await supabase.from('whiteboard_history').insert({
          room_id: roomId,
          step_data: claim,
          user_id: user.id
        });
        setIsAdmin(true);
      }
    };

    fetchHistory();
  }, [roomId, setHistory, user.email, user.id, setIsAdmin]);

  // 2. Presenter Logic (Broadcast Viewport)
  useEffect(() => {
    if (isPresenter) {
      broadcast('viewport_sync', { scale, offset, senderId: user.id });
    }
  }, [isPresenter, scale, offset, broadcast, user.id]);

  const isPointInBox = (p: Point, box: { x1: number, y1: number, x2: number, y2: number }) => (
    p.x >= box.x1 && p.x <= box.x2 && p.y >= box.y1 && p.y <= box.y2
  );

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const drawStep = useCallback((ctx: CanvasRenderingContext2D, step: DrawStep) => {
    ctx.save();

    // Apply transformations (Rotation and Flipping)
    const box = getPointsBox(step);
    const centerX = (box.x1 + box.x2) / 2;
    const centerY = (box.y1 + box.y2) / 2;

    ctx.translate(centerX, centerY);
    if (step.rotation) ctx.rotate((step.rotation * Math.PI) / 180);
    if (step.flipX || step.flipY) ctx.scale(step.flipX ? -1 : 1, step.flipY ? -1 : 1);
    ctx.translate(-centerX, -centerY);

    ctx.strokeStyle = step.tool === 'eraser' ? '#ffffff' : step.color;
    ctx.fillStyle = step.color;
    ctx.lineWidth = step.lineWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (step.tool === 'highlighter') {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = step.lineWidth * 2.5;
    } else if (step.tool === 'marker') {
      ctx.lineWidth = step.lineWidth * 1.8;
      ctx.globalAlpha = 0.9;
    }

    if (step.points.length === 0) { ctx.restore(); return; }

    if (step.tool === 'group' && step.steps) {
      step.steps.forEach(s => drawStep(ctx, s));
      ctx.restore();
      return;
    }

    if (step.strokeDash) {
      ctx.setLineDash(step.strokeDash.map(d => d * step.lineWidth));
    }

    if (step.shadow) {
      ctx.shadowColor = step.shadow.color;
      ctx.shadowBlur = step.shadow.blur;
      ctx.shadowOffsetX = step.shadow.offsetX;
      ctx.shadowOffsetY = step.shadow.offsetY;
    }

    const points = step.points;
    const start = points[0];
    const end = points[points.length - 1];

    if (['pencil', 'eraser', 'highlighter', 'marker'].includes(step.tool)) {
      if (points.length < 2) {
        ctx.beginPath();
        ctx.arc(start.x, start.y, step.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        // Algoritmo de suavizado con curvas de Bezier
        for (let i = 1; i < points.length - 2; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        // Curva final para los últimos dos puntos
        if (points.length > 2) {
          ctx.quadraticCurveTo(
            points[points.length - 2].x,
            points[points.length - 2].y,
            points[points.length - 1].x,
            points[points.length - 1].y
          );
        } else {
          ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        }
        ctx.stroke();
      }
    } else if (step.tool === 'rect') {
      const w = end.x - start.x;
      const h = end.y - start.y;
      ctx.beginPath();
      if (step.borderRadius) {
        ctx.roundRect(start.x, start.y, w, h, step.borderRadius);
      } else {
        ctx.rect(start.x, start.y, w, h);
      }
      if (step.fillColor) {
        ctx.fillStyle = step.fillColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }
      ctx.stroke();
    } else if (step.tool === 'circle') {
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      ctx.beginPath(); ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      if (step.fillColor) {
        ctx.fillStyle = step.fillColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }
      ctx.stroke();
    } else if (step.tool === 'triangle') {
      ctx.beginPath(); ctx.moveTo(start.x + (end.x - start.x) / 2, start.y);
      ctx.lineTo(start.x, end.y); ctx.lineTo(end.x, end.y); ctx.closePath();
      if (step.fillColor) {
        ctx.fillStyle = step.fillColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }
      ctx.stroke();
    } else if (step.tool === 'arrow') {
      // Las flechas usualmente no tienen relleno simple, pero si se quisiera:
      const headlen = 15;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (step.tool === 'star') {
      const outerRadius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      const innerRadius = outerRadius / 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        ctx.lineTo(start.x + r * Math.cos(a), start.y + r * Math.sin(a));
      }
      ctx.closePath();
      if (step.fillColor) {
        ctx.fillStyle = step.fillColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }
      ctx.stroke();
    } else if (step.tool === 'text' && step.text) {
      const fSize = step.fontSize || 18;
      ctx.font = `${step.fontWeight || 'normal'} ${fSize}px ${step.fontFamily || 'Inter, sans-serif'}`;
      ctx.textBaseline = 'top';
      const maxWidth = step.width || 200;
      const align = step.textAlign || 'left';
      ctx.textAlign = align === 'justify' ? 'left' : align;
      const sourceLines = step.text.split('\n');
      let yOffset = 0;
      sourceLines.forEach(rawLine => {
        const wrappedLines = wrapText(ctx, rawLine, maxWidth);
        wrappedLines.forEach(line => {
          let xPos = step.points[0].x;
          if (align === 'center') xPos += maxWidth / 2;
          else if (align === 'right') xPos += maxWidth;
          ctx.fillText(line, xPos, step.points[0].y + yOffset);
          if (step.textDecoration === 'underline') {
            const metrics = ctx.measureText(line);
            const lineY = step.points[0].y + yOffset + fSize + 2;
            ctx.beginPath();
            let lineStart = xPos;
            if (align === 'center') lineStart -= metrics.width / 2;
            else if (align === 'right') lineStart -= metrics.width;
            ctx.moveTo(lineStart, lineY); ctx.lineTo(lineStart + metrics.width, lineY); ctx.stroke();
          }
          yOffset += fSize * 1.3;
        });
      });
    } else if (step.tool === 'image' && step.imageData) {
      const img = imageCache.current[step.imageData];
      if (!img) {
        const newImg = new Image();
        newImg.src = step.imageData;
        newImg.onload = () => {
          imageCache.current[step.imageData!] = newImg;
          forceUpdate({});
        };
      } else if (img.complete) {
        ctx.drawImage(img, start.x, start.y, step.width || img.width, step.height || img.height);
      }
    }
    ctx.restore();
  }, [getPointsBox]);

  const drawSelectionBox = useCallback((ctx: CanvasRenderingContext2D, step: DrawStep) => {
    // This legacy function is updated to handle the global selection box
    // We will use a separate effect or draw call for the group box
  }, []); // Deprecated in favor of drawing the group box directly in redrawFullBoard if needed, or keeping it simple.

  // New function to draw box around all selected items
  const drawGroupSelectionBox = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!selectedBox) return;
    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([5 / scale, 5 / scale]);
    ctx.strokeRect(selectedBox.x1 - 4, selectedBox.y1 - 4, (selectedBox.x2 - selectedBox.x1) + 8, (selectedBox.y2 - selectedBox.y1) + 8);

    // Only show resize handles if single item selected (for simplicity initially) or allow scaling group
    if (selectedIndices.length === 1) {
      ctx.setLineDash([]);
      ctx.fillStyle = '#6366f1';
      ctx.strokeStyle = '#ffffff';
      const handleSize = 8 / scale;
      const box = selectedBox;
      const handles = [
        { x: box.x1, y: box.y1 }, { x: (box.x1 + box.x2) / 2, y: box.y1 }, { x: box.x2, y: box.y1 },
        { x: box.x2, y: (box.y1 + box.y2) / 2 }, { x: box.x2, y: box.y2 }, { x: (box.x1 + box.x2) / 2, y: box.y2 },
        { x: box.x1, y: box.y2 }, { x: box.x1, y: (box.y1 + box.y2) / 2 },
        // Rotation handle
        { id: 'rot', x: (box.x1 + box.x2) / 2, y: box.y1 - 30 / scale }
      ];
      handles.forEach(h => {
        if (h.id === 'rot') {
          ctx.beginPath();
          ctx.moveTo(h.x, h.y + 30 / scale);
          ctx.lineTo(h.x, h.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(h.x, h.y, 5 / scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        }
      });
    }
    ctx.restore();
  }, [selectedBox, scale, selectedIndices]);

  const redrawFullBoard = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pixelRatio = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.scale(pixelRatio * scale, pixelRatio * scale);
    ctx.translate(offset.x, offset.y);

    history.forEach((step, idx) => {
      // Don't draw selection box here, draw it after
      if (idx === editingIndex) return;
      drawStep(ctx, step);
    });

    // Draw Live Paths (Remote Users)
    Object.values(livePaths).forEach(step => {
      drawStep(ctx, step);
    });

    // Draw selection overlay
    if (selectedIndices.length > 0) {
      drawGroupSelectionBox(ctx);
    }
    // Draw drag selection box
    if (selectionBox) {
      ctx.save();
      ctx.strokeStyle = '#0066ff';
      ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
      ctx.lineWidth = 1 / scale;
      const w = selectionBox.end.x - selectionBox.start.x;
      const h = selectionBox.end.y - selectionBox.start.y;
      ctx.fillRect(selectionBox.start.x, selectionBox.start.y, w, h);
      ctx.strokeRect(selectionBox.start.x, selectionBox.start.y, w, h);
      ctx.restore();
    }
  }, [history, drawStep, drawGroupSelectionBox, selectedIndices, editingIndex, scale, offset, selectionBox, livePaths]);


  useEffect(() => {
    const canvas = canvasRef.current; const tempCanvas = tempCanvasRef.current; if (!canvas || !tempCanvas) return;
    const resize = () => {
      const parent = canvas.parentElement!;
      const { width, height } = parent.getBoundingClientRect();
      const pr = window.devicePixelRatio || 1;
      [canvas, tempCanvas].forEach(c => {
        c.width = width * pr; c.height = height * pr;
        c.style.width = `${width}px`; c.style.height = `${height}px`;
      });
      redrawFullBoard();
    };
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [triggerRedraw, redrawFullBoard, scale, offset]);

  useEffect(() => { redrawFullBoard(); }, [history, redrawFullBoard, selectedIndex, editingIndex, scale, offset, livePaths]);

  const getPos = (e: React.PointerEvent | React.MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale - offset.x,
      y: (e.clientY - rect.top) / scale - offset.y
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSpacePressed) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getPos(e);
    if (textInput) { finalizeText(); return; }

    // Check for resize handles on the selection box (single item only for now)
    if (selectedIndices.length === 1 && selectedBox) {
      const box = selectedBox;
      const handleSize = 10 / scale;
      const handles = [
        { id: 'tl', x: box.x1, y: box.y1 }, { id: 't', x: (box.x1 + box.x2) / 2, y: box.y1 }, { id: 'tr', x: box.x2, y: box.y1 },
        { id: 'r', x: box.x2, y: (box.y1 + box.y2) / 2 }, { id: 'br', x: box.x2, y: box.y2 }, { id: 'b', x: (box.x1 + box.x2) / 2, y: box.y2 },
        { id: 'bl', x: box.x1, y: box.y2 }, { id: 'l', x: box.x1, y: (box.y1 + box.y2) / 2 },
        { id: 'rot', x: (box.x1 + box.x2) / 2, y: box.y1 - 30 / scale }
      ];
      const clickedHandle = handles.find(h =>
        pos.x >= h.x - handleSize && pos.x <= h.x + handleSize &&
        pos.y >= h.y - handleSize && pos.y <= h.y + handleSize
      );
      if (clickedHandle) {
        setIsResizing(true);
        setDragHandle(clickedHandle.id);
        setStartPoint(pos);
        const step = history[selectedIndices[0]];
        setInitialSelectedStep({ ...step, points: step.points.map(p => ({ ...p })) });
        return;
      }
    }

    const hitIndex = history.findLastIndex(step => isPointInBox(pos, getBoundingBox(step)));

    if ((tool as string) === 'select') {
      if (hitIndex !== -1) {
        if (e.shiftKey) {
          toggleSelection(hitIndex);
        } else {
          if (!selectedIndices.includes(hitIndex)) {
            setSelection([hitIndex]);
          }
          setStartPoint(pos);
          setIsMoving(true);
          const step = history[hitIndex];
          setInitialSelectedStep({ ...step, points: step.points.map(p => ({ ...p })) });
        }
      } else {
        if (!e.shiftKey) setSelection([]);
        setSelectionBox({ start: pos, end: pos });
      }
      return;
    }

    // Other tools
    setSelection([]);
    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentPoints([pos]);
  };


  useEffect(() => {
    if (!roomId || !user.id) return;

    const channel = supabase.channel(roomId, {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    channel
      .on('broadcast', { event: 'step_added' }, (payload) => {
        if (payload.payload.senderId === user.id) return;
        console.log("[Sync] Received step_added:", payload.payload.step);
        addStep(payload.payload.step);
        // Clear live path for this user as it's now finalized
        setLivePaths(prev => {
          const next = { ...prev };
          delete next[payload.payload.senderId];
          return next;
        });
      })
      .on('broadcast', { event: 'board_cleared' }, (payload) => {
        if (payload.payload.senderId === user.id) return;
        console.log("[Sync] Received board_cleared");
        clearBoardLocal();
      })
      .on('broadcast', { event: 'sync_history' }, (payload) => {
        if (payload.payload.senderId === user.id) return;
        console.log("[Sync] Received sync_history (length:", payload.payload.history.length, ")");
        setHistory(payload.payload.history);
      })
      .on('broadcast', { event: 'cursor' }, (payload) => {
        if (payload.payload.senderId === user.id) return;
        const { userId, x, y, name, color } = payload.payload;
        updateUserCursor(userId, { x, y, name, color });
      })
      // NEW: Listen for live drawing streams
      .on('broadcast', { event: 'drawing_stream' }, (payload) => {
        if (payload.payload.senderId === user.id) return;
        const { step } = payload.payload;
        setLivePaths(prev => ({
          ...prev,
          [payload.payload.senderId]: step
        }));
      })
      .on('broadcast', { event: 'viewport_sync' }, (payload) => {
        if (payload.payload.senderId === user.id) return;
        const { scale, offset } = payload.payload;
        const { isAdmin } = useWhiteboardStore.getState();
        // Auto-follow: if NOT admin, always sync.
        if (!isAdmin) {
          console.log("[Sync] Auto-following presenter:", scale, offset);
          setScale(scale);
          setOffset(offset);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence sync:', presenceState);
      })
      .subscribe(async (status) => {
        console.log(`Supabase Channel Status (${roomId}):`, status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          const trackResp = await channel.track({
            user_id: user.id,
            user_name: user.name,
            user_color: user.color,
            x: -1000,
            y: -1000
          });
          if ((trackResp as any).error) console.error("Supabase presence tracking error:", (trackResp as any).error);
        } else {
          setIsSubscribed(false);
        }
      });

    // Store channel for access in handlers
    (window as any).currentChannel = channel;

    return () => {
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user.id]); // Only re-run when room or user changes

  const handlePointerMove = (e: React.PointerEvent) => {
    const pos = getPos(e);
    setCursorPos(pos);

    // Broadcast logic with Throttle (16ms)
    const now = Date.now();
    if (now - lastBroadcastRef.current >= 16) {
      lastBroadcastRef.current = now;

      // 1. Cursor Broadcast
      broadcast('cursor', {
        userId: user.id,
        x: pos.x,
        y: pos.y,
        name: user.name,
        color: user.color
      });

      // 2. Live Drawing Stream Broadcast
      if (isDrawing && startPoint && ['pencil', 'eraser', 'highlighter', 'marker'].includes(tool)) {
        // Construct the transient step
        const liveStep: DrawStep = {
          tool: tool as Tool,
          points: [...currentPoints, pos],
          color: color,
          lineWidth: toolWidths[tool] || 3
        };
        broadcast('drawing_stream', { step: liveStep });
      }
    }

    if (isPanning && lastPanPos) {
      const dx = (e.clientX - lastPanPos.x) / scale;
      const dy = (e.clientY - lastPanPos.y) / scale;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }


    if ((isMoving || isResizing) && startPoint && selectedIndices.length > 0) {
      const dx = pos.x - startPoint.x;
      const dy = pos.y - startPoint.y;

      if (isMoving) {
        // Recursive helper to move steps and their children
        const moveStepRecursive = (step: DrawStep, dx: number, dy: number): DrawStep => {
          const updatedPoints = step.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          if (step.tool === 'group' && step.steps) {
            return {
              ...step,
              points: updatedPoints,
              steps: step.steps.map(s => moveStepRecursive(s, dx, dy))
            };
          }
          return { ...step, points: updatedPoints };
        };

        // Create updates for all selected items
        selectedIndices.forEach(idx => {
          const originalStep = history[idx];
          if (!originalStep) return;
          updateStep(idx, moveStepRecursive(originalStep, dx, dy));
        });
        setStartPoint(pos);
      } else if (isResizing && dragHandle && selectedIndex !== null && initialSelectedStep) {
        if (dragHandle === 'rot') {
          const box = getPointsBox(initialSelectedStep);
          const centerX = (box.x1 + box.x2) / 2;
          const centerY = (box.y1 + box.y2) / 2;
          const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
          const deg = (angle * 180) / Math.PI + 90;
          updateStep(selectedIndex, { ...initialSelectedStep, rotation: deg });
          return;
        }

        const updated = { ...initialSelectedStep };
        const { x1, y1, x2, y2 } = getPointsBox(initialSelectedStep);
        let newX1 = x1, newY1 = y1, newX2 = x2, newY2 = y2;

        if (dragHandle.includes('l')) newX1 += dx;
        if (dragHandle.includes('r')) newX2 += dx;
        if (dragHandle.includes('t')) newY1 += dy;
        if (dragHandle.includes('b')) newY2 += dy;

        if (newX1 > newX2) { const t = newX1; newX1 = newX2; newX2 = t; }
        if (newY1 > newY2) { const t = newY1; newY1 = newY2; newY2 = t; }

        if (updated.tool === 'text' || updated.tool === 'image') {
          updated.width = Math.max(20, newX2 - newX1);
          updated.height = Math.max(20, newY2 - newY1);
          if (dragHandle.includes('l')) updated.points[0].x = newX1;
          if (dragHandle.includes('t')) updated.points[0].y = newY1;
        } else {
          updated.points[0] = { x: newX1, y: newY1 };
          updated.points[updated.points.length - 1] = { x: newX2, y: newY2 };
        }
        updateStep(selectedIndex, updated);
      }
      return;
    }

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, end: pos });
      return;
    }

    if (!isDrawing || !startPoint) return;

    const tctx = tempCanvasRef.current!.getContext('2d')!;
    const pr = window.devicePixelRatio || 1;
    tctx.setTransform(pr * scale, 0, 0, pr * scale, 0, 0);
    tctx.clearRect(0, 0, tempCanvasRef.current!.width / scale, tempCanvasRef.current!.height / scale);
    tctx.translate(offset.x, offset.y);

    const currentToolWidth = toolWidths[tool];

    if (['pencil', 'eraser', 'highlighter', 'marker'].includes(tool)) {
      let finalPos = pos;

      // Aplicar filtro de suavizado de media móvil si está activado
      if (isSmoothingEnabled && currentPoints.length > 0) {
        const lastP = currentPoints[currentPoints.length - 1];
        const smoothingFactor = 0.35; // Cuanto menor sea, más suave pero con más "delay"
        finalPos = {
          x: lastP.x + (pos.x - lastP.x) * smoothingFactor,
          y: lastP.y + (pos.y - lastP.y) * smoothingFactor
        };
      }

      if (tool === 'eraser') {
        const eraserRadius = (toolWidths.eraser || 20) / 2;
        // Search for items to erase
        for (let i = history.length - 1; i >= 0; i--) {
          const step = history[i];
          if (!['pencil', 'marker', 'highlighter'].includes(step.tool)) continue;

          const box = getBoundingBox(step);
          // Quick bounding box check
          if (pos.x < box.x1 - eraserRadius || pos.x > box.x2 + eraserRadius ||
            pos.y < box.y1 - eraserRadius || pos.y > box.y2 + eraserRadius) {
            continue;
          }

          // Precise distance check to points
          const hit = step.points.some(p => {
            const dx = p.x - pos.x;
            const dy = p.y - pos.y;
            return Math.sqrt(dx * dx + dy * dy) < eraserRadius + (step.lineWidth / 2);
          });

          if (hit) {
            if (step.id) setDeletedIds(prev => [...prev, step.id!]);
            removeStep(i);
            break;
          }
        }
      }

      setCurrentPoints(prev => [...prev, finalPos]);
      drawStep(tctx, { tool, color, lineWidth: currentToolWidth, points: [...currentPoints, finalPos] });
    } else if (tool === 'text') {
      tctx.strokeStyle = '#6366f1'; tctx.setLineDash([5 / scale, 5 / scale]);
      tctx.strokeRect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
    } else {
      drawStep(tctx, { tool, color, lineWidth: currentToolWidth, points: [startPoint, pos] });
    }
  };

  const handlePointerUp = () => {
    if (isPanning) { setIsPanning(false); setLastPanPos(null); return; }
    if (isMoving || isResizing) {
      setIsMoving(false);
      setIsResizing(false);
      setDragHandle(null);
      setStartPoint(null);
      setInitialSelectedStep(null);

      // 2. Persist to DB (Persistence Layer)
      const currentHistory = useWhiteboardStore.getState().history;
      selectedIndices.forEach(idx => {
        const step = currentHistory[idx];
        if (step && step.id) {
          supabase.from('whiteboard_history')
            .update({ step_data: step })
            .eq('id', step.id)
            .then(({ error }) => {
              if (error) console.error("Error updating step:", error);
            });
        }
      });

      broadcast('sync_history', { history: currentHistory });
      return;
    }

    if (selectionBox) {
      // Finalize selection
      const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
      const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
      const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);
      const box = { x1, y1, x2, y2 };

      const newIndices: number[] = [];
      history.forEach((step, idx) => {
        const stepBox = getBoundingBox(step);
        // Intersects
        if (stepBox.x1 < x2 && stepBox.x2 > x1 && stepBox.y1 < y2 && stepBox.y2 > y1) {
          newIndices.push(idx);
        }
      });
      setSelection(newIndices);
      setSelectionBox(null);
      return;
    }

    if (!isDrawing || !startPoint) return;

    setIsDrawing(false);
    tempCanvasRef.current?.getContext('2d')?.clearRect(0, 0, tempCanvasRef.current!.width, tempCanvasRef.current!.height);

    const lastPos = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : startPoint!;
    const currentToolWidth = toolWidths[tool];

    if (tool === 'text') {
      if (editingIndex === null) {
        const dx = Math.abs(lastPos.x - startPoint.x);
        const dy = Math.abs(lastPos.y - startPoint.y);
        const w = dx < 10 ? 200 : dx;
        const h = dy < 10 ? 100 : dy;
        setTextInput({ x: Math.min(startPoint.x, lastPos.x), y: Math.min(startPoint.y, lastPos.y), w, h, value: '' });
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
    } else if ((tool as string) === 'eraser') {
      // 2. Persist to DB (Persistence Layer)
      if (deletedIds.length > 0) {
        supabase.from('whiteboard_history')
          .delete()
          .in('id', deletedIds)
          .then(({ error }) => {
            if (error) console.error("Error deleting steps:", error);
            setDeletedIds([]); // Clear the buffer
          });
      }
      broadcast('sync_history', { history: useWhiteboardStore.getState().history });
    } else {
      const newStep: DrawStep = {
        tool,
        points: ['pencil', 'eraser', 'highlighter', 'marker'].includes(tool) ? [...currentPoints] : [startPoint, lastPos],
        color: color,
        lineWidth: currentToolWidth
      };

      // 1. Add locally
      addStep(newStep);
      const index = useWhiteboardStore.getState().history.length - 1;

      // 2. Broadcast (Fluency Layer - finalized)
      broadcast('step_added', { step: newStep });

      // 3. Persist (Persistence Layer)
      supabase.from('whiteboard_history').insert({
        room_id: roomId,
        step_data: newStep,
        user_id: user.id
      }).select().then(({ data, error }) => {
        if (error) console.error("Error saving to DB:", error);
        if (data && data[0]) {
          // Update the local step with the real database ID
          const history = useWhiteboardStore.getState().history;
          const updatedStep = { ...history[index], id: data[0].id.toString() };
          // We use a internal setHistory to avoid pushing to past/future
          const newHistory = [...history];
          newHistory[index] = updatedStep;
          useWhiteboardStore.getState().setHistory(newHistory);
        }
      });
    }

    setStartPoint(null);
    setCurrentPoints([]);
  };

  const handlePointerLeave = () => {
    setCursorPos(null);
    handlePointerUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
    setOffset(prev => ({ x: prev.x - e.deltaX / scale, y: prev.y - e.deltaY / scale }));
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((tool as string) !== 'select') return;

    const pos = getPos(e);
    for (let i = history.length - 1; i >= 0; i--) {
      const step = history[i];
      if (isPointInBox(pos, getBoundingBox(step))) {
        setSelection([i]);
        setTool('select');
        if (step.tool === 'text') {
          setEditingIndex(i);
          setTextInput({ x: step.points[0].x, y: step.points[0].y, w: step.width || 200, h: step.height || 100, value: step.text || '' });
          setTimeout(() => textInputRef.current?.focus(), 50);
        }
        return;
      }
    }
  };

  const insertShape = (shapeType: Tool) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const centerX = (rect.width / 2) / scale - offset.x;
    const centerY = (rect.height / 2) / scale - offset.y;
    const size = 150;

    const currentLength = history.length;
    const newStep: DrawStep = {
      tool: shapeType,
      points: [
        { x: centerX - size / 2, y: centerY - size / 2 },
        { x: centerX + size / 2, y: centerY + size / 2 }
      ],
      color,
      lineWidth: toolWidths[shapeType] || 3
    };

    addStep(newStep);

    setTimeout(() => {
      setSelection([currentLength]);
      setTool('select');
    }, 50);

    setIsShapePickerOpen(false);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (!base64) return;

          const img = new Image();
          img.src = base64;
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            // Get center in board coordinates
            const centerX = (-offset.x + (rect.width / scale / 2));
            const centerY = (-offset.y + (rect.height / scale / 2));

            const newStep: DrawStep = {
              tool: 'image',
              points: [{ x: centerX - (img.width / 2), y: centerY - (img.height / 2) }],
              color: 'transparent',
              lineWidth: 1,
              imageData: base64,
              width: img.width,
              height: img.height
            };

            // Persist to Supabase and State
            (async () => {
              const { data, error } = await supabase
                .from('whiteboard_history')
                .insert({
                  room_id: roomId,
                  step_data: newStep,
                  user_id: user.id
                })
                .select();

              if (!error && data && data[0]) {
                const persistedStep = { ...newStep, id: data[0].id.toString() };
                const newIdx = useWhiteboardStore.getState().history.length;
                addStep(persistedStep);
                broadcast('step_added', { step: persistedStep });
                // Auto-select and tool change
                setTimeout(() => {
                  setSelection([newIdx]);
                  setTool('select');
                }, 50);
              } else {
                console.error("Error persisting image:", error);
                addStep(newStep);
                broadcast('step_added', { step: newStep });
              }
            })();
          };
        };
        reader.readAsDataURL(blob);
      }
    }
  }, [roomId, user.id, offset, scale, addStep, broadcast]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Cleanup redundant declarations
  const fonts = [
    { name: 'Inter, sans-serif', label: 'Inter' },
    { name: 'Roboto, sans-serif', label: 'Roboto' },
    { name: '"Playfair Display", serif', label: 'Playfair' },
    { name: '"Comic Neue", cursive', label: 'Comic' },
    { name: '"Courier Prime", monospace', label: 'Courier' },
    { name: 'Lobster, display', label: 'Lobster' },
  ];

  const colors = [
    '#000000', '#4b5563', '#9ca3af', '#ffffff',
    '#ef4444', '#f87171', '#fca5a5', '#fecaca',
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a',
    '#84cc16', '#a3e635', '#bef264', '#d9f99d',
    '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
    '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc',
    '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
    '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe',
    '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe',
    '#d946ef', '#e879f9', '#f0abfc', '#f5d0fe',
    '#f43f5e', '#fb7185', '#fda4af', '#fecdd3',
  ];

  const shapes = [
    { type: 'rect' as Tool, icon: Square, label: 'Rectángulo' },
    { type: 'circle' as Tool, icon: Circle, label: 'Círculo' },
    { type: 'triangle' as Tool, icon: Triangle, label: 'Triángulo' },
    { type: 'arrow' as Tool, icon: ArrowRight, label: 'Flecha' },
    { type: 'star' as Tool, icon: Star, label: 'Estrella' },
  ];

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      className={`w-full h-full relative bg-white select-none overflow-hidden flex ${isSpacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
      style={{ cursor: ['pencil', 'eraser', 'highlighter', 'marker'].includes(tool) ? 'none' : 'default' }}
    >
      {cursorPos && ['pencil', 'eraser', 'highlighter', 'marker'].includes(tool) && (
        <div
          className="pointer-events-none fixed z-50 rounded-full border border-gray-400/50"
          style={{
            left: (cursorPos.x + offset.x) * scale,
            top: (cursorPos.y + offset.y) * scale,
            width: toolWidths[tool] * scale,
            height: toolWidths[tool] * scale,
            transform: 'translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y)))',
            '--offset-x': `${containerRef.current?.getBoundingClientRect().left || 0}px`,
            '--offset-y': `${containerRef.current?.getBoundingClientRect().top || 0}px`,
            backgroundColor: tool === 'eraser' ? 'rgba(255,255,255,0.8)' : color,
            border: tool === 'eraser' ? '1px solid #000' : '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 0 5px rgba(0,0,0,0.2)'
          } as React.CSSProperties}
        />
      )}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: `${30 * scale}px ${30 * scale}px`,
          backgroundPosition: `${offset.x * scale}px ${offset.y * scale}px`
        }} />

        <canvas ref={canvasRef} className="absolute inset-0 z-0" />
        <canvas
          ref={tempCanvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="absolute inset-0 z-10"
        />

        {/* User Cursors */}
        {Object.entries(users).map(([id, u]) => (
          id !== user.id && (
            <div
              key={id}
              className="absolute pointer-events-none transition-all duration-75 z-50"
              style={{
                left: (u.x + offset.x) * scale,
                top: (u.y + offset.y) * scale,
                transform: 'translate(-2px, -2px)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.65376 12.3822L2.99991 3.14706L14.4539 8.61771L8.85049 8.95551L5.65376 12.3822Z" fill={u.color} stroke="white" strokeWidth="1.5" />
              </svg>
              <div
                className="ml-4 px-2 py-0.5 rounded text-[10px] whitespace-nowrap text-white font-medium shadow-sm"
                style={{ backgroundColor: u.color }}
              >
                {u.name}
              </div>
            </div>
          )
        ))}

        {/* CATÁLOGO DE FIGURAS */}
        {isShapePickerOpen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setIsShapePickerOpen(false)}>
            <div className="bg-[#1e1e1e] border border-gray-700 p-6 rounded-3xl shadow-2xl w-[350px] flex flex-col gap-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Square size={16} className="text-indigo-400" /> Insertar Figura
                </h3>
                <button onClick={() => setIsShapePickerOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {shapes.map((s) => (
                  <button key={s.type} onClick={() => insertShape(s.type)} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-800/50 border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 group transition-all">
                    <s.icon size={24} className="text-gray-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                    <span className="text-[11px] text-gray-400 font-bold uppercase group-hover:text-white transition-colors">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTÓN DE BORRAR OBJETO */}
        {selectedIndices.length > 0 && selectedBox && (
          <button
            onClick={(e) => { e.stopPropagation(); deleteSelectionWrapped(); }}
            className="absolute z-50 bg-red-500 text-white p-2.5 rounded-full shadow-2xl hover:bg-red-600 transition-all hover:scale-110 active:scale-90 border-2 border-white flex items-center justify-center"
            style={{
              left: (selectedBox.x2 + offset.x) * scale + 10,
              top: (selectedBox.y2 + offset.y) * scale - 15
            }}
            title="Borrar selección"
          >
            <Trash2 size={18} />
          </button>
        )}

        {/* MENÚ DE MULTI-SELECCIÓN (AGRUPAR/COPIAR) */}
        {selectedIndices.length > 1 && selectedBox && (
          <div
            className="absolute z-50 bg-indigo-600 p-2 rounded-2xl shadow-2xl flex items-center gap-1 border border-indigo-400 animate-in fade-in slide-in-from-top-4 duration-200"
            style={{
              left: (selectedBox.x1 + offset.x) * scale,
              top: (selectedBox.y1 + offset.y) * scale - 60
            }}
          >
            <button onClick={() => {
              groupSelection();
              setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
            }} className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-indigo-700 rounded-xl transition-colors">
              <Group size={16} /> <span className="text-[10px] font-bold uppercase">Agrupar</span>
            </button>
            <div className="w-[1px] h-6 bg-indigo-400/50 mx-1"></div>
            <button onClick={copySelection} className="p-1.5 text-white hover:bg-indigo-700 rounded-lg transition-colors" title="Copiar"><Copy size={16} /></button>
            <button onClick={cutSelection} className="p-1.5 text-white hover:bg-indigo-700 rounded-lg transition-colors" title="Cortar"><Scissors size={16} /></button>
          </div>
        )}

        {/* BOTÓN DESAGRUPAR (SI ES GRUPO) */}
        {selectedIndices.length === 1 && selectedStep?.tool === 'group' && selectedBox && (
          <button
            onClick={() => {
              ungroupSelection();
              setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
            }}
            className="absolute z-50 bg-amber-500 text-white px-3 py-1.5 rounded-2xl shadow-2xl hover:bg-amber-600 transition-all border-2 border-white flex items-center gap-2"
            style={{
              left: (selectedBox.x1 + offset.x) * scale,
              top: (selectedBox.y1 + offset.y) * scale - 60
            }}
          >
            <Ungroup size={16} /> <span className="text-[10px] font-bold uppercase">Desagrupar</span>
          </button>
        )}

        {/* BOTÓN PEGAR (SI HAY PORTAPAPELES) */}
        {tool === 'select' && selectedIndices.length === 0 && useWhiteboardStore.getState().clipboard.length > 0 && (
          <button
            onClick={paste}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e1e1e] border border-gray-700 px-4 py-2 rounded-2xl shadow-2xl text-white hover:bg-gray-800 transition-all flex items-center gap-2 animate-in slide-in-from-bottom-4"
          >
            <ClipboardPaste size={18} className="text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Pegar Elementos</span>
          </button>
        )}

        {/* BARRA DE TEXTO FLOTANTE */}
        {selectedIndex !== null && selectedBox && isSelectedText && (
          <div
            className="absolute z-50 bg-[#1e1e1e] p-2 rounded-2xl shadow-2xl flex flex-wrap items-center gap-2 border border-gray-700 animate-in fade-in zoom-in-95 duration-200 min-w-[300px]"
            style={{
              left: Math.max(10, (selectedBox.x1 + offset.x) * scale),
              top: Math.max(10, (selectedBox.y2 + offset.y) * scale + 20)
            }}
          >
            <select value={selectedStep.fontFamily || fontFamily} onChange={(e) => setTextStyle({ fontFamily: e.target.value })} className="bg-gray-800 text-white text-[10px] px-2 py-1.5 rounded-lg border-none outline-none">{fonts.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}</select>
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5"><button onClick={() => setFontSize(Math.max(8, (selectedStep.fontSize || fontSize) - 2))} className="p-1 text-gray-400 hover:text-white"><Minus size={12} /></button><input type="number" value={selectedStep.fontSize || fontSize} onChange={(e) => setFontSize(parseInt(e.target.value) || 12)} className="w-8 bg-transparent text-white text-[10px] font-bold text-center border-none" /><button onClick={() => setFontSize(Math.min(120, (selectedStep.fontSize || fontSize) + 2))} className="p-1 text-gray-400 hover:text-white"><Plus size={12} /></button></div>
            <div className="flex gap-1"><button onClick={() => setTextStyle({ fontWeight: (selectedStep.fontWeight || fontWeight) === 'bold' ? 'normal' : 'bold' })} className={`p-1.5 rounded-lg ${(selectedStep.fontWeight || fontWeight) === 'bold' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Bold size={14} /></button><button onClick={() => setTextStyle({ textDecoration: (selectedStep.textDecoration || textDecoration) === 'underline' ? 'none' : 'underline' })} className={`p-1.5 rounded-lg ${(selectedStep.textDecoration || textDecoration) === 'underline' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Underline size={14} /></button></div>
            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>
            <div className="flex gap-0.5">
              <button onClick={() => setTextStyle({ textAlign: 'left' })} className={`p-1.5 rounded-lg ${(selectedStep.textAlign || textAlign) === 'left' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="Izquierda"><AlignLeft size={14} /></button>
              <button onClick={() => setTextStyle({ textAlign: 'center' })} className={`p-1.5 rounded-lg ${(selectedStep.textAlign || textAlign) === 'center' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="Centro"><AlignCenter size={14} /></button>
              <button onClick={() => setTextStyle({ textAlign: 'right' })} className={`p-1.5 rounded-lg ${(selectedStep.textAlign || textAlign) === 'right' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="Derecha"><AlignRight size={14} /></button>
              <button onClick={() => setTextStyle({ textAlign: 'justify' })} className={`p-1.5 rounded-lg ${(selectedStep.textAlign || textAlign) === 'justify' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="Justificado"><AlignJustify size={14} /></button>
            </div>
            <div className="flex gap-0.5 ml-auto relative">
              <button
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className="w-6 h-6 rounded-md border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors"
                style={{ backgroundColor: selectedStep.color }}
              >
                <Palette size={14} className="text-white mix-blend-difference" />
              </button>

              {isColorPickerOpen && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-xl z-[70] w-[200px]">
                  <div className="grid grid-cols-5 gap-1.5">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          setColor(c);
                          setIsColorPickerOpen(false);
                          setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
                        }}
                        className={`w-6 h-6 rounded-full border border-gray-600 hover:scale-110 transition-transform ${selectedStep.color === c ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#1e1e1e]' : ''}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>

            {/* CONTROL DE CAPAS (TEXTO) */}
            <div className="flex gap-0.5">
              <button onClick={() => { moveSelectionToBack(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Enviar al Fondo"><ChevronsDown size={14} /></button>
              <button onClick={() => { moveSelectionBackward(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Bajar Nivel"><ChevronDown size={14} /></button>
              <button onClick={() => { moveSelectionForward(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Subir Nivel"><ChevronUp size={14} /></button>
              <button onClick={() => { moveSelectionToFront(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Traer al Frente"><ChevronsUp size={14} /></button>
            </div>
          </div>
        )}

        {/* PROPIEDADES DE FIGURA FLOTANTE */}
        {selectedIndex !== null && selectedBox && !isSelectedText && ['rect', 'circle', 'triangle', 'arrow', 'star'].includes(selectedStep.tool) && (
          <div
            className="absolute z-50 bg-[#1e1e1e] p-2 rounded-2xl shadow-2xl flex flex-wrap items-center gap-2 border border-gray-700 animate-in fade-in zoom-in-95 duration-200 min-w-[300px]"
            style={{
              left: Math.max(10, (selectedBox.x1 + offset.x) * scale),
              top: Math.max(10, (selectedBox.y2 + offset.y) * scale + 20)
            }}
          >
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <span className="text-[10px] text-gray-500 font-bold px-1">W</span>
              <input
                type="number"
                value={Math.round(getPointsBox(selectedStep).x2 - getPointsBox(selectedStep).x1)}
                onChange={(e) => {
                  const newW = parseInt(e.target.value) || 10;
                  const startX = selectedStep.points[0].x;
                  const newPoints = [...selectedStep.points.map(p => ({ ...p }))];

                  if (selectedStep.tool === 'circle' || selectedStep.tool === 'star') {
                    // Constant: Center is points[0]. Radius is W / 2.
                    const radius = newW / 2;
                    newPoints[newPoints.length - 1] = { x: startX + radius, y: selectedStep.points[0].y };
                  } else {
                    const endX = selectedStep.points[selectedStep.points.length - 1].x;
                    if (startX <= endX) {
                      newPoints[newPoints.length - 1].x = startX + newW;
                    } else {
                      newPoints[0].x = endX + newW;
                    }
                  }

                  updateStep(selectedIndex, { ...selectedStep, points: newPoints });
                }}
                className="w-12 bg-transparent text-white text-[10px] font-bold border-none outline-none"
              />
              <span className="text-gray-600">|</span>
              <span className="text-[10px] text-gray-500 font-bold px-1">H</span>
              <input
                type="number"
                value={Math.round(getPointsBox(selectedStep).y2 - getPointsBox(selectedStep).y1)}
                onChange={(e) => {
                  const newH = parseInt(e.target.value) || 10;
                  const startY = selectedStep.points[0].y;
                  const newPoints = [...selectedStep.points.map(p => ({ ...p }))];

                  if (selectedStep.tool === 'circle' || selectedStep.tool === 'star') {
                    const radius = newH / 2;
                    newPoints[newPoints.length - 1] = { x: selectedStep.points[0].x, y: startY + radius };
                  } else {
                    const endY = selectedStep.points[selectedStep.points.length - 1].y;
                    if (startY <= endY) {
                      newPoints[newPoints.length - 1].y = startY + newH;
                    } else {
                      newPoints[0].y = endY + newH;
                    }
                  }

                  updateStep(selectedIndex, { ...selectedStep, points: newPoints });
                }}
                className="w-12 bg-transparent text-white text-[10px] font-bold border-none outline-none"
              />
            </div>

            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>

            {/* GROSOR DE LINEA */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
              <button onClick={() => updateStep(selectedIndex, { ...selectedStep, lineWidth: Math.max(1, selectedStep.lineWidth - 1) })} className="p-1 text-gray-400 hover:text-white"><Minus size={12} /></button>
              <span className="text-[10px] text-white font-bold w-4 text-center">{selectedStep.lineWidth}</span>
              <button onClick={() => {
                updateStep(selectedIndex, { ...selectedStep, lineWidth: Math.min(20, selectedStep.lineWidth + 1) });
                broadcast('sync_history', { history: useWhiteboardStore.getState().history });
              }} className="p-1 text-gray-400 hover:text-white"><Plus size={12} /></button>
            </div>

            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>

            {/* COLOR DE BORDE */}
            <div className="flex gap-0.5 relative">
              <button
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className="w-6 h-6 rounded-md border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors"
                style={{ backgroundColor: selectedStep.color }}
                title="Color de Borde"
              >
                <div className="w-3 h-3 border-2 border-white/80 rounded-sm"></div>
              </button>

              {isColorPickerOpen && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-xl z-[70] w-[200px]">
                  <div className="grid grid-cols-5 gap-1.5">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          updateStep(selectedIndex, { ...selectedStep, color: c });
                          setIsColorPickerOpen(false);
                          setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
                        }}
                        className="w-6 h-6 rounded-full border border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COLOR DE RELLENO */}
            <div className="flex gap-0.5 relative">
              <button
                onClick={() => setIsFillPickerOpen(!isFillPickerOpen)}
                className="w-6 h-6 rounded-md border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors relative overflow-hidden"
                style={{ backgroundColor: selectedStep.fillColor || 'transparent' }}
                title="Color de Relleno"
              >
                {!selectedStep.fillColor && <div className="absolute inset-0 border-t border-red-500 rotate-45 scale-150 transform origin-center"></div>}
                <div className="w-3 h-3 bg-white/50 rounded-sm"></div>
              </button>

              {isFillPickerOpen && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-xl z-[70] w-[200px]">
                  <button
                    onClick={() => { updateStep(selectedIndex, { ...selectedStep, fillColor: undefined }); setIsFillPickerOpen(false); }}
                    className="w-full text-xs text-center text-gray-400 hover:text-white p-2 border border-gray-700 rounded mb-2 hover:bg-gray-800"
                  >
                    Sin Relleno
                  </button>
                  <div className="grid grid-cols-5 gap-1.5">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          updateStep(selectedIndex, { ...selectedStep, fillColor: c });
                          setIsFillPickerOpen(false);
                          setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
                        }}
                        className="w-6 h-6 rounded-full border border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>


            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>

            {/* PROPIEDADES AVANZADAS */}
            {selectedStep.tool === 'rect' && (
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 mr-1" title="Radio de Borde">
                <span className="text-[10px] text-gray-500 font-bold px-1">R</span>
                <input
                  type="number"
                  value={selectedStep.borderRadius || 0}
                  onChange={(e) => {
                    updateStep(selectedIndex, { ...selectedStep, borderRadius: parseInt(e.target.value) || 0 });
                    setTimeout(() => broadcast('sync_history', { history: useWhiteboardStore.getState().history }), 50);
                  }}
                  className="w-8 bg-transparent text-white text-[10px] font-bold border-none outline-none"
                />
              </div>
            )}

            <div className="flex gap-1 items-center bg-gray-800 rounded-lg p-1 mr-1">
              {/* Toggle Lines */}
              <button
                onClick={() => {
                  const nextStyle = !selectedStep.strokeDash ? [10, 5] : (selectedStep.strokeDash[0] === 10 ? [2, 4] : undefined);
                  updateStep(selectedIndex, { ...selectedStep, strokeDash: nextStyle });
                  broadcast('sync_history', { history: useWhiteboardStore.getState().history });
                }}
                className="p-1 text-gray-400 hover:text-white"
                title="Estilo de Línea"
              >
                {!selectedStep.strokeDash ? <div className="w-4 h-0.5 bg-current"></div> :
                  (selectedStep.strokeDash[0] === 10 ? <div className="flex gap-0.5"><div className="w-2 h-0.5 bg-current"></div><div className="w-1 h-0.5 bg-current"></div></div> :
                    <div className="flex gap-0.5"><div className="w-0.5 h-0.5 bg-current rounded-full"></div><div className="w-0.5 h-0.5 bg-current rounded-full"></div><div className="w-0.5 h-0.5 bg-current rounded-full"></div></div>)}
              </button>
            </div>

            <div className="flex gap-1 items-center bg-gray-800 rounded-lg p-1">
              {/* Toggle Shadow */}
              <button
                onClick={() => {
                  const updatedStep = {
                    ...selectedStep,
                    shadow: selectedStep.shadow ? undefined : { color: 'rgba(0,0,0,0.5)', blur: 10, offsetX: 5, offsetY: 5 }
                  };
                  updateStep(selectedIndex, updatedStep);
                  broadcast('sync_history', { history: useWhiteboardStore.getState().history });
                }}
                className={`p-1 ${selectedStep.shadow ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                title="Sombra"
              >
                <div className="w-3 h-3 bg-current rounded-sm shadow-sm opacity-80"></div>
              </button>
            </div>
            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>

            {/* CONTROL DE CAPAS (FIGURAS) */}
            <div className="flex gap-0.5">
              <button onClick={() => { updateStep(selectedIndex, { ...selectedStep, rotation: (selectedStep.rotation || 0) + 90 }); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Rotar 90°"><Monitor size={14} className="rotate-90" /></button>
              <button onClick={() => { updateStep(selectedIndex, { ...selectedStep, flipX: !selectedStep.flipX }); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Voltear Horizontal"><PanelRightClose size={14} /></button>
              <button onClick={() => { updateStep(selectedIndex, { ...selectedStep, flipY: !selectedStep.flipY }); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Voltear Vertical"><PanelRightClose size={14} className="rotate-90" /></button>
            </div>

            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>

            <div className="flex gap-0.5">
              <button onClick={() => { moveSelectionToBack(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Enviar al Fondo"><ChevronsDown size={14} /></button>
              <button onClick={() => { moveSelectionBackward(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Bajar Nivel"><ChevronDown size={14} /></button>
              <button onClick={() => { moveSelectionForward(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Subir Nivel"><ChevronUp size={14} /></button>
              <button onClick={() => { moveSelectionToFront(); broadcast('sync_history', { history: useWhiteboardStore.getState().history }); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" title="Traer al Frente"><ChevronsUp size={14} /></button>
            </div>

          </div>
        )}

        {textInput && (
          <div className="absolute z-40 p-2 border-2 border-indigo-400 bg-white shadow-2xl rounded-lg overflow-hidden"
            style={{
              left: (textInput.x + offset.x) * scale,
              top: (textInput.y + offset.y) * scale,
              width: textInput.w * scale,
              height: textInput.h * scale
            }}>
            <textarea
              ref={textInputRef} value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onBlur={finalizeText}
              className={`w-full h-full bg-transparent border-none outline-none resize-none p-0 focus:ring-0 overflow-hidden ${(editingIndex !== null ? history[editingIndex].fontWeight : fontWeight) === 'bold' ? 'font-bold' : ''} ${(editingIndex !== null ? history[editingIndex].textDecoration : textDecoration) === 'underline' ? 'underline' : ''}`}
              placeholder="Escribe..."
              style={{
                color: editingIndex !== null ? history[editingIndex].color : color,
                fontSize: `${(editingIndex !== null ? history[editingIndex].fontSize || fontSize : fontSize) * scale}px`,
                textAlign: (editingIndex !== null ? history[editingIndex].textAlign : textAlign) === 'justify' ? 'left' : (editingIndex !== null ? history[editingIndex].textAlign : textAlign),
                fontFamily: editingIndex !== null ? history[editingIndex].fontFamily : (selectedStep?.fontFamily || fontFamily)
              }}
            />
          </div>
        )}

        {/* Cursors of other users */}
        {Object.entries(users).map(([id, u]) => (
          id !== user.id && u.x !== -1000 && (
            <div
              key={id}
              className="absolute pointer-events-none transition-all duration-100 z-50 flex flex-col items-center"
              style={{
                left: (u.x + offset.x) * scale,
                top: (u.y + offset.y) * scale,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <ArrowRight
                size={24}
                className="rotate-[-45deg] drop-shadow-lg"
                style={{ color: u.color, fill: u.color }}
              />
              <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap -mt-1 border border-gray-100" style={{ color: u.color }}>
                {u.name}
              </span>
            </div>
          )
        ))}

        {!isAiPanelOpen && (
          <button onClick={() => setIsAiPanelOpen(true)} className="absolute top-6 right-6 bg-indigo-600 text-white p-3 rounded-2xl shadow-xl z-30 hover:scale-110 transition-transform flex items-center gap-2">
            <BrainCircuit size={20} /><span className="text-xs font-bold hidden md:inline">Tutor IA</span>
          </button>
        )}
      </div>

      {/* PANEL DEL TUTOR IA */}
      <div className={`fixed md:relative top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl transition-all duration-300 z-50 flex flex-col ${isAiPanelOpen ? 'w-full md:w-[350px]' : 'w-0 overflow-hidden border-none'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3"><Sparkles className="text-indigo-600" size={20} /><h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-tighter">Tutor Gemini</h2></div>
          <button onClick={() => setIsAiPanelOpen(false)} className="text-gray-400 hover:text-gray-600"><PanelRightClose size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 prose prose-sm prose-indigo max-w-none text-gray-700 whitespace-pre-wrap">
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-4 mt-20">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Analizando pizarra...</span>
            </div>
          ) : (
            aiResult || "Dibuja algo y usa el botón de abajo para que el tutor te explique."
          )}
        </div>
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={async () => {
              setIsAnalyzing(true);
              setIsAiPanelOpen(true);
              const dataUrl = canvasRef.current!.toDataURL('image/png');
              setAiResult(await analyzeWhiteboard(dataUrl));
              setIsAnalyzing(false);
            }}
            disabled={isAnalyzing}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />Analizar Pizarra
          </button>
        </div>
      </div>
    </div >
  );
});

export default Whiteboard;
