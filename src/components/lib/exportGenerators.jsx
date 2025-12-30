/**
 * Export generation utilities for CSV and JSON
 */

/**
 * Download a file blob
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data, columns) {
  if (!data || data.length === 0) {
    return columns.join(',') + '\n';
  }

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => escapeCSV(row[col])).join(',')
  );

  return header + '\n' + rows.join('\n');
}

/**
 * Generate and download JSON export
 */
export function generateJSON(exportData, filename) {
  const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadFile(jsonBlob, filename);
}

/**
 * Generate and download CSV exports (one file per entity type)
 */
export function generateCSV(exportData, timestamp) {
  const csvFiles = [
    {
      name: `items_${timestamp}.csv`,
      content: convertToCSV(exportData.items, ['id', 'title', 'type', 'content', 'description', 'tags', 'language', 'project_id', 'is_favorite', 'status', 'created_date', 'updated_date'])
    },
    {
      name: `checks_${timestamp}.csv`,
      content: convertToCSV(exportData.checks, ['item_id', 'item_title', 'check_index', 'task_name', 'full_description', 'status', 'is_checked', 'created_date', 'updated_date'])
    },
    {
      name: `templates_${timestamp}.csv`,
      content: convertToCSV(exportData.templates, ['id', 'name', 'type', 'content', 'project_id', 'created_date'])
    },
    {
      name: `ai_settings_${timestamp}.csv`,
      content: convertToCSV(exportData.ai_settings, ['id', 'improve_prompt_instruction', 'model_preference', 'enable_context_suggestions', 'created_date'])
    },
    {
      name: `projects_${timestamp}.csv`,
      content: convertToCSV(exportData.projects, ['id', 'name', 'color', 'description', 'created_date'])
    },
    {
      name: `thoughts_${timestamp}.csv`,
      content: convertToCSV(exportData.thoughts, ['id', 'content', 'project_id', 'focus_type', 'target_page', 'target_component', 'is_deleted', 'created_date'])
    }
  ];

  csvFiles.forEach(file => {
    const csvBlob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' });
    downloadFile(csvBlob, file.name);
  });
}