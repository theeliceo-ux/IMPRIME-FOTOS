export type PageSizeId = 'letter' | 'a4' | 'legal' | 'tabloid' | 'a3' | 'a5' | 'photo4x6' | 'photo5x7' | 'custom';

export type PageOrientation = 'portrait' | 'landscape';

export type FitMode = 'contain' | 'cover' | 'stretch';

export type BorderStyle = 'none' | 'solid-thin' | 'solid-medium' | 'dashed' | 'dotted' | 'cut-guides';

export type ColorFilter = 'none' | 'scanner' | 'grayscale' | 'contrast' | 'eco';

export interface PageDimensions {
  id: PageSizeId;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PhotoItem {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string; // Object URL
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  copies: number; // Keep for backward compatibility or simple tracking
}

export interface GridCell {
  id: string; // Unique ID for this specific cell/frame instance
  photoId: string; // ID of the base PhotoItem in the library
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  filter?: ColorFilter; // For specific cell overrides if needed
  cropDataUrl?: string; // If cropped via CropModal, use this instead of the original
}

export interface LayoutConfig {
  pageSize: PageSizeId;
  customWidthMm: number;
  customHeightMm: number;
  orientation: PageOrientation;
  
  // Grid
  rows: number;
  columns: number;
  gapMm: number; // Gap between cells
  
  // Margins in mm
  margins: Margins;
  
  // Image fit
  fitMode: FitMode;
  cellBorder: BorderStyle;
  borderColor: string;
  borderWidthPt: number;
  cellRadiusMm: number;
  cellBackgroundColor: string;
  
  // Cut guides & PhotoScape extras
  showCutGuides: boolean;
  cutGuideColor: string;
  cutGuideStyle: 'cross' | 'dashed' | 'scissors';
  
  // Text & Headers
  showFileName: boolean;
  showPageNumber: boolean;
  pageHeaderTitle: string;
  headerFontSizePt: number;
  footerFontSizePt: number;
  
  // Global filter
  globalFilter: ColorFilter;
  
  // Multiplier
  globalCopiesPerPhoto: number;
}

export interface ExportProgress {
  active: boolean;
  current: number;
  total: number;
  stage: string;
  error?: string | null;
}
