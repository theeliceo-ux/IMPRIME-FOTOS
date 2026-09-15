import { PageDimensions, PageSizeId, Margins, LayoutConfig } from '../types';

export const PAGE_SIZES: Record<PageSizeId, PageDimensions> = {
  letter: {
    id: 'letter',
    name: 'Carta (Letter)',
    widthMm: 215.9,
    heightMm: 279.4,
    description: '8.5 x 11 pulgadas (Estándar México y América)',
  },
  a4: {
    id: 'a4',
    name: 'A4',
    widthMm: 210,
    heightMm: 297,
    description: '21 x 29.7 cm (Estándar Internacional)',
  },
  legal: {
    id: 'legal',
    name: 'Oficio (Legal)',
    widthMm: 215.9,
    heightMm: 355.6,
    description: '8.5 x 14 pulgadas (Documentos y papelería)',
  },
  tabloid: {
    id: 'tabloid',
    name: 'Doble Carta (Tabloide)',
    widthMm: 279.4,
    heightMm: 431.8,
    description: '11 x 17 pulgadas (Pósteres y catálogos)',
  },
  a3: {
    id: 'a3',
    name: 'A3',
    widthMm: 297,
    heightMm: 420,
    description: '29.7 x 42 cm',
  },
  a5: {
    id: 'a5',
    name: 'A5 (Media Carta)',
    widthMm: 148,
    heightMm: 210,
    description: '14.8 x 21 cm (Folletos y libretas)',
  },
  photo4x6: {
    id: 'photo4x6',
    name: 'Foto 4x6" (10x15 cm)',
    widthMm: 101.6,
    heightMm: 152.4,
    description: 'Papel fotográfico estándar 10 x 15 cm',
  },
  photo5x7: {
    id: 'photo5x7',
    name: 'Foto 5x7" (13x18 cm)',
    widthMm: 127,
    heightMm: 177.8,
    description: 'Papel fotográfico 13 x 18 cm',
  },
  custom: {
    id: 'custom',
    name: 'Personalizado',
    widthMm: 215.9,
    heightMm: 279.4,
    description: 'Medidas libres en milímetros',
  },
};

export interface GridPreset {
  name: string;
  rows: number;
  cols: number;
  badge?: string;
  description: string;
}

export const GRID_PRESETS: GridPreset[] = [
  { name: '1 Grande', rows: 1, cols: 1, description: '1 foto por página completa' },
  { name: '1 × 2', rows: 1, cols: 2, description: '2 fotos apiladas horizontalmente' },
  { name: '2 × 1', rows: 2, cols: 1, description: '2 fotos una sobre otra' },
  { name: '2 × 2', rows: 2, cols: 2, badge: 'Popular', description: '4 fotos (Ideal tareas y recortes)' },
  { name: '2 × 3', rows: 2, cols: 3, description: '6 fotos (Tarjetas y fichas)' },
  { name: '3 × 2', rows: 3, cols: 2, description: '6 fotos (Orientación vertical)' },
  { name: '3 × 3', rows: 3, cols: 3, badge: 'Recomendado', description: '9 fotos (Cuadrícula uniforme)' },
  { name: '3 × 4', rows: 4, cols: 3, description: '12 fotos (Catálogo escolar)' },
  { name: '4 × 4', rows: 4, cols: 4, description: '16 fotos por página' },
  { name: 'Infantil / Carnet', rows: 4, cols: 4, badge: 'Papelería', description: 'Fotos tamaño infantil / credencial' },
  { name: 'Miniaturas 5×5', rows: 5, cols: 5, description: '25 fotos pequeñas' },
];

export interface MarginPreset {
  name: string;
  margins: Margins;
  description: string;
}

export const MARGIN_PRESETS: MarginPreset[] = [
  {
    name: 'Sin márgenes (0 mm)',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    description: 'Aprovechamiento al 100% (Requiere impresora borderless)',
  },
  {
    name: 'Mínimo (5 mm)',
    margins: { top: 5, bottom: 5, left: 5, right: 5 },
    description: 'Márgenes de seguridad para la mayoría de impresoras',
  },
  {
    name: 'Estándar (10 mm)',
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    description: 'Margen equilibrado de 1 cm por lado',
  },
  {
    name: 'Amplio (15 mm)',
    margins: { top: 15, bottom: 15, left: 15, right: 15 },
    description: '1.5 cm por lado, ideal para enmarcar',
  },
  {
    name: 'Para Engargolar (20 mm izq)',
    margins: { top: 10, bottom: 10, left: 20, right: 10 },
    description: 'Margen izquierdo aumentado para perforar o anillar',
  },
];

export const DEFAULT_CONFIG: LayoutConfig = {
  pageSize: 'letter',
  customWidthMm: 215.9,
  customHeightMm: 279.4,
  orientation: 'portrait',
  
  rows: 2,
  columns: 2,
  gapMm: 4,
  
  margins: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
  
  fitMode: 'contain',
  cellBorder: 'none',
  borderColor: '#94a3b8',
  borderWidthPt: 1,
  cellRadiusMm: 0,
  cellBackgroundColor: '#ffffff',
  
  showCutGuides: false,
  cutGuideColor: '#cbd5e1',
  cutGuideStyle: 'scissors',
  
  showFileName: false,
  showPageNumber: false,
  pageHeaderTitle: '',
  headerFontSizePt: 10,
  footerFontSizePt: 8,
  
  globalFilter: 'none',
  globalCopiesPerPhoto: 1,
};
