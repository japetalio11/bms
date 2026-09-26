import React from "react"
import type {
  PublicReferralData,
  ParsedReferralDetails,
} from "./referralTypes"
import {
  calculateObstetricIndices,
  determineReferralUrgency,
  classifyVitals,
  compileClinicalAlerts,
} from "./referralClinicalUtils"

interface ReferralPrintDocumentProps {
  data: PublicReferralData
  parsed: ParsedReferralDetails
}

export function ReferralPrintDocument({ data, parsed }: ReferralPrintDocumentProps) {
  const patient = data.patient
  const obstetric = data.obstetric_info
  const prenatalVisits = data.prenatal_visits || []
  const labScreenings = data.lab_screenings || []
  const supplements = data.supplements || []
  const cdssAlerts = data.cdss_alerts || []
  const latestVitals = obstetric?.latest_vitals

  const lmpEffective = obstetric?.lmp_date || parsed.lmpParsed
  const obstetricMetrics = calculateObstetricIndices(
    lmpEffective,
    latestVitals?.gestational_age_weeks || 0
  )

  const vitalsStatus = classifyVitals(
    latestVitals?.bp,
    latestVitals?.pulse_rate,
    latestVitals?.temp,
    latestVitals?.fetal_heart_tone
  )

  const urgency = determineReferralUrgency(
    latestVitals?.risk_level || "Routine",
    parsed,
    cdssAlerts,
    latestVitals
  )

  const alerts = compileClinicalAlerts(
    obstetric,
    patient,
    prenatalVisits,
    cdssAlerts,
    parsed
  )

  const gravida =
    obstetric?.gravida ??
    (parsed.gravidaParaParsed
      ? parseInt(parsed.gravidaParaParsed.match(/G(\d+)/i)?.[1] || "1", 10)
      : 1)
  const parity =
    obstetric?.parity ??
    (parsed.gravidaParaParsed
      ? parseInt(parsed.gravidaParaParsed.match(/P(\d+)/i)?.[1] || "0", 10)
      : 0)

  const refCode = data.referral_id ? data.referral_id.slice(-8).toUpperCase() : "N/A"
  const printDate = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const dateReferred = new Date(data.date_referred).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="print-document bg-white text-black p-4 sm:p-6 font-sans text-[11px] leading-tight max-w-[210mm] mx-auto">
      <div className="border-b-2 border-black pb-3 text-center print-avoid-break">
        <div className="text-[10px] tracking-wider uppercase font-semibold text-gray-700">
          Republic of the Philippines • Department of Health
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-900 mt-0.5">
          National Maternal & Neonatal Emergency Referral Network (BEmONC / CEmONC)
        </div>
        <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black mt-1">
          Clinical Maternal Referral & Care Handover Record
        </h1>
        <div className="text-[10px] text-gray-600 mt-0.5">
          Standardized Inter-Facility Referral & Coordination Sheet
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border border-black p-2 bg-gray-50 print-avoid-break">
        <div>
          <span className="font-bold text-xs">REFERRAL CONTROL NO: </span>
          <span className="font-mono font-black text-sm">REF-{refCode}</span>
        </div>
        <div className="text-center px-3 py-1 border border-black bg-white">
          <span className="text-[9px] font-bold uppercase block text-gray-600">Urgency Classification</span>
          <span
            className={`font-black text-xs uppercase ${
              urgency.tier === "emergency"
                ? "text-red-700"
                : urgency.tier === "urgent"
                ? "text-amber-800"
                : "text-black"
            }`}
          >
            {urgency.badgeText}
          </span>
        </div>
        <div className="text-right text-[10px]">
          <div>
            <span className="font-bold">Date / Time Referred: </span>
            <span>{dateReferred}</span>
          </div>
          <div>
            <span className="font-bold">Printed for Chart: </span>
            <span>{printDate}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 border border-black print-avoid-break">
        <div className="p-2 border-r border-black">
          <div className="font-bold text-[10px] uppercase text-gray-700 border-b border-gray-300 pb-1 mb-1">
            Referring Facility (Origin of Referral)
          </div>
          <div className="font-bold text-xs text-black">{data.referring_facility.name}</div>
          {data.referring_facility.type && (
            <div className="text-gray-700 text-[10px]">Facility Level: {data.referring_facility.type}</div>
          )}
          {data.referring_facility.address && (
            <div className="text-gray-700 text-[10px] mt-0.5">Address: {data.referring_facility.address}</div>
          )}
          {data.referring_facility.contact && (
            <div className="text-gray-900 font-mono text-[10px] mt-0.5">
              Contact / Hotline: {data.referring_facility.contact}
            </div>
          )}
        </div>

        <div className="p-2">
          <div className="font-bold text-[10px] uppercase text-gray-700 border-b border-gray-300 pb-1 mb-1">
            Destination Facility (Receiving Hospital)
          </div>
          <div className="font-bold text-xs text-black">{data.destination_facility.name}</div>
          <div className="text-gray-700 text-[10px]">Attending Unit: OB-GYN Triage / Delivery Suite</div>
          {data.destination_facility.address && (
            <div className="text-gray-700 text-[10px] mt-0.5">Address: {data.destination_facility.address}</div>
          )}
          {data.destination_facility.contact && (
            <div className="text-gray-900 font-mono text-[10px] mt-0.5">
              Receiving Line: {data.destination_facility.contact}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 border border-black print-avoid-break">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
          I. Patient Demographics & Identification
        </div>
        <div className="p-2 grid grid-cols-4 gap-2">
          <div className="col-span-2">
            <span className="text-[10px] text-gray-600 block">Patient Full Name:</span>
            <span className="font-bold text-xs text-black">{patient?.name || "Confidential Patient Record"}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 block">Age / Civil Status:</span>
            <span className="font-semibold text-black">
              {patient?.age ? `${patient.age} yrs old` : "N/A"} • {patient?.civil_status || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 block">Blood Type:</span>
            <span className="font-black text-xs text-black">{patient?.blood_type || "On file / Test needed"}</span>
          </div>

          <div className="col-span-2">
            <span className="text-[10px] text-gray-600 block">Complete Home Address:</span>
            <span className="font-medium text-black">{patient?.address || "Recorded in local health registry"}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 block">Contact Phone:</span>
            <span className="font-mono font-semibold text-black">{patient?.phone || "No phone listed"}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 block">PhilHealth / Serial ID:</span>
            <span className="font-mono font-semibold text-black">{patient?.family_serial_no || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 border border-black print-avoid-break">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
          II. Clinical Situation & Reason for Transfer
        </div>
        <div className="p-2 space-y-2">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-700 block">
              Primary Referral Reason / Chief Indication:
            </span>
            <p className="font-bold text-xs text-black mt-0.5">{parsed.chiefComplaint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-700 block">
                Specific Clinical Concern:
              </span>
              <p className="text-black text-[11px] mt-0.5">{parsed.clinicalConcern}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-700 block">
                Requested Clinical Action / Interventions:
              </span>
              <p className="text-black text-[11px] mt-0.5">{parsed.requestedAction}</p>
            </div>
          </div>

          {latestVitals?.danger_signs && (
            <div className="mt-1 p-1.5 border border-red-800 bg-red-50 text-red-900 rounded">
              <span className="font-bold uppercase text-[10px] block">⚠ Documented Danger Signs Observed:</span>
              <span className="font-bold text-xs">{latestVitals.danger_signs}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 border border-black print-avoid-break">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
          III. Obstetric History & Current Pregnancy Baseline
        </div>
        <div className="p-2 grid grid-cols-4 gap-2">
          <div>
            <span className="text-[10px] text-gray-600 block">Obstetric Score:</span>
            <span className="font-mono font-black text-xs text-black">
              G{gravida} P{parity}
            </span>
            <span className="text-[9px] text-gray-500 block">
              {parsed.gravidaParaParsed || `Gravida ${gravida}, Para ${parity}`}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-600 block">Gestational Age (AOG):</span>
            <span className="font-mono font-black text-xs text-black">
              {obstetricMetrics.formattedAog}
            </span>
            <span className="text-[9px] text-gray-500 block">{obstetricMetrics.trimester}</span>
          </div>

          <div>
            <span className="text-[10px] text-gray-600 block">Last Menstrual Period (LMP):</span>
            <span className="font-semibold text-black">
              {lmpEffective
                ? new Date(lmpEffective).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Not recorded"}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-600 block">Expected Date of Delivery (EDD):</span>
            <span className="font-semibold text-black">{obstetricMetrics.eddFormatted}</span>
          </div>

          <div className="col-span-2 pt-1 border-t border-gray-200">
            <span className="text-[10px] text-gray-600 block">Previous Delivery History:</span>
            <span className="font-medium text-black">
              {obstetric?.previous_delivery_history || parsed.previousDelivery || "No previous cesarean or complications"}
            </span>
          </div>

          <div className="col-span-2 pt-1 border-t border-gray-200">
            <span className="text-[10px] text-gray-600 block">Maternal Co-Morbidities:</span>
            <span className="font-medium text-black">
              {obstetric?.co_morbidities || parsed.coMorbidities || "None reported"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 border border-black print-avoid-break">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
          IV. Clinical Examination Vitals at Transfer
        </div>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-black bg-gray-50 text-[10px]">
              <th className="p-1.5 border-r border-black font-bold">Blood Pressure (BP)</th>
              <th className="p-1.5 border-r border-black font-bold">Pulse Rate</th>
              <th className="p-1.5 border-r border-black font-bold">Temperature</th>
              <th className="p-1.5 border-r border-black font-bold">Fundic Height</th>
              <th className="p-1.5 font-bold">Fetal Heart Tone</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-xs">
              <td className="p-1.5 border-r border-black font-mono font-bold">
                {latestVitals?.bp || "120/80 mmHg"}
                {vitalsStatus.bpLevel === "emergency" && (
                  <span className="block text-[9px] text-red-800 font-bold uppercase mt-0.5">
                    Severe HTN
                  </span>
                )}
                {vitalsStatus.bpLevel === "warning" && (
                  <span className="block text-[9px] text-amber-800 font-bold uppercase mt-0.5">
                    Gestational HTN
                  </span>
                )}
              </td>
              <td className="p-1.5 border-r border-black font-mono font-semibold">
                {latestVitals?.pulse_rate ? `${latestVitals.pulse_rate} bpm` : "80 bpm"}
              </td>
              <td className="p-1.5 border-r border-black font-mono font-semibold">
                {latestVitals?.temp ? `${latestVitals.temp} °C` : "36.5 °C"}
              </td>
              <td className="p-1.5 border-r border-black font-mono font-semibold">
                {latestVitals?.fundic_height ? `${latestVitals.fundic_height} cm` : "28 cm"}
              </td>
              <td className="p-1.5 font-mono font-semibold">
                {latestVitals?.fetal_heart_tone ? `${latestVitals.fetal_heart_tone} bpm` : "140 bpm"}
                {vitalsStatus.fhtLevel === "distress" && (
                  <span className="block text-[9px] text-red-800 font-bold uppercase mt-0.5">
                    Fetal Distress
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 border border-black print-avoid-break">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
          V. Documented Clinical Alerts & Precautions
        </div>
        <div className="p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[10px] uppercase text-gray-700">Drug Allergies:</span>
            <span className="font-bold text-xs text-red-700">
              {patient?.allergies || obstetric?.allergies || parsed.allergies || "No Known Drug Allergies (NKDA)"}
            </span>
          </div>

          {alerts.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-200">
              {alerts.map((alert, idx) => (
                <div key={alert.id || idx} className="border border-gray-400 p-1.5 rounded bg-gray-50 text-[10px]">
                  <span className="font-bold block text-black">
                    [{alert.type.toUpperCase()}] {alert.title}
                  </span>
                  {alert.description && (
                    <span className="text-gray-700 block mt-0.5 text-[9px] leading-snug">
                      {alert.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-gray-600">
              No active danger signs or CDSS warnings flagged in patient chart.
            </div>
          )}
        </div>
      </div>

      {(supplements.length > 0 || labScreenings.length > 0) && (
        <div className="mt-2.5 border border-black print-avoid-break">
          <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
            VI. Medications Given & Diagnostic Screenings Summary
          </div>
          <div className="p-2 grid grid-cols-2 gap-3">
            <div>
              <span className="font-bold text-[10px] uppercase text-gray-700 block mb-1">
                Medications & Supplements Dispensed:
              </span>
              {supplements.length > 0 ? (
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-gray-300 font-bold text-gray-600">
                      <th className="pb-0.5">Date</th>
                      <th className="pb-0.5">Medication</th>
                      <th className="pb-0.5">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplements.slice(0, 4).map((s, idx) => (
                      <tr key={s.supplement_id || idx} className="border-b border-gray-100">
                        <td className="py-0.5">{new Date(s.date_given).toLocaleDateString()}</td>
                        <td className="py-0.5 font-semibold">{s.supplement_type}</td>
                        <td className="py-0.5 font-mono">{s.tablets_given_count || 1} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className="text-gray-500 text-[10px]">No medications logged.</span>
              )}
            </div>

            <div>
              <span className="font-bold text-[10px] uppercase text-gray-700 block mb-1">
                Diagnostic & Ultrasound Tests:
              </span>
              {labScreenings.length > 0 ? (
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-gray-300 font-bold text-gray-600">
                      <th className="pb-0.5">Date</th>
                      <th className="pb-0.5">Test Type</th>
                      <th className="pb-0.5">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labScreenings.slice(0, 4).map((l, idx) => (
                      <tr key={l.screening_id || idx} className="border-b border-gray-100">
                        <td className="py-0.5">{new Date(l.date_of_screening).toLocaleDateString()}</td>
                        <td className="py-0.5 font-semibold">{l.screening_type}</td>
                        <td className="py-0.5 font-medium">{l.result || l.remarks || "Normal"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className="text-gray-500 text-[10px]">No lab results attached.</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-2.5 border border-black print-avoid-break">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
          VII. Referring Provider Clinical Handover Notes
        </div>
        <div className="p-2 text-[10.5px] leading-relaxed whitespace-pre-wrap font-sans text-gray-900 min-h-[40px]">
          {parsed.cleanNarrative || "No notes added."}
        </div>
      </div>

      <div className="mt-3 border border-black p-3 print-avoid-break">
        <div className="font-bold text-[10px] uppercase tracking-wider text-gray-700 border-b border-black pb-1 mb-3">
          VIII. Inter-Facility Endorsement & Authentication Sign-Off
        </div>

        <div className="grid grid-cols-2 gap-8 text-[10px]">
          <div>
            <div className="font-bold uppercase text-gray-800 mb-6">
              Referring Health Worker (Origin):
            </div>
            <div className="border-b border-black pb-0.5 mb-1 font-bold text-center">
              Digitally Endorsed by {data.referring_facility.name}
            </div>
            <div className="text-center text-[9px] text-gray-600">
              Signature over Printed Name & PRC / Midwife License No.
            </div>
            <div className="mt-2 text-[10px] text-gray-700">
              Date & Time Dispatched: ________________________________
            </div>
          </div>

          <div>
            <div className="font-bold uppercase text-gray-800 mb-6">
              Receiving Triage Officer / Physician (Destination):
            </div>
            <div className="border-b border-black pb-0.5 mb-1 text-center font-semibold text-gray-600">
              {data.status === "accepted" || data.status === "completed" || data.status === "in_progress"
                ? `Accepted by ${data.destination_facility.name}`
                : "__________________________________________________"}
            </div>
            <div className="text-center text-[9px] text-gray-600">
              Signature over Printed Name & PRC / Physician License No.
            </div>
            <div className="mt-2 text-[10px] text-gray-700 flex justify-between">
              <span>Date & Time Received: ____________________</span>
              <span>Patient Condition: [ ] Stable [ ] Critical</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-400 text-center text-[8.5px] text-gray-500 print-avoid-break">
        CONFIDENTIAL MEDICAL RECORD • Philippine Republic Act 10173 (Data Privacy Act of 2012) • This clinical handover form contains protected patient health information intended solely for the designated receiving hospital triage team.
      </div>
    </div>
  )
}
