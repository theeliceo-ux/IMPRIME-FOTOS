import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PhotoItem, LayoutConfig, ExportProgress, GridCell } from './types';
import { DEFAULT_CONFIG, PAGE_SIZES } from './constants/presets';
import { processImageFiles, cleanupPhotoUrls } from './utils/imageOptimizer';
import { generatePdfDocument } from './utils/pdfExport';
import { generateDocxDocument } from './utils/docxExport';
import { downloadBlob } from './utils/downloadHelper';
import { executePrint } from './utils/printHelper';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PageViewer } from './components/PageViewer';
import { PhotoList } from './components/PhotoList';
import { PrintSheetContainer } from './components/PrintSheetContainer';
import { ExportModal } from './components/ExportModal';
import { CropModal } from './components/CropModal';

export function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [photoToCrop, setPhotoToCrop] = useState<PhotoItem | null>(null);
  const [config, setConfig] = useState<LayoutConfig>({
    ...DEFAULT_CONFIG,
    cellBorder: 'none',
    showCutGuides: false,
    showPageNumber: false,
    showFileName: false,
    pageHeaderTitle: '',
    globalFilter: 'none',
  });
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Export State
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    active: false,
    current: 0,
    total: 0,
    stage: '',
    error: null,
  });
  const [exportType, setExportType] = useState<'pdf' | 'docx' | null>(null);
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>('');

  // Clean up Object URLs when photos unmount
  useEffect(() => {
    return () => {
      cleanupPhotoUrls(photos);
    };
  }, [photos]);

  // Update Config
  const handleConfigChange = (newConfig: Partial<LayoutConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  // Add Files (Supports JPG, PNG with auto white background, WebP, GIF, SVG, BMP, AVIF, TIFF and iPhone HEIC/HEIF)
  const handleAddFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      const newItems = await processImageFiles(files);
      setPhotos((prev) => [...prev, ...newItems]);
      setGridCells((prev) => [
        ...prev,
        ...newItems.map((p) => ({
          id: Math.random().toString(36).substr(2, 9),
          photoId: p.id,
          offsetX: 0,
          offsetY: 0,
          zoom: 1,
          rotation: p.rotation || 0,
        }))
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  // Add single copy of an existing photo to the sheet
  const handleAddSingleCopy = (photo: PhotoItem) => {
    setGridCells((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        photoId: photo.id,
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
        rotation: photo.rotation || 0,
      }
    ]);
  };

  // Remove Photo from library entirely
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target && target.url && target.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {
          // ignore
        }
      }
      return prev.filter((p) => p.id !== id);
    });
    setGridCells((prev) => prev.filter((c) => c.photoId !== id));
  };

  // Remove specific cell
  const handleRemoveCell = (cellId: string) => {
    setGridCells((prev) => prev.filter((c) => c.id !== cellId));
  };

  // Update specific cell config
  const handleUpdateCell = (cellId: string, updates: Partial<GridCell>) => {
    setGridCells((prev) => prev.map(c => c.id === cellId ? { ...c, ...updates } : c));
  };

  // Rotate base photo (from bottom bar) - applies to all its cells too
  const handleRotateBasePhoto = (id: string) => {
    let nextRot: 0 | 90 | 180 | 270 = 90;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        nextRot = (p.rotation === 0 ? 90 : p.rotation === 90 ? 180 : p.rotation === 180 ? 270 : 0) as 0 | 90 | 180 | 270;
        return { ...p, rotation: nextRot };
      })
    );
    // Update all matching cells to the new rotation
    setGridCells((prev) => prev.map(c => c.photoId === id ? { ...c, rotation: nextRot } : c));
  };

  // Reset base photo - resets all its cells
  const handleResetPhoto = (id: string) => {
    setPhotos((prev) => prev.map(p => p.id === id ? { ...p, offsetX: 0, offsetY: 0, zoom: 1, rotation: 0 } : p));
    setGridCells((prev) => prev.map(c => c.photoId === id ? { ...c, offsetX: 0, offsetY: 0, zoom: 1, rotation: 0, cropDataUrl: undefined } : c));
  };

  // Update Copies (from bottom bar)
  const handleUpdateCopies = (id: string, delta: number) => {
    if (delta > 0) {
      const photo = photos.find(p => p.id === id);
      if (photo) {
        handleAddSingleCopy(photo);
      }
    } else {
      // Remove the last instance of this photo
      setGridCells((prev) => {
        const lastIndex = prev.map(c => c.photoId).lastIndexOf(id);
        if (lastIndex >= 0) {
          const next = [...prev];
          next.splice(lastIndex, 1);
          return next;
        }
        return prev;
      });
    }
  };

  // Fill Grid with Photo
  const handleFillGridWithPhoto = (photo: PhotoItem) => {
    const targetCopies = Math.max(1, config.rows * config.columns);
    setGridCells(
      Array.from({ length: targetCopies }).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        photoId: photo.id,
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
        rotation: photo.rotation || 0,
      }))
    );
    setActivePageIndex(0);
  };

  const handleApplyCrop = (photoId: string, croppedDataUrl: string, newWidth: number, newHeight: number) => {
    setPhotos((prev) => prev.map(p => {
      if (p.id === photoId) {
        return { ...p, url: croppedDataUrl, width: newWidth, height: newHeight, rotation: 0 };
      }
      return p;
    }));
    
    // Also reset pan/zoom/rotation for cells using this photo
    setGridCells((prev) => prev.map(c => {
      if (c.photoId === photoId) {
        return { ...c, offsetX: 0, offsetY: 0, zoom: 1, rotation: 0, cropDataUrl: undefined };
      }
      return c;
    }));
    setPhotoToCrop(null);
  };

  // Clear All
  const handleClearAll = () => {
    cleanupPhotoUrls(photos);
    setPhotos([]);
    setGridCells([]);
    setInstanceOverrides({});
    setActivePageIndex(0);
  };

  // Calculate Cell Dimensions in Millimeters
  const cellDimensionsMm = useMemo(() => {
    const baseDim = PAGE_SIZES[config.pageSize] || PAGE_SIZES.letter;
    let pageW = config.pageSize === 'custom' ? config.customWidthMm : baseDim.widthMm;
    let pageH = config.pageSize === 'custom' ? config.customHeightMm : baseDim.heightMm;

    if (config.orientation === 'landscape') {
      const temp = pageW;
      pageW = Math.max(temp, pageH);
      pageH = Math.min(temp, pageH);
    } else {
      const temp = pageW;
      pageW = Math.min(temp, pageH);
      pageH = Math.max(temp, pageH);
    }

    const printableW = Math.max(10, pageW - config.margins.left - config.margins.right);
    const printableH = Math.max(10, pageH - config.margins.top - config.margins.bottom);

    const totalGapX = Math.max(0, (config.columns - 1) * config.gapMm);
    const totalGapY = Math.max(0, (config.rows - 1) * config.gapMm);

    const w = Math.max(1, (printableW - totalGapX) / config.columns);
    const h = Math.max(1, (printableH - totalGapY) / config.rows);

    return { width: w, height: h };
  }, [config]);

  // Total pages and copies calculation
  const totalCopies = useMemo(() => {
    return gridCells.length * (config.globalCopiesPerPhoto || 1);
  }, [gridCells, config.globalCopiesPerPhoto]);

  const cellsPerPage = Math.max(1, config.rows * config.columns);
  const totalPages = Math.max(1, Math.ceil(totalCopies / cellsPerPage));

  // Reset active page index if it goes out of bounds
  useEffect(() => {
    if (activePageIndex >= totalPages) {
      setActivePageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, activePageIndex]);

  // Export PDF Handler
  const handleExportPdf = async () => {
    if (photos.length === 0) return;
    setExportType('pdf');
    setDownloadUrl(null);
    setExportBlob(null);
    setExportProgress({ active: true, current: 0, total: totalPages, stage: 'Iniciando generación de PDF...', error: null });

    try {
      const blob = await generatePdfDocument(photos, gridCells, config, (progress) => {
        setExportProgress(progress);
      });

      const url = URL.createObjectURL(blob);
      const filename = `OrdenaImprime_${config.pageSize}_${config.rows}x${config.columns}.pdf`;
      setExportBlob(blob);
      setDownloadUrl(url);
      setDownloadFileName(filename);
      setExportProgress((prev) => ({ ...prev, active: false }));

      downloadBlob(blob, filename);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar el PDF';
      console.error('Error al generar PDF:', err);
      setExportProgress({ active: false, current: 0, total: 0, stage: '', error: errorMessage });
    }
  };

  // Export Word Handler
  const handleExportWord = async () => {
    if (photos.length === 0) return;
    setExportType('docx');
    setDownloadUrl(null);
    setExportBlob(null);
    setExportProgress({ active: true, current: 0, total: totalPages, stage: 'Iniciando generación de Word...', error: null });

    try {
      const blob = await generateDocxDocument(photos, gridCells, config, (progress) => {
        setExportProgress(progress);
      });

      const url = URL.createObjectURL(blob);
      const filename = `OrdenaImprime_${config.pageSize}_${config.rows}x${config.columns}.docx`;
      setExportBlob(blob);
      setDownloadUrl(url);
      setDownloadFileName(filename);
      setExportProgress((prev) => ({ ...prev, active: false }));

      downloadBlob(blob, filename);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar el documento Word';
      console.error('Error al generar Word:', err);
      setExportProgress({ active: false, current: 0, total: 0, stage: '', error: errorMessage });
    }
  };

  // Direct Print Handler
  const handlePrint = () => {
    executePrint(photos, config, instanceOverrides);
  };

  return (
    <>
      {/* Screen Workspace Container */}
      <div id="interactive-app-root" className="min-h-screen flex flex-col bg-slate-100/70 text-slate-800 antialiased font-sans print:hidden">
        {/* Hidden File Input for Global Header Button */}
        <input
          ref={hiddenFileInputRef}
          type="file"
          multiple
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.heic,.heif"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
          className="hidden"
        />

        {/* Header Bar */}
        <Header
          photoCount={photos.length}
          totalPages={totalPages}
          totalCopies={totalCopies}
          onUploadClick={() => hiddenFileInputRef.current?.click()}
          onClearAll={handleClearAll}
          onPrint={handlePrint}
          onExportPdf={handleExportPdf}
          onExportWord={handleExportWord}
          isExporting={exportProgress.active}
        />

        {/* Main Workspace (Sidebar + Viewer) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar Controls */}
          <Sidebar
            config={config}
            onChangeConfig={handleConfigChange}
            cellDimensionsMm={cellDimensionsMm}
            totalPhotos={photos.length}
            totalCopies={totalCopies}
            photos={photos}
            onOpenCropModal={setPhotoToCrop}
          />

          {/* Center Canvas / Page Viewer */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <PageViewer
              photos={photos}
              gridCells={gridCells}
              config={config}
              activePageIndex={activePageIndex}
              onChangePage={setActivePageIndex}
              onUpdateCell={handleUpdateCell}
              onRemoveCell={handleRemoveCell}
              onReorderCells={(newCells) => setGridCells(newCells)}
              onUploadClick={() => hiddenFileInputRef.current?.click()}
            />

            {/* Bottom Photo Manager Carousel */}
            <PhotoList
              photos={photos}
              gridCells={gridCells}
              onAddFiles={handleAddFiles}
              onAddSingleCopy={handleAddSingleCopy}
              onRemovePhoto={handleRemovePhoto}
              onRotatePhoto={handleRotateBasePhoto}
              onResetPhoto={handleResetPhoto}
              onUpdateCopies={handleUpdateCopies}
              onFillGridWithPhoto={handleFillGridWithPhoto}
              onClearAll={handleClearAll}
              cellsPerPage={cellsPerPage}
              isUploading={isUploading}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Print Sheets (Visible ONLY when printing) */}
      <PrintSheetContainer photos={photos} gridCells={gridCells} config={config} />

      {/* Export Progress & Download Modal */}
      <ExportModal
        progress={exportProgress}
        type={exportType}
        downloadUrl={downloadUrl}
        blob={exportBlob}
        fileName={downloadFileName}
        onClose={() => {
          setExportProgress((p) => ({ ...p, active: false, error: null }));
          setDownloadUrl(null);
          setExportBlob(null);
        }}
      />
      
      {/* Photo Cropping Editor */}
      <CropModal
        photo={photoToCrop}
        isOpen={!!photoToCrop}
        onClose={() => setPhotoToCrop(null)}
        onApplyCrop={handleApplyCrop}
      />
    </>
  );
}
export default App;
