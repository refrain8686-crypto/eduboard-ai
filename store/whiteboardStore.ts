
import { create } from 'zustand';
import { Tool, DrawStep } from '../types';

interface WhiteboardState {
  tool: Tool;
  color: string;
  fontSize: number;
  scale: number;
  offset: { x: number; y: number };
  history: DrawStep[];
  past: DrawStep[][];
  future: DrawStep[][];
  selectedIndices: number[]; // Multi-selection
  clipboard: DrawStep[]; // Clipboard
  toolColors: Record<Tool, string>;
  editingIndex: number | null;
  isShapePickerOpen: boolean;
  isSmoothingEnabled: boolean;

  // Grosores por herramienta
  toolWidths: Record<Tool, number>;

  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right' | 'justify';

  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;

  // Selection
  setSelection: (indices: number[]) => void;
  toggleSelection: (index: number) => void;
  setEditingIndex: (index: number | null) => void;

  setIsShapePickerOpen: (isOpen: boolean) => void;
  setIsSmoothingEnabled: (enabled: boolean) => void;

  setTextStyle: (style: Partial<Pick<DrawStep, 'fontFamily' | 'fontWeight' | 'textDecoration' | 'textAlign'>>) => void;

  addStep: (step: DrawStep) => void;
  updateStep: (index: number, step: DrawStep) => void;
  removeStep: (index: number) => void;
  updateSelectedStep: (updates: Partial<DrawStep>) => void;

  // Actions
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  clearBoard: () => void;
  triggerRedraw: number;

  // Z-Index
  moveSelectionToFront: () => void;
  moveSelectionToBack: () => void;
  moveSelectionForward: () => void;
  moveSelectionBackward: () => void;

  // Group / Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  paste: () => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  setHistory: (history: DrawStep[]) => void;
  users: Record<string, { name: string, color: string, x: number, y: number }>;
  setUsers: (users: Record<string, { name: string, color: string, x: number, y: number }>) => void;
  updateUserCursor: (userId: string, data: { x: number, y: number, name: string, color: string }) => void;

  // Collaboration Modes
  isPresenter: boolean;
  isFollowing: boolean;
  isAdmin: boolean;
  setPresenterMode: (isPresenter: boolean) => void;
  setFollowMode: (isFollowing: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  tool: 'pencil',
  color: '#000000',
  fontSize: 18,
  scale: 1,
  offset: { x: 0, y: 0 },
  history: [],
  past: [],
  future: [],
  selectedIndices: [],
  clipboard: [],
  toolColors: {
    pencil: '#000000',
    eraser: '#ffffff',
    rect: '#000000',
    circle: '#000000',
    triangle: '#000000',
    text: '#000000',
    select: '#000000',
    arrow: '#000000',
    star: '#000000',
    highlighter: '#ffff00',
    marker: '#ff0000',
    group: '#000000',
    image: 'transparent'
  } as Record<Tool, string>,
  editingIndex: null,
  isShapePickerOpen: false,
  isSmoothingEnabled: true,
  triggerRedraw: 0,
  users: {},

  toolWidths: {
    pencil: 3,
    marker: 8,
    highlighter: 15,
    eraser: 20,
    rect: 3,
    circle: 3,
    triangle: 3,
    arrow: 3,
    star: 3,
    text: 1,
    select: 1,
    group: 1,
    image: 1
  },

  fontFamily: 'Inter, sans-serif',
  fontWeight: 'normal',
  textDecoration: 'none',
  textAlign: 'left',

  setTool: (tool) => set((state) => ({
    tool,
    selectedIndices: [],
    editingIndex: null,
    isShapePickerOpen: false,
    color: state.toolColors[tool] || state.color
  })),
  setColor: (color) => set((state) => {
    if (state.selectedIndices.length > 0) state.updateSelectedStep({ color });
    return {
      color,
      toolColors: { ...state.toolColors, [state.tool]: color }
    };
  }),
  setLineWidth: (width) => set((state) => {
    const newToolWidths = { ...state.toolWidths, [state.tool]: width };
    if (state.selectedIndices.length > 0) {
      state.updateSelectedStep({ lineWidth: width });
    }
    return { toolWidths: newToolWidths };
  }),
  setFontSize: (fontSize) => set((state) => {
    if (state.selectedIndices.length > 0) state.updateSelectedStep({ fontSize });
    return { fontSize };
  }),
  setScale: (scale) => set((state) => ({
    scale: Math.max(0.1, Math.min(5, scale)),
    triggerRedraw: state.triggerRedraw + 1
  })),
  setOffset: (offsetOrUpdater) => set((state) => ({
    offset: typeof offsetOrUpdater === 'function' ? offsetOrUpdater(state.offset) : offsetOrUpdater,
    triggerRedraw: state.triggerRedraw + 1
  })),

  setSelection: (indices) => set({ selectedIndices: indices, editingIndex: null }),

  toggleSelection: (index) => set((state) => {
    const newIndices = state.selectedIndices.includes(index)
      ? state.selectedIndices.filter(i => i !== index)
      : [...state.selectedIndices, index];
    return { selectedIndices: newIndices, editingIndex: null };
  }),

  setEditingIndex: (editingIndex) => set({ editingIndex }),
  setIsShapePickerOpen: (isShapePickerOpen) => set({ isShapePickerOpen }),
  setIsSmoothingEnabled: (isSmoothingEnabled) => set({ isSmoothingEnabled }),

  setTextStyle: (style) => set((state) => {
    if (state.selectedIndices.length > 0) state.updateSelectedStep(style);
    return { ...style };
  }),

  addStep: (step) => set((state) => ({
    past: [...state.past, state.history],
    history: [...state.history, step],
    future: []
  })),

  updateStep: (index, step) => set((state) => {
    const newHistory = [...state.history];
    newHistory[index] = step;
    return {
      past: [...state.past, state.history],
      history: newHistory,
      future: [],
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  removeStep: (index) => set((state) => {
    const newHistory = state.history.filter((_, i) => i !== index);
    return {
      past: [...state.past, state.history],
      history: newHistory,
      future: [],
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  updateSelectedStep: (updates) => set((state) => {
    if (state.selectedIndices.length === 0) return state;

    const updateRecursive = (step: DrawStep): DrawStep => {
      const updated = { ...step, ...updates };
      if (step.tool === 'group' && step.steps) {
        return {
          ...updated,
          steps: step.steps.map(s => updateRecursive(s))
        };
      }
      return updated;
    };

    const newHistory = [...state.history];
    state.selectedIndices.forEach(idx => {
      if (newHistory[idx]) {
        newHistory[idx] = updateRecursive(newHistory[idx]);
      }
    });
    return {
      past: [...state.past, state.history],
      history: newHistory,
      future: [],
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  deleteSelection: () => set((state) => {
    const toDelete = new Set(state.selectedIndices);
    const newHistory = state.history.filter((_, i) => !toDelete.has(i));
    return {
      past: [...state.past, state.history],
      history: newHistory,
      future: [],
      selectedIndices: [],
      editingIndex: null,
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      past: newPast,
      future: [state.history, ...state.future],
      history: previous,
      selectedIndices: [],
      editingIndex: null,
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, state.history],
      future: newFuture,
      history: next,
      selectedIndices: [],
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  clearBoard: () => set((state) => ({
    past: [...state.past, state.history],
    history: [],
    future: [],
    selectedIndices: [],
    editingIndex: null,
    offset: { x: 0, y: 0 },
    scale: 1,
    triggerRedraw: state.triggerRedraw + 1
  })),

  // Z-Index Logic (Adapted for Multi-Selection)
  moveSelectionToFront: () => set((state) => {
    if (state.selectedIndices.length === 0) return state;
    const indices = [...state.selectedIndices].sort((a, b) => a - b);
    const newHistory = [...state.history];
    const items = indices.map(i => newHistory[i]);

    // Remove elements from back to front to preserve indices during splice
    for (let i = indices.length - 1; i >= 0; i--) {
      newHistory.splice(indices[i], 1);
    }

    newHistory.push(...items);

    // Update selection indices
    const newSelectedIndices = items.map((_, i) => newHistory.length - items.length + i);

    return { history: newHistory, selectedIndices: newSelectedIndices, triggerRedraw: state.triggerRedraw + 1 };
  }),

  moveSelectionToBack: () => set((state) => {
    if (state.selectedIndices.length === 0) return state;
    const indices = [...state.selectedIndices].sort((a, b) => a - b);
    const newHistory = [...state.history];
    const items = indices.map(i => newHistory[i]);

    for (let i = indices.length - 1; i >= 0; i--) {
      newHistory.splice(indices[i], 1);
    }

    newHistory.unshift(...items);

    const newSelectedIndices = items.map((_, i) => i);

    return { history: newHistory, selectedIndices: newSelectedIndices, triggerRedraw: state.triggerRedraw + 1 };
  }),

  moveSelectionForward: () => set((state) => {
    if (state.selectedIndices.length === 0) return state;
    // Simple implementation: Only works reliably for single selection or contiguous blocks
    // For proper multi-layered push, precise logic is needed. 
    // Fallback: Just move the last selected item forward for now or implement generic swap
    const indices = [...state.selectedIndices].sort((a, b) => b - a); // Reverse order
    const newHistory = [...state.history];
    let changed = false;
    const newSelectedIndices = new Set(state.selectedIndices);

    // Swap each selected item with next if possible, starting from end
    indices.forEach(idx => {
      if (idx < newHistory.length - 1 && !newSelectedIndices.has(idx + 1)) {
        const temp = newHistory[idx];
        newHistory[idx] = newHistory[idx + 1];
        newHistory[idx + 1] = temp;
        newSelectedIndices.delete(idx);
        newSelectedIndices.add(idx + 1);
        changed = true;
      }
    });

    if (!changed) return state;
    return { history: newHistory, selectedIndices: Array.from(newSelectedIndices), triggerRedraw: state.triggerRedraw + 1 };
  }),

  moveSelectionBackward: () => set((state) => {
    if (state.selectedIndices.length === 0) return state;
    const indices = [...state.selectedIndices].sort((a, b) => a - b);
    const newHistory = [...state.history];
    let changed = false;
    const newSelectedIndices = new Set(state.selectedIndices);

    indices.forEach(idx => {
      if (idx > 0 && !newSelectedIndices.has(idx - 1)) {
        const temp = newHistory[idx];
        newHistory[idx] = newHistory[idx - 1];
        newHistory[idx - 1] = temp;
        newSelectedIndices.delete(idx);
        newSelectedIndices.add(idx - 1);
        changed = true;
      }
    });

    if (!changed) return state;
    return { history: newHistory, selectedIndices: Array.from(newSelectedIndices), triggerRedraw: state.triggerRedraw + 1 };
  }),

  // Group / Clipboard
  copySelection: () => set((state) => {
    const selected = state.selectedIndices.map(i => state.history[i]).filter(Boolean);
    return { clipboard: selected };
  }),

  cutSelection: () => set((state) => {
    const selected = state.selectedIndices.map(i => state.history[i]).filter(Boolean);
    const toDelete = new Set(state.selectedIndices);
    const newHistory = state.history.filter((_, i) => !toDelete.has(i));
    return {
      history: newHistory,
      clipboard: selected,
      selectedIndices: [],
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  paste: () => set((state) => {
    if (state.clipboard.length === 0) return state;
    // Clone and offset
    const newItems = state.clipboard.map(item => ({
      ...item,
      points: item.points.map(p => ({ x: p.x + 20, y: p.y + 20 }))
    }));
    // Add to history and select new items
    const startIndex = state.history.length;
    const newIndices = newItems.map((_, i) => startIndex + i);

    return {
      history: [...state.history, ...newItems],
      selectedIndices: newIndices,
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  groupSelection: () => set((state) => {
    if (state.selectedIndices.length < 2) return state;
    const indices = [...state.selectedIndices].sort((a, b) => a - b);
    const items = indices.map(i => state.history[i]);

    // Remove original items
    const toDelete = new Set(indices);
    const newHistory = state.history.filter((_, i) => !toDelete.has(i));

    // Create group item
    // Calculate group bounds for potential use, but mainly storing steps
    const groupStep: DrawStep = {
      tool: 'group',
      color: 'transparent',
      lineWidth: 0,
      points: [{ x: 0, y: 0 }], // Dummy points, real content is in steps
      steps: items
    };

    newHistory.push(groupStep);
    return {
      past: [...state.past, state.history],
      history: newHistory,
      selectedIndices: [newHistory.length - 1],
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  ungroupSelection: () => set((state) => {
    // Only ungroup if single group is selected for simplicity, or iterate
    if (state.selectedIndices.length !== 1) return state;
    const index = state.selectedIndices[0];
    const item = state.history[index];

    if (item.tool !== 'group' || !item.steps) return state;

    const newHistory = [...state.history];
    newHistory.splice(index, 1, ...item.steps);

    // Select the ungrouped items
    const newIndices = item.steps.map((_, i) => index + i);

    return {
      past: [...state.past, state.history],
      history: newHistory,
      selectedIndices: newIndices,
      triggerRedraw: state.triggerRedraw + 1
    };
  }),

  setHistory: (history) => set({ history, triggerRedraw: get().triggerRedraw + 1 }),

  setUsers: (users) => set({ users }),

  updateUserCursor: (userId, data) => set((state) => ({
    users: { ...state.users, [userId]: data }
  })),

  isPresenter: false,
  isFollowing: false,
  isAdmin: false,
  setPresenterMode: (isPresenter) => set({ isPresenter }),
  setFollowMode: (isFollowing) => set({ isFollowing }),
  setIsAdmin: (isAdmin) => set({ isAdmin })
}));
