import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  WidthType,
  AlignmentType,
  PageOrientation as DocxPageOrientation,
  BorderStyle,
  TextRun,
} from 'docx';
import { PhotoItem, LayoutConfig, ExportProgress, GridCell } from '../types';
import { PAGE_SIZES } from '../constants/presets';
import { renderProcessedImageToCanvas } from './imageOptimizer';

export async function generateDocxDocument(
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

  // Expand photos matching instanceOverrides keys
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

  // 1 mm ~ 56.6929 twips (DXA) in docx
  const mmToTwips = (mm: number) => Math.round(mm * 56.6929);
  // 1 mm ~ 3.7795 px for display transformations in docx ImageRun
  const mmToPx = (mm: number) => Math.round(mm * 3.7795);

  const printableW = Math.max(10, pageW - config.margins.left - config.margins.right);
  const printableH = Math.max(10, pageH - config.margins.top - config.margins.bottom);

  const cellW = (printableW - (config.columns - 1) * config.gapMm) / config.columns;
  const cellH = (printableH - (config.rows - 1) * config.gapMm) / config.rows;

  const sections = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (onProgress) {
      onProgress({
        active: true,
        current: pageIdx + 1,
        total: totalPages,
        stage: `Preparando página Word ${pageIdx + 1} de ${totalPages}...`,
      });
    }

    const startIndex = pageIdx * cellsPerPage;
    const tableRows: TableRow[] = [];

    for (let r = 0; r < config.rows; r++) {
      const cells: TableCell[] = [];

      for (let c = 0; c < config.columns; c++) {
        const cellIndexInPage = r * config.columns + c;
        const photoIndex = startIndex + cellIndexInPage;
        const currentPhoto = expandedPhotos[photoIndex];

        const cellParagraphs: Paragraph[] = [];

        if (currentPhoto) {
          try {
            // Render photo to canvas
            const targetPxW = Math.round(cellW * 6);
            const targetPxH = Math.round(cellH * 6);

            const canvas = await renderProcessedImageToCanvas(
              currentPhoto.photo,
              targetPxW,
              targetPxH,
              config.fitMode,
              config.globalFilter,
              currentPhoto.cell
            );

            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
            );

            let uint8: Uint8Array | null = null;
            if (blob) {
              const arrayBuffer = await blob.arrayBuffer();
              uint8 = new Uint8Array(arrayBuffer);
            } else {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              const binary = atob(dataUrl.split(',')[1]);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              uint8 = bytes;
            }

            if (uint8 && uint8.length > 0) {
              cellParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      type: 'jpg',
                      data: uint8,
                      transformation: {
                        width: Math.max(10, mmToPx(cellW)),
                        height: Math.max(10, mmToPx(cellH)),
                      },
                    }),
                  ],
                })
              );

              if (config.showFileName) {
                cellParagraphs.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: currentPhoto.photo.name,
                        size: 14, // 7pt in half-points
                        color: '64748B',
                      }),
                    ],
                  })
                );
              }
            } else {
              cellParagraphs.push(new Paragraph({ children: [] }));
            }
          } catch (cellErr) {
            console.warn('Error processing image for DOCX cell:', cellErr);
            cellParagraphs.push(new Paragraph({ children: [] }));
          }
        } else {
          // Empty placeholder paragraph
          cellParagraphs.push(new Paragraph({ children: [] }));
        }

        // Cell border style
        let docxBorderStyle: (typeof BorderStyle)[keyof typeof BorderStyle] = BorderStyle.NONE;
        if (config.cellBorder === 'solid-thin' || config.cellBorder === 'solid-medium') {
          docxBorderStyle = BorderStyle.SINGLE;
        } else if (config.cellBorder === 'dashed' || config.cellBorder === 'cut-guides') {
          docxBorderStyle = BorderStyle.DASHED;
        } else if (config.cellBorder === 'dotted') {
          docxBorderStyle = BorderStyle.DOTTED;
        }

        const borderDef = {
          style: docxBorderStyle,
          size: config.cellBorder === 'solid-medium' ? 12 : 6,
          color: config.borderColor.replace('#', '') || '94A3B8',
        };

        cells.push(
          new TableCell({
            width: {
              size: mmToTwips(cellW),
              type: WidthType.DXA,
            },
            borders: {
              top: borderDef,
              bottom: borderDef,
              left: borderDef,
              right: borderDef,
            },
            children: cellParagraphs,
          })
        );
      }

      tableRows.push(new TableRow({ children: cells }));
    }

    const pageChildren: (Paragraph | Table)[] = [];

    if (config.pageHeaderTitle) {
      pageChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: config.pageHeaderTitle,
              bold: true,
              size: 20,
              color: '334155',
            }),
          ],
        })
      );
    }

    pageChildren.push(
      new Table({
        rows: tableRows,
        width: {
          size: mmToTwips(printableW),
          type: WidthType.DXA,
        },
      })
    );

    if (config.showPageNumber) {
      pageChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Página ${pageIdx + 1} de ${totalPages}`,
              size: 16,
              color: '94A3B8',
            }),
          ],
        })
      );
    }

    sections.push({
      properties: {
        page: {
          size: {
            width: mmToTwips(pageW),
            height: mmToTwips(pageH),
            orientation:
              config.orientation === 'landscape'
                ? DocxPageOrientation.LANDSCAPE
                : DocxPageOrientation.PORTRAIT,
          },
          margin: {
            top: mmToTwips(config.margins.top),
            bottom: mmToTwips(config.margins.bottom),
            left: mmToTwips(config.margins.left),
            right: mmToTwips(config.margins.right),
          },
        },
      },
      children: pageChildren,
    });
  }

  const doc = new Document({
    sections,
  });

  return await Packer.toBlob(doc);
}
