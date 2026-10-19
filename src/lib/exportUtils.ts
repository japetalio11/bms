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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
      font-family: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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

export function printClinicalReferralSlip(referral: any): void {
  if (!referral) return

  const mother = referral.pregnancy?.mother || referral.patient || {}
  const user = mother.user || {}
  const motherName =
    [
      user.first_name || mother.first_name,
      user.middle_name || mother.middle_name,
      user.last_name || mother.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    referral.motherName ||
    "Patient Record"

  const refId = (referral.referral_id || referral.id || "").toUpperCase()
  const pin = referral.shared_pin || "N/A"
  const fromFacility = referral.fromFacility?.facility_name || "Originating RHU / Health Station"
  const toFacility = referral.toFacility?.facility_name || referral.external_facility_name || "Receiving Facility"
  const dateReferred = referral.date_referred ? new Date(referral.date_referred).toLocaleString() : new Date().toLocaleString()
  const reason = referral.reason || referral.summary || "Urgent obstetric evaluation / higher-level emergency care."

  const latestVisit =
    referral.pregnancy?.prenatalVisits?.[0] ||
    referral.pregnancy?.prenatalVisits?.[referral.pregnancy.prenatalVisits.length - 1] ||
    referral.latestVisit ||
    {}

  const bp = latestVisit.bp_systolic && latestVisit.bp_diastolic
    ? `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic} mmHg`
    : referral.bp_systolic && referral.bp_diastolic
    ? `${referral.bp_systolic}/${referral.bp_diastolic} mmHg`
    : "Not recorded"

  const hr = latestVisit.pulse_rate_bpm ?? referral.pulse_rate_bpm ?? "N/A"
  const temp = latestVisit.temperature_celsius ?? referral.temperature_celsius ?? "N/A"
  const wt = latestVisit.weight_kg ?? referral.weight_kg ?? "N/A"
  const aog = latestVisit.age_of_gestation_weeks ?? referral.pregnancy?.gestational_age ?? "N/A"
  const fht = latestVisit.fetal_heart_tone_bpm ?? "N/A"
  const fundic = latestVisit.fundic_height_cm ?? "N/A"

  const gravida = referral.pregnancy?.gravida != null ? `G${referral.pregnancy.gravida}` : ""
  const parity = referral.pregnancy?.parity != null ? `P${referral.pregnancy.parity}` : ""
  const gp = [gravida, parity].filter(Boolean).join(" ") || "N/A"

  const status = (referral.status || "Pending").toUpperCase()
  const outcome = referral.outcome || null
  const responseNotes = referral.response_notes || null
  const dateResponded = referral.date_responded ? new Date(referral.date_responded).toLocaleString() : null

  const html = `
    <div style="font-family: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; color: #111827; border: 2px solid #1e293b; padding: 24px;">
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 4px;">Republic of the Philippines • Department of Health</h3>
        <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">MATERNAL & NEONATAL TWO-WAY REFERRAL SLIP</h1>
        <p style="font-size: 10px; color: #64748b;">Emergency Obstetric & Newborn Care (BEmONC / CEmONC Handover Slip)</p>
      </div>

      <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 16px; font-size: 11px;">
        <div>
          <strong>Transfer Tracking Code:</strong> <span style="font-family: monospace; font-size: 12px; font-weight: bold;">${refId.slice(-8)}</span>
          <br/><strong>Secure Access PIN:</strong> <span style="font-family: monospace; font-size: 12px; font-weight: bold; color: #2563eb;">${pin}</span>
        </div>
        <div style="text-align: right;">
          <strong>Date Dispatched:</strong> ${dateReferred}
          <br/><strong>Current Status:</strong> <span style="font-weight: bold; color: ${status === "COMPLETED" ? "#16a34a" : "#dc2626"};">[${status}]</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
        <tr>
          <td style="width: 50%; padding: 8px; border: 1px solid #cbd5e1; vertical-align: top;">
            <strong style="color: #475569; text-transform: uppercase; font-size: 10px;">Referring Facility (Origin):</strong>
            <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${fromFacility}</div>
          </td>
          <td style="width: 50%; padding: 8px; border: 1px solid #cbd5e1; vertical-align: top;">
            <strong style="color: #475569; text-transform: uppercase; font-size: 10px;">Receiving Facility (Destination):</strong>
            <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${toFacility}</div>
          </td>
        </tr>
      </table>

      <div style="background: #f1f5f9; padding: 6px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #cbd5e1; border-bottom: none;">
        1. Patient Profile & Obstetric History
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Patient Name:</strong> ${motherName}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Age:</strong> ${mother.age || user.age || "N/A"} yrs</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Blood Type:</strong> ${mother.blood_type || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Gravida / Para:</strong> ${gp}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Gestational Age:</strong> ${aog} weeks</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Civil Status:</strong> ${mother.civil_status || "N/A"}</td>
        </tr>
      </table>

      <div style="background: #f1f5f9; padding: 6px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #cbd5e1; border-bottom: none;">
        2. Clinical Vital Signs at Dispatch
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Blood Pressure:</strong> ${bp}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Pulse Rate:</strong> ${hr} bpm</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Body Temp:</strong> ${temp} °C</td>
        </tr>
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Weight:</strong> ${wt} kg</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Fundic Height:</strong> ${fundic} cm</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"><strong>Fetal Heart Tone:</strong> ${fht} bpm</td>
        </tr>
      </table>

      <div style="background: #f1f5f9; padding: 6px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #cbd5e1; border-bottom: none;">
        3. Reason for Referral & Triage Indications
      </div>
      <div style="border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 16px; font-size: 11px; min-height: 40px; background: #fff;">
        ${reason}
      </div>

      <div style="background: #f1f5f9; padding: 6px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #cbd5e1; border-bottom: none;">
        4. Receiving Facility Counter-Referral / Discharge Feedback (Closing the Loop)
      </div>
      <div style="border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 24px; font-size: 11px; background: ${outcome ? "#f0fdf4" : "#fff"};">
        ${
          outcome
            ? `<div>
                <p><strong>Clinical Outcome / Treatment:</strong> <span style="font-weight: bold; color: #16a34a;">${outcome}</span></p>
                <p style="margin-top: 4px;"><strong>Feedback & Discharge Instructions for Local Health Center:</strong></p>
                <div style="margin-top: 4px; padding: 6px; background: white; border: 1px solid #e2e8f0; font-style: italic;">
                  ${responseNotes || "Patient received standard obstetric care and discharged in stable condition."}
                </div>
                <p style="margin-top: 6px; font-size: 10px; color: #64748b;">Feedback Date: ${dateResponded || "Completed"}</p>
              </div>`
            : `<div style="color: #64748b; font-style: italic;">
                [Awaiting Receiving Facility Intake & Counter-Referral Confirmation]
                <br/><br/>
                Action Taken / Final Diagnosis: ___________________________________________________________
                <br/><br/>
                Discharge Instructions for RHU Midwife: _________________________________________________
                <br/><br/>
                Attending Physician / Midwife Signature: _______________________ Date: _________________
              </div>`
        }
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 10px; text-align: center;">
        <tr>
          <td style="width: 45%; border-top: 1px solid #64748b; padding-top: 4px;">
            Referring Health Worker Signature over Printed Name
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; border-top: 1px solid #64748b; padding-top: 4px;">
            Receiving Hospital Admitting Officer Signature
          </td>
        </tr>
      </table>
    </div>
  `

  openPrintableReportWindow(`Referral_Slip_${refId.slice(-8)}`, html)
}

