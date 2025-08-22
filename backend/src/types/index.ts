export interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export interface PanelDefinition {
  panels: Panel[];
  imageId: string;
  status: 'manual' | 'auto' | 'community';
}
