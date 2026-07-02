/**
 * Reusable utility to export an array of objects to a CSV file.
 * Handles nested keys (e.g., 'data.startupTitle') and escapes special characters.
 */
export function exportToCSV(data: any[], filename: string, headers: string[], keys: string[]) {
  const csvRows: string[] = [];
  
  // 1. Add headers (wrapped in double quotes)
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
  
  // 2. Add data rows
  for (const row of data) {
    const values = keys.map(key => {
      // Resolve nested properties (e.g., "data.startupTitle")
      let val = key.split('.').reduce((obj, k) => obj?.[k], row);
      if (val === undefined || val === null) {
        val = '';
      }
      // Format arrays or objects as JSON strings
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      // Escape quotes and wrap in quotes
      const stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    });
    csvRows.push(values.join(','));
  }
  
  // 3. Create blob with BOM for UTF-8 support in Excel and download
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
