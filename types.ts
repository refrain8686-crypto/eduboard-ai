
export type Tool = 'pencil' | 'eraser' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'star' | 'text' | 'marker' | 'highlighter' | 'select' | 'group';

export interface Point {
  x: number;
  y: number;
}

export interface DrawStep {
  tool: Tool;
  points: Point[];
  color: string;
  lineWidth: number;
  fillColor?: string;
  fontSize?: number; // Desacoplado del lineWidth
  text?: string;
  opacity?: number;
  width?: number;
  height?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  borderRadius?: number;
  strokeDash?: number[];
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  steps?: DrawStep[]; // Para grupos
  rotation?: number; // In degrees
  flipX?: boolean;
  flipY?: boolean;
}

export interface User {
  id: string;
  name: string;
  color: string;
}
