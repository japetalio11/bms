/**
 * Utilities for generating CSV, JSON, and printable clinical reports in BMS.
 */

/**
 * Escapes characters and prevents CSV Formula Injection (CWE-1236).
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""'
  let str = String(value).trim()

  // Prevent CSV Formula Injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    str = `"${str.replace(/"/g, '""')}"`
  } else {
    str = `"${str}"`
  }
  return str
}

/**
 * Creates and triggers a download of a CSV file with UTF-8 BOM encoding for Excel compatibility.
 */
export function downloadCsv(
  filename: string,
  headers: (string | number | any)[],
  rows: any[][]
): void {
  const sanitizedHeaders = headers.map(sanitizeCsvCell).join(",")
  const sanitizedRows = rows
    .map((row) => row.map(sanitizeCsvCell).join(","))
    .join("\r\n")

  const csvContent = "\uFEFF" + sanitizedHeaders + "\r\n" + sanitizedRows
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  triggerBlobDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`)
}

/**
 * Creates and triggers a download of formatted JSON data.
 */
export function downloadJson(filename: string, data: any): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
  triggerBlobDownload(blob, filename.endsWith(".json") ? filename : `${filename}.json`)
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Opens a print-ready document in an isolated popup window or iframe for direct printing.
 */
export function openPrintableReportWindow(title: string, htmlBody: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=750")
  if (!printWindow) {
    alert("Please allow popups to generate the printable report.")
    return
  }

  const printDocument = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #111827;
      background: #ffffff;
      padding: 16px;
    }
    .header-container {
      text-align: center;
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-sub {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4b5563;
    }
    .header-facility {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1f2937;
      margin-top: 2px;
    }
    .header-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      margin-top: 4px;
      color: #000000;
      letter-spacing: -0.01em;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #4b5563;
      margin-top: 6px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background-color: #f3f4f6;
      border-left: 3px solid #2563eb;
      padding: 4px 8px;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    th {
      background-color: #f9fafb;
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      color: #374151;
      font-size: 10px;
      text-transform: uppercase;
    }
    td {
      border: 1px solid #e5e7eb;
      padding: 5px 8px;
      color: #1f2937;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background-color: #fafafa;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-high {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }
    .badge-mod {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    .badge-low {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .card-item {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 6px 10px;
      background-color: #fcfcfc;
    }
    .card-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
    }
    .card-value {
      font-size: 11px;
      font-weight: 600;
      color: #111827;
      margin-top: 1px;
    }
    .signature-section {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 45%;
      border-top: 1px solid #9ca3af;
      padding-top: 4px;
      text-align: center;
      font-size: 10px;
      color: #4b5563;
    }
    .sig-box strong {
      display: block;
      color: #111827;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .print-avoid-break {
      page-break-inside: avoid;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="padding: 6px 16px; background-color: #2563eb; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding: 6px 12px; background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; cursor: pointer;">
      Close
    </button>
  </div>
  ${htmlBody}
</body>
</html>
`

  printWindow.document.open()
  printWindow.document.write(printDocument)
  printWindow.document.close()
  printWindow.focus()
}
