
export type Tool = 'pencil' | 'eraser' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'star' | 'text' | 'marker' | 'highlighter' | 'select' | 'group' | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface DrawStep {
  id?: string;
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
  imageData?: string; // Base64 or URL
}

export interface User {
  id: string;
  name: string;
  color: string;
  email?: string;
}
