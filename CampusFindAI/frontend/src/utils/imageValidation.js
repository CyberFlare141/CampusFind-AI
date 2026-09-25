// Mirrors backend ReportImageStorage rules. The backend remains authoritative.
export const REPORT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const REPORT_IMAGE_MAX_FILES = 5;
export const REPORT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateReportImages(fileList) {
  const files = Array.from(fileList || []);
  if (files.length > REPORT_IMAGE_MAX_FILES) {
    return { files: [], error: `Choose up to ${REPORT_IMAGE_MAX_FILES} images per report.` };
  }
  for (const file of files) {
    if (!file.size) return { files: [], error: 'One of the selected images is empty. Please choose another image.' };
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { files: [], error: 'Only JPG, PNG, and WebP images are allowed.' };
    if (file.size > REPORT_IMAGE_MAX_BYTES) return { files: [], error: 'Each image must be 5 MB or smaller.' };
  }
  return { files, error: '' };
}
