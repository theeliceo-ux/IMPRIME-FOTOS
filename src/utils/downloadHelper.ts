/**
 * Safe file download helper that handles browser and iframe download constraints
 */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    document.body.appendChild(link);
    link.click();

    // Clean up after small delay
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {
        // ignore if already removed
      }
    }, 2000);
  } catch (err) {
    console.error('Error in downloadBlob:', err);
  }
}
