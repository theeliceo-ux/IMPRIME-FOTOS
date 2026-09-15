import jsPDF from 'jspdf';
import { PhotoItem, LayoutConfig, ExportProgress, GridCell } from '../types';
import { PAGE_SIZES } from '../constants/presets';
import { renderProcessedImageToCanvas } from './imageOptimizer';

export async function generatePdfDocument(
  photos: PhotoItem[],
  gridCells: GridCell[],
  config: LayoutConfig,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
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

  // Expand photos according to global copies or individual photo copies, matching instanceOverrides keys
  const expandedPhotos: { photo: PhotoItem, cell: GridCell }[] = [];
  const globalCopies = config.globalCopiesPerPhoto || 1;
  gridCells.forEach((c) => {
    const p = photos.find(ph => ph.id === c.photoId);
    if (!p) return;
    for (let i = 0; i < globalCopies; i++) {
      expandedPhotos.push({ photo: p, cell: c });
    }
  });

  const cellsPerPage = config.rows * config.columns;
  const totalPages = Math.max(1, Math.ceil(expandedPhotos.length / cellsPerPage));

  const doc = new jsPDF({
    orientation: config.orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
    compress: true,
  });

  // Calculate printable grid areas
  const headerHeight = config.pageHeaderTitle ? 8 : 0;
  const footerHeight = config.showPageNumber ? 7 : 0;

  const printableX = config.margins.left;
  const printableY = config.margins.top + headerHeight;
  const printableW = Math.max(10, pageW - config.margins.left - config.margins.right);
  const printableH = Math.max(10, pageH - config.margins.top - config.margins.bottom - headerHeight - footerHeight);

  const totalGapX = (config.columns - 1) * config.gapMm;
  const totalGapY = (config.rows - 1) * config.gapMm;

  const cellW = (printableW - totalGapX) / config.columns;
  const cellH = (printableH - totalGapY) / config.rows;

  // DPI scaling for high quality rendering (300 DPI approx = 11.81 pixels per mm)
  const pxScale = 6; // 6 px per mm ~ 152 DPI, balanced speed and print crispness
  const cellPxW = Math.round(cellW * pxScale);
  const cellPxH = Math.round(cellH * pxScale);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage([pageW, pageH], config.orientation === 'landscape' ? 'landscape' : 'portrait');
    }

    if (onProgress) {
      onProgress({
        active: true,
        current: pageIdx + 1,
        total: totalPages,
        stage: `Generando página ${pageIdx + 1} de ${totalPages}...`,
      });
    }

    // Optional Page Header
    if (config.pageHeaderTitle) {
      doc.setFontSize(config.headerFontSizePt || 10);
      doc.setTextColor(71, 85, 105);
      doc.text(config.pageHeaderTitle, pageW / 2, config.margins.top + 5, { align: 'center' });
    }

    // Optional Page Footer
    if (config.showPageNumber) {
      doc.setFontSize(config.footerFontSizePt || 8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${pageIdx + 1} de ${totalPages}`, pageW / 2, pageH - (config.margins.bottom / 2 || 4), {
        align: 'center',
      });
    }

    const startIndex = pageIdx * cellsPerPage;

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        const cellIndexInPage = r * config.columns + c;
        const photoIndex = startIndex + cellIndexInPage;

        const posX = printableX + c * (cellW + config.gapMm);
        const posY = printableY + r * (cellH + config.gapMm);

        const currentPhoto = expandedPhotos[photoIndex];

        // Background color of cell if not white
        if (config.cellBackgroundColor && config.cellBackgroundColor !== '#ffffff') {
          doc.setFillColor(config.cellBackgroundColor);
          doc.rect(posX, posY, cellW, cellH, 'F');
        }

        if (currentPhoto) {
          try {
            // Render photo with rotation, fit mode, and filters to canvas
            const canvas = await renderProcessedImageToCanvas(
              currentPhoto.photo,
              cellPxW,
              cellPxH,
              config.fitMode,
              config.globalFilter,
              currentPhoto.cell
            );

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            doc.addImage(imgData, 'JPEG', posX, posY, cellW, cellH, undefined, 'FAST');

            // Show file name if requested
            if (config.showFileName) {
              doc.setFontSize(7);
              doc.setTextColor(51, 65, 85);
              const textY = posY + cellH + 3.5;
              if (textY < pageH - config.margins.bottom) {
                const truncatedName = currentPhoto.photo.name.length > 25 ? currentPhoto.photo.name.substring(0, 22) + '...' : currentPhoto.photo.name;
                doc.text(truncatedName, posX + cellW / 2, textY, { align: 'center', maxWidth: cellW });
              }
            }
          } catch (cellErr) {
            console.warn('Error rendering photo to PDF cell:', cellErr);
          }
        }

        // Cell border
        if (config.cellBorder !== 'none') {
          doc.setDrawColor(config.borderColor || '#94a3b8');
          doc.setLineWidth(config.borderWidthPt ? config.borderWidthPt * 0.352778 : 0.35); // pt to mm

          if (config.cellBorder === 'dashed') {
            doc.setLineDashPattern([2, 2], 0);
          } else if (config.cellBorder === 'dotted') {
            doc.setLineDashPattern([0.8, 1.2], 0);
          } else {
            doc.setLineDashPattern([], 0);
          }

          if (config.cellRadiusMm > 0) {
            doc.roundedRect(posX, posY, cellW, cellH, config.cellRadiusMm, config.cellRadiusMm, 'S');
          } else {
            doc.rect(posX, posY, cellW, cellH, 'S');
          }
          doc.setLineDashPattern([], 0); // reset
        }

        // Cut guides (Crop Marks / Guías de tijera estilo PhotoScape y Papeamigos)
        if (config.showCutGuides) {
          doc.setDrawColor(config.cutGuideColor || '#cbd5e1');
          doc.setLineWidth(0.2);
          const markLen = 3; // 3mm mark

          // Draw corner ticks outside or at borders
          // Top-left
          doc.line(posX - markLen, posY, posX, posY);
          doc.line(posX, posY - markLen, posX, posY);

          // Top-right
          doc.line(posX + cellW, posY, posX + cellW + markLen, posY);
          doc.line(posX + cellW, posY - markLen, posX + cellW, posY);

          // Bottom-left
          doc.line(posX - markLen, posY + cellH, posX, posY + cellH);
          doc.line(posX, posY + cellH, posX, posY + cellH + markLen);

          // Bottom-right
          doc.line(posX + cellW, posY + cellH, posX + cellW + markLen, posY + cellH);
          doc.line(posX + cellW, posY + cellH, posX + cellW, posY + cellH + markLen);
        }
      }
    }
  }

  return doc.output('blob');
}
