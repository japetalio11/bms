import type { HelpCategory, FaqItem } from "../types/helpTypes"

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started & Clinic Shift Basics",
    shortTitle: "Basics & Navigation",
    iconName: "Compass",
    description: "Learn how to log in, navigate the dashboard, lock your station with a PIN, and switch display themes.",
    topics: [
      {
        id: "daily-login-shift",
        categoryId: "getting-started",
        title: "Starting Your Daily Clinic Shift & Logging In",
        shortDescription: "How to safely log in to your RHU staff account and start your day.",
        badge: "Essential",
        estimatedReadMinutes: 2,
        whenToUse: "Every morning or whenever you start your clinic consultation hours.",
        whoCanUse: "All Midwives, Nurses, Doctors, and Barangay Health Workers.",
        steps: [
          {
            stepNumber: 1,
            title: "Open the BMS Web Portal",
            instruction: "Open your web browser (Google Chrome or Microsoft Edge recommended) and navigate to the BMS clinic address.",
            actionTarget: "Browser address bar",
            substeps: [
              "Make sure you bookmark the portal URL for quick access during busy clinic days.",
              "Even if your clinic internet is slow or temporarily down, you can still load the cached page if you have used the system on this computer before."
            ]
          },
          {
            stepNumber: 2,
            title: "Enter Your Official Staff Email and Password",
            instruction: "Type your registered clinic email address and password in the sign-in form.",
            actionTarget: "Login Form",
            note: "Do not share your personal account password with other staff members. Patient data confidentiality is strictly protected by law.",
            noteType: "warning"
          },
          {
            stepNumber: 3,
            title: "Check Your Facility Name at the Top of the Sidebar",
            instruction: "Once logged in, look at the top left of the screen under the BMS logo. Verify that your Rural Health Unit (e.g., 'Rural Health Unit 1') and your staff role are displayed.",
            actionTarget: "Sidebar Header"
          }
        ],
        screenshotMockup: {
          title: "BMS Live Dashboard & Top Bar",
          caption: "Real-time view of Rural Health Unit operations, active pregnancies count, and quick shortcuts.",
          layoutType: "dashboard",
          customImageUrl: "/help-screenshots/dashboard.png"
        },
        proTips: [
          "If you are using a shared clinic computer, always lock your shift or log out when you leave your consultation desk.",
          "Use the Dark/Light mode toggle in the top header (Sun/Moon icon) if you find the screen too bright during evening duty."
        ]
      },
      {
        id: "offline-pin-lock",
        categoryId: "getting-started",
        title: "Setting Up & Using the 4-Digit Shift Unlock PIN",
        shortDescription: "Lock and unlock your station in 2 seconds between patient checkups without retyping passwords.",
        badge: "Time Saver",
        estimatedReadMinutes: 2,
        whenToUse: "Whenever you step away from your consultation desk to attend to a delivery, wash hands, or take a break.",
        whoCanUse: "All Healthcare Staff with active sessions.",
        steps: [
          {
            stepNumber: 1,
            title: "First-Time Setup: Create Your 4-Digit PIN",
            instruction: "When you first sign in, BMS displays the 'Set Offline Security PIN' popup. Enter any 4-digit number you can easily remember (e.g. 1985 or 2468), then re-enter to confirm.",
            actionTarget: "PIN Setup Modal",
            note: "Choose a memorable 4-digit code. You will use this throughout your shift.",
            noteType: "tip"
          },
          {
            stepNumber: 2,
            title: "Locking Your Station Quickly",
            instruction: "Click on your profile avatar at the bottom left of the sidebar, then click 'Lock Offline Shift' with the amber lock icon.",
            actionTarget: "Sidebar Account Menu -> Lock Offline Shift",
            substeps: [
              "Your screen immediately turns into a secure lock screen.",
              "All clinical records are safely protected from unauthorized eyes."
            ]
          },
          {
            stepNumber: 3,
            title: "Unlocking in Seconds",
            instruction: "When you return to your desk, enter your 4 digits on the PIN keypad. Your previous page and any open form will instantly restore.",
            actionTarget: "PIN Unlock Keypad"
          }
        ],
        screenshotMockup: {
          title: "Offline Quick-Unlock PIN Screen",
          caption: "Simple 4-digit keypad protects maternal confidentiality while enabling rapid resumption.",
          layoutType: "offline-pin",
          customImageUrl: "/help-screenshots/pin-lock.png"
        },
        clinicalSafetyNotes: [
          "Patient health data (especially prenatal history and pregnancy complications) is protected under the Data Privacy Act. Always lock your shift when leaving your consultation desk."
        ]
      }
    ]
  },
  {
    id: "mothers-registry",
    title: "Maternal Registry (Mothers)",
    shortTitle: "Maternal Registry",
    iconName: "Users",
    description: "How to register new mothers, scan QR codes, search patient records, and organize barangay assignments.",
    topics: [
      {
        id: "register-new-mother",
        categoryId: "mothers-registry",
        title: "Registering a New Mother (Step-by-Step)",
        shortDescription: "Complete guide on recording a walk-in pregnant patient for the first time.",
        badge: "Core Workflow",
        estimatedReadMinutes: 3,
        whenToUse: "When an expectant mother comes to the Rural Health Unit for her initial prenatal intake.",
        whoCanUse: "Midwives, Public Health Nurses, Barangay Health Workers, and Facility Staff.",
        steps: [
          {
            stepNumber: 1,
            title: "Click '+ Quick Create' or 'Register Mother'",
            instruction: "In the top header, click the '+ Quick Create' button and select 'Register Mother'. Alternatively, go to 'Mothers' in the sidebar and click the '+ Register Mother' button.",
            actionTarget: "Header '+ Quick Create' or Mothers Page button"
          },
          {
            stepNumber: 2,
            title: "Step 1: Enter Personal Identity Information",
            instruction: "Fill in the mother's First Name, Middle Name, Last Name, Date of Birth, Civil Status, Blood Type, and PhilHealth / Family Serial Number.",
            actionTarget: "Register Mother Form - Step 1",
            substeps: [
              "Verify the spelling against her government ID or PhilHealth card.",
              "If the exact blood type is not yet known, choose 'Unknown' and update it once laboratory results return."
            ]
          },
          {
            stepNumber: 3,
            title: "Step 2: Enter Contact Number and Barangay Address",
            instruction: "Type the mother's active mobile phone number, email (if available), and her complete residence address.",
            actionTarget: "Register Mother Form - Step 2",
            note: "An active mobile number is essential! BMS automatically sends SMS appointment reminders to this number before her checkups.",
            noteType: "tip"
          },
          {
            stepNumber: 4,
            title: "Step 3: Assign Primary Healthcare Worker & Submit",
            instruction: "Select the midwife or health worker responsible for her monitoring, then click 'Complete Registration'.",
            actionTarget: "Register Mother Form - Step 3",
            substeps: [
              "The mother is immediately saved into your clinic database.",
              "BMS automatically creates her mobile patient account with the default password: Mother@123. Share this with her so she can download the BMS Mother Mobile App!"
            ]
          }
        ],
        screenshotMockup: {
          title: "Register Mother Modal",
          caption: "3-step registration wizard ensures complete personal, contact, and clinic assignment data.",
          layoutType: "register-modal",
          customImageUrl: "/help-screenshots/register-modal.png"
        },
        proTips: [
          "Tell the mother: 'You can download the BMS mobile app on your Android phone, sign in with your phone number, and type Mother@123 as the initial password.'",
          "If the internet is disconnected, the registration is saved locally and will upload automatically once connection is restored."
        ],
        offlineNotes: [
          "Registration works 100% offline! You do not need to wait for internet signal during remote barangay outreach."
        ]
      },
      {
        id: "search-filter-mothers",
        categoryId: "mothers-registry",
        title: "Searching, Filtering & Exporting Maternal Records",
        shortDescription: "Quickly locate any patient by name, barangay, or high-risk medical status.",
        badge: "Daily Task",
        estimatedReadMinutes: 2,
        whenToUse: "When searching for a mother who just arrived for consultation or preparing monthly barangay reports.",
        whoCanUse: "All Clinic Staff.",
        steps: [
          {
            stepNumber: 1,
            title: "Navigate to the 'Mothers' Section",
            instruction: "Click 'Mothers' on the left sidebar to open the maternal registry table.",
            actionTarget: "Sidebar -> Mothers"
          },
          {
            stepNumber: 2,
            title: "Use Instant Search",
            instruction: "Type the mother's first name, last name, or PhilHealth number into the search box at the top of the table. The list filters instantly as you type.",
            actionTarget: "Maternal Table Search Bar"
          },
          {
            stepNumber: 3,
            title: "Filter by Risk Level or Barangay",
            instruction: "Click the 'Filters' button to narrow results by 'High Risk', 'Medium Risk', or specific barangays.",
            actionTarget: "Filter Dropdown Button",
            substeps: [
              "Switch to the 'High Risk' tab at any time to see only mothers flagged for medical complications.",
              "Switch to 'My Assigned' to see mothers assigned directly to your care."
            ]
          },
          {
            stepNumber: 4,
            title: "Export Records for DOH Reporting",
            instruction: "Click 'Export' in the top right to download the maternal registry as an Excel spreadsheet or printable PDF report.",
            actionTarget: "Export Button"
          }
        ],
        screenshotMockup: {
          title: "Maternal Registry Table & Risk Badges",
          caption: "Clear status badges (High Risk, Normal) and quick actions for every patient.",
          layoutType: "mother-list",
          customImageUrl: "/help-screenshots/mothers-list.png"
        }
      }
    ]
  },
  {
    id: "prenatal-clinical",
    title: "Clinical Profile, Vitals & Risk Scoring (CDSS)",
    shortTitle: "Prenatal Vitals & CDSS",
    iconName: "HeartPulse",
    description: "Guide on recording checkup vitals, fundic height, fetal heart rate, and understanding automated High-Risk warnings.",
    topics: [
      {
        id: "log-prenatal-vitals",
        categoryId: "prenatal-clinical",
        title: "Logging Prenatal Vitals & Danger Signs (TEWS / CDSS)",
        shortDescription: "How to record blood pressure, fundic height, fetal heart tones, and identify clinical risks.",
        badge: "Critical Clinical",
        estimatedReadMinutes: 4,
        whenToUse: "During every routine or urgent prenatal consultation.",
        whoCanUse: "Midwives, Nurses, and Physicians.",
        steps: [
          {
            stepNumber: 1,
            title: "Open the Mother's Profile and Click 'Log Vitals'",
            instruction: "From the Mothers list, click on the patient's row. In the profile header, click the pink/primary button labeled 'Log Vitals'.",
            actionTarget: "Mother Profile -> 'Log Vitals' Button"
          },
          {
            stepNumber: 2,
            title: "Enter Vital Signs Measurements",
            instruction: "Fill in the checkup measurements:",
            actionTarget: "Log Vitals Modal",
            substeps: [
              "Blood Pressure (Systolic and Diastolic) — e.g. 120 / 80",
              "Weight in kilograms — e.g. 58.5 kg",
              "Temperature (°C) and Pulse Rate (bpm)",
              "Fundic Height in cm (e.g. 24 cm) and Fetal Heart Tone in bpm (e.g. 142 bpm)",
              "Fetal Presentation (Cephalic, Breech, Shoulder, or Transverse)"
            ]
          },
          {
            stepNumber: 3,
            title: "Check for Danger Signs (Critical Obstetric Symptoms)",
            instruction: "Review the danger signs checklist and check any boxes that apply to the mother:",
            actionTarget: "Danger Signs Checklist",
            substeps: [
              "Vaginal Bleeding",
              "Severe Headache or Blurring of Vision",
              "Edema (Severe facial or leg swelling)",
              "Fever (>38.0°C)",
              "Severe Abdominal Pain"
            ],
            note: "If ANY danger sign is checked, BMS will automatically classify the pregnancy as High Risk and trigger an immediate warning banner.",
            noteType: "warning"
          },
          {
            stepNumber: 4,
            title: "Review the Automated CDSS Risk Banner and Save",
            instruction: "Look at the risk alert box at the bottom of the form. It displays the calculated score (Low Risk, Moderate Risk, or High Risk) along with clinical advice. Click 'Save Clinical Record'.",
            actionTarget: "Save Button"
          }
        ],
        screenshotMockup: {
          title: "Log Vitals & Clinical Decision Support (CDSS)",
          caption: "Real-time obstetric risk calculation with immediate clinical danger alerts.",
          layoutType: "profile-vitals",
          customImageUrl: "/help-screenshots/log-vitals.png"
        },
        clinicalSafetyNotes: [
          "Normal Fetal Heart Tone (FHT) is between 110 and 160 beats per minute. FHT below 110 or above 160 requires immediate reassessment and doctor consultation.",
          "Blood pressure of 140/90 mmHg or higher with headache, visual changes, or epigastric pain indicates possible Pre-eclampsia / Eclampsia. Prepare for emergency stabilization and referral."
        ]
      },
      {
        id: "manage-labs-supplements",
        categoryId: "prenatal-clinical",
        title: "Recording Lab Tests, Ultrasounds & Micronutrients",
        shortDescription: "Track blood tests, urine tests, sonograms, and Iron/Folic Acid distribution.",
        badge: "Routine Care",
        estimatedReadMinutes: 3,
        whenToUse: "When laboratory results arrive or when dispensing routine prenatal vitamins.",
        whoCanUse: "Midwives and Nurses.",
        steps: [
          {
            stepNumber: 1,
            title: "Select the 'Laboratory' Tab in the Mother's Profile",
            instruction: "Click the 'Laboratory' tab to view past lab reports. Click '+ Record Laboratory' to add new results.",
            actionTarget: "Mother Profile -> Laboratory Tab"
          },
          {
            stepNumber: 2,
            title: "Enter Diagnostic Results",
            instruction: "Select the test type (CBC / Hemoglobin, Urinalysis, Hepatitis B Surface Antigen, Syphilis / VDRL, Blood Typing, or Ultrasound) and enter findings.",
            actionTarget: "Lab Record Modal",
            substeps: [
              "For Ultrasound: Record Gestational Age, Placental Location, and Amniotic Fluid status.",
              "For CBC: Note Hemoglobin level (flag if < 11.0 g/dL for maternal anemia)."
            ]
          },
          {
            stepNumber: 3,
            title: "Switch to 'Prescriptions' Tab for Supplements",
            instruction: "Click 'Prescriptions' tab and click '+ Record Supplement'. Enter the quantity of Iron + Folic Acid tablets or Calcium Carbonate dispensed to the mother.",
            actionTarget: "Prescriptions Tab -> '+ Record Supplement'"
          }
        ],
        screenshotMockup: {
          title: "Laboratory & Supplement Clinical Tabs",
          caption: "Organized records of blood tests, sonograms, and micronutrient dispensing.",
          layoutType: "ehr",
          customImageUrl: "/help-screenshots/mother-profile.png"
        }
      }
    ]
  },
  {
    id: "appointments-calendar",
    title: "Appointments & Clinic Calendar",
    shortTitle: "Appointments & Calendar",
    iconName: "Calendar",
    description: "Scheduling prenatal follow-ups, managing the daily clinic roster, and using sidepeek check-in.",
    topics: [
      {
        id: "create-appointment",
        categoryId: "appointments-calendar",
        title: "Scheduling a Prenatal Appointment",
        shortDescription: "Book a follow-up consultation and automatically notify the mother via SMS.",
        badge: "Core Workflow",
        estimatedReadMinutes: 2,
        whenToUse: "At the end of every prenatal visit before the mother leaves the clinic.",
        whoCanUse: "All Clinic Staff.",
        steps: [
          {
            stepNumber: 1,
            title: "Open the New Appointment Form",
            instruction: "Click the '+ Quick Create' button in the top header and select 'New Appointment'. Or from the Calendar page, click '+ New Appointment'.",
            actionTarget: "Header '+ Quick Create' -> 'New Appointment'"
          },
          {
            stepNumber: 2,
            title: "Select the Patient and Appointment Type",
            instruction: "Search for and select the mother's name. Choose the type of visit (e.g., 'Prenatal Checkup', 'Postpartum Follow-up', 'Laboratory Visit', or 'High Risk Review').",
            actionTarget: "Appointment Form"
          },
          {
            stepNumber: 3,
            title: "Pick Date, Time, and Staff",
            instruction: "Select the date on the calendar picker and the estimated consultation time (e.g. 08:30 AM).",
            actionTarget: "Date & Time Picker",
            substeps: [
              "Normal prenatal schedule: Once a month up to 28 weeks; every 2 weeks up to 36 weeks; weekly from 36 weeks until delivery.",
              "High-risk pregnancies should be scheduled more frequently as advised by the physician."
            ]
          },
          {
            stepNumber: 4,
            title: "Click 'Save Appointment'",
            instruction: "Click the blue 'Schedule Appointment' button. The booking immediately appears on the clinic calendar and triggers an SMS reminder to the mother.",
            actionTarget: "Submit Button"
          }
        ],
        screenshotMockup: {
          title: "Clinic Calendar & Schedule View",
          caption: "Color-coded calendar displays today's maternal visits and high-risk flags.",
          layoutType: "calendar",
          customImageUrl: "/help-screenshots/calendar.png"
        }
      },
      {
        id: "appointment-sidepeek",
        categoryId: "appointments-calendar",
        title: "Using the Appointment Sidepeek (Check-in & Status)",
        shortDescription: "Complete check-ins, record consultations, and mark visits finished in one click.",
        badge: "Daily Task",
        estimatedReadMinutes: 2,
        whenToUse: "When patients arrive at the clinic waiting area.",
        whoCanUse: "Triage Nurses and Midwives.",
        steps: [
          {
            stepNumber: 1,
            title: "Click Any Appointment Row in the Table or Calendar",
            instruction: "When a mother arrives, click her name in the Appointments list or Calendar event box. A convenient drawer opens on the right side of the screen.",
            actionTarget: "Appointment Table Row"
          },
          {
            stepNumber: 2,
            title: "Update Status to 'Checked In' or 'Completed'",
            instruction: "Use the status button in the sidepeek to update her progress: 'Pending' -> 'Checked In' -> 'Completed'.",
            actionTarget: "Sidepeek Status Buttons"
          },
          {
            stepNumber: 3,
            title: "Click 'View Full Mother Profile'",
            instruction: "Click the 'View Profile' link inside the sidepeek to jump straight to her clinical file without losing your place.",
            actionTarget: "Sidepeek Profile Link"
          }
        ],
        screenshotMockup: {
          title: "Appointments List View",
          caption: "Searchable table of all scheduled, completed, and cancelled visits.",
          layoutType: "dashboard",
          customImageUrl: "/help-screenshots/appointments.png"
        }
      }
    ]
  },
  {
    id: "referrals",
    title: "Inter-Clinic Referrals (Emergency & Hospital Transfers)",
    shortTitle: "Inter-Clinic Referrals",
    iconName: "ArrowRightLeft",
    description: "How to refer high-risk mothers to district or tertiary hospitals, track ambulances, and share tracking links.",
    topics: [
      {
        id: "create-referral",
        categoryId: "referrals",
        title: "Creating an Emergency Referral (Step-by-Step)",
        shortDescription: "Transfer a compromised mother safely to a hospital with real-time digital clinical handoff.",
        badge: "Emergency Protocol",
        estimatedReadMinutes: 4,
        whenToUse: "Whenever a mother develops complications that exceed the Rural Health Unit's delivery capacity.",
        whoCanUse: "Attending Midwives, Nurses, and Municipal Health Officers.",
        steps: [
          {
            stepNumber: 1,
            title: "Click '+ Quick Create' -> 'Create Referral'",
            instruction: "Click the '+ Quick Create' button in the top bar or go to 'Referrals' in the sidebar and click '+ New Referral'.",
            actionTarget: "Header '+ Quick Create' -> 'Create Referral'"
          },
          {
            stepNumber: 2,
            title: "Step 1: Select Patient and Receiving Hospital",
            instruction: "Choose the mother's name and select the destination healthcare facility (e.g., 'Bicol Medical Center', 'Provincial Hospital', or 'District Hospital').",
            actionTarget: "Create Referral Form - Step 1"
          },
          {
            stepNumber: 3,
            title: "Step 2: Enter Current Vitals & Clinical Indicators",
            instruction: "Verify and enter the mother's latest Blood Pressure, Pulse, Temperature, Gestational Age, and Fetal Heart Tone.",
            actionTarget: "Create Referral Form - Step 2"
          },
          {
            stepNumber: 4,
            title: "Step 3: Specify Urgency, Reason & Transport Method",
            instruction: "Select the clinical urgency level:",
            actionTarget: "Create Referral Form - Step 3",
            substeps: [
              "Emergency (Immediate life threat — e.g., eclampsia, hemorrhage, cord prolapse)",
              "Urgent (Requires hospital intervention within hours — e.g., premature rupture of membranes, severe pre-eclampsia)",
              "Routine / Specialized (Elective evaluation, specialized ultrasound)",
              "Select Transport Type: RHU Ambulance, Private Vehicle, or Public Transport."
            ]
          },
          {
            stepNumber: 5,
            title: "Submit & Share the Live Referral Tracking Code",
            instruction: "Click 'Submit Referral'. BMS generates a unique referral code and an instant public tracking link.",
            actionTarget: "Referral Success Modal",
            substeps: [
              "Copy the public tracking link or show the QR code to the ambulance driver / emergency nurse.",
              "The receiving hospital ER staff can open the link on their mobile phones to view the mother's vitals and preparation instructions before the ambulance even arrives!"
            ]
          }
        ],
        screenshotMockup: {
          title: "Create Referral Modal",
          caption: "3-step digital referral wizard ensuring receiving hospital has complete maternal vitals.",
          layoutType: "referral",
          customImageUrl: "/help-screenshots/referral-modal.png"
        },
        clinicalSafetyNotes: [
          "Always call the receiving hospital ER immediately after submitting an emergency referral to confirm bed and incubator availability.",
          "Ensure an accompanying midwife or nurse travels with the mother in the ambulance with emergency obstetric drugs (Magnesium Sulfate, Oxytocin) and transport kit."
        ]
      },
      {
        id: "track-referral-status",
        categoryId: "referrals",
        title: "Tracking Referral Status (From Pending to Admitted)",
        shortDescription: "Monitor transfer updates so you know when the hospital accepts the patient.",
        badge: "Coordination",
        estimatedReadMinutes: 2,
        whenToUse: "While the ambulance is in transit or after the patient arrives at the hospital.",
        whoCanUse: "All Clinic Staff.",
        steps: [
          {
            stepNumber: 1,
            title: "Go to 'Referrals' in the Sidebar",
            instruction: "Open the Referrals page to view the live dashboard of transferred mothers.",
            actionTarget: "Sidebar -> Referrals"
          },
          {
            stepNumber: 2,
            title: "Review the Status Badges",
            instruction: "Observe the current status for each referred patient:",
            actionTarget: "Referral Table",
            substeps: [
              "Pending: Awaiting hospital review.",
              "Accepted: Receiving hospital confirmed and prepared ER bed.",
              "In Transit: Patient and ambulance currently on the road.",
              "Completed: Patient admitted to hospital or discharged."
            ]
          }
        ],
        screenshotMockup: {
          title: "Inter-Clinic Referrals Dashboard",
          caption: "Live monitoring of referred patients, receiving facilities, and ambulance transport status.",
          layoutType: "referral",
          customImageUrl: "/help-screenshots/referrals.png"
        }
      }
    ]
  },
  {
    id: "ehr-documents",
    title: "EHR Documents & Scanned Charts",
    shortTitle: "EHR Documents",
    iconName: "FileText",
    description: "Uploading physical records, sonograms, lab slips, and using the high-resolution document viewer.",
    topics: [
      {
        id: "upload-view-ehr",
        categoryId: "ehr-documents",
        title: "Uploading & Viewing Scanned Patient Documents",
        shortDescription: "Digitize paper charts, ultrasound printouts, and referral discharge notes.",
        badge: "Paperless Clinic",
        estimatedReadMinutes: 3,
        whenToUse: "When a mother brings paper ultrasound films, outside laboratory results, or hospital discharge summaries.",
        whoCanUse: "Midwives, Nurses, and Records Officers.",
        steps: [
          {
            stepNumber: 1,
            title: "Go to 'EHR Records' in the Sidebar",
            instruction: "Click 'EHR Records' on the left menu.",
            actionTarget: "Sidebar -> EHR Records"
          },
          {
            stepNumber: 2,
            title: "Click '+ Upload Document'",
            instruction: "Click the primary button at the top right.",
            actionTarget: "Upload Document Button"
          },
          {
            stepNumber: 3,
            title: "Select Mother, Document Type, and Choose File",
            instruction: "Select the patient, choose category ('Ultrasound', 'Laboratory', 'Prenatal Chart', 'Referral Slip', 'Discharge Summary'), and upload the photo or PDF file.",
            actionTarget: "Upload Modal",
            substeps: [
              "You can take a photo directly using a tablet or phone camera, or upload a scanned image from your computer.",
              "Accepted formats: JPG, PNG, WebP, PDF."
            ]
          },
          {
            stepNumber: 4,
            title: "Inspect with the Interactive Zoom Viewer",
            instruction: "Click any document in the list to open it. Use the Zoom (+) and Zoom (-) buttons to read small handwritten doctor notes or ultrasound measurements in high clarity.",
            actionTarget: "Document Viewer Modal"
          }
        ],
        screenshotMockup: {
          title: "EHR Digital Archive & Image Viewer",
          caption: "High-resolution viewer with zoom, category filters, and secure download.",
          layoutType: "ehr",
          customImageUrl: "/help-screenshots/ehr.png"
        }
      }
    ]
  },
  {
    id: "messages",
    title: "Patient & Team Messaging",
    shortTitle: "Messages & Chat",
    iconName: "MessageSquare",
    description: "Answering patient questions, sending checkup reminders, and viewing maternal summaries in chat.",
    topics: [
      {
        id: "chat-with-mothers",
        categoryId: "messages",
        title: "Communicating with Registered Mothers",
        shortDescription: "Send instructions, follow-up messages, and answer maternal concerns in real-time.",
        badge: "Patient Care",
        estimatedReadMinutes: 2,
        whenToUse: "When mothers send questions through their BMS Mobile App or when following up on missed visits.",
        whoCanUse: "All Clinic Staff.",
        steps: [
          {
            stepNumber: 1,
            title: "Open 'Messages' in the Sidebar",
            instruction: "Click 'Messages' on the left menu to open the clinic inbox.",
            actionTarget: "Sidebar -> Messages"
          },
          {
            stepNumber: 2,
            title: "Select a Mother from the Inbox List",
            instruction: "Click on any conversation in the left panel. Unread messages show a blue notification badge.",
            actionTarget: "Inbox Sidebar"
          },
          {
            stepNumber: 3,
            title: "Check the Clinical Context Sidepeek While Replying",
            instruction: "Look at the right side of the chat screen. The patient's current Gestational Age, Estimated Due Date (EDC), and Risk Tier are displayed so you have clinical context while typing.",
            actionTarget: "Chat Details Sidepeek",
            note: "You never need to leave the chat screen to remember how many weeks pregnant she is!",
            noteType: "tip"
          },
          {
            stepNumber: 4,
            title: "Type Your Response and Press Send",
            instruction: "Type your clinical advice in plain, supportive language. Press Enter or click the Send icon.",
            actionTarget: "Message Input Box"
          }
        ],
        screenshotMockup: {
          title: "BMS Clinical Inbox & Maternal Sidepeek",
          caption: "Integrated maternal details panel shows gestational age and risk level directly beside the chat.",
          layoutType: "chat",
          customImageUrl: "/help-screenshots/messages.png"
        }
      }
    ]
  },
  {
    id: "offline-mode",
    title: "Offline Mode & Field Operations",
    shortTitle: "Offline-First Guide",
    iconName: "WifiOff",
    description: "Complete guide on how BMS operates during internet brownouts and in remote island or mountainous barangays.",
    topics: [
      {
        id: "offline-field-guide",
        categoryId: "offline-mode",
        title: "Working Offline Without Internet (Field Outreach)",
        shortDescription: "Never lose a record even during prolonged power cuts or zero mobile signal.",
        badge: "Field Resilience",
        estimatedReadMinutes: 3,
        whenToUse: "During remote barangay consultations, typhoon power outages, or weak internet.",
        whoCanUse: "All Midwives, BHWs, and Field Personnel.",
        steps: [
          {
            stepNumber: 1,
            title: "How Offline Mode Works Automatically",
            instruction: "You do not need to press any button to 'turn on' offline mode! BMS automatically detects when internet connection drops.",
            actionTarget: "Automatic System Detection",
            substeps: [
              "When internet drops, the top header badge changes from 'Online' to 'Offline Mode (Local Storage)'.",
              "You can keep registering mothers, recording prenatal vitals, and scheduling visits as usual."
            ]
          },
          {
            stepNumber: 2,
            title: "Understanding the Offline Sync Badge",
            instruction: "Look at the badge in the top header:",
            actionTarget: "Header OfflineSyncBadge",
            substeps: [
              "Green Dot ('Online'): System is connected and synchronized with the central cloud database.",
              "Amber Dot ('Pending Sync'): You have offline changes waiting to upload.",
              "Red/Gray Dot ('Offline Mode'): Operating purely on local browser storage."
            ]
          },
          {
            stepNumber: 3,
            title: "Reconnecting and Automatic Sync",
            instruction: "When you return to the main health unit or reconnect to Wi-Fi, BMS automatically uploads all pending registrations, vitals, and appointments in the background.",
            actionTarget: "Auto-Sync Engine",
            note: "Do NOT clear your browser history or site cookies while there are pending sync items. Wait until the badge turns green ('All Synced').",
            noteType: "warning"
          },
          {
            stepNumber: 4,
            title: "Resolving Concurrent Data Conflicts (MVCC)",
            instruction: "If another worker updated a patient's chart while you were offline, BMS detects a version mismatch and flags it for manual review instead of silently overwriting vital clinical data.",
            actionTarget: "Conflict Resolution Center",
            substeps: [
              "Click the amber 'Conflicts Review' badge in the header or open the Sync Drawer -> Conflicts tab.",
              "Click 'Review & Resolve' to open the side-by-side visual diff viewer.",
              "Choose 'Smart Auto-Merge' to combine non-overlapping fields, 'Keep Server Version', 'Keep My Changes', or 'Custom Field Picker' to select values field-by-field.",
              "Click 'Resolve & Synchronize' to apply the resolution and update the central database."
            ],
            note: "In clinical settings, always double-check vital signs (BP, weight, gestational age) when merging conflicting visits.",
            noteType: "tip"
          }
        ],
        screenshotMockup: {
          title: "Offline Sync Badge & Local Storage",
          caption: "Real-time indicators show connection status and number of records in queue.",
          layoutType: "dashboard",
          customImageUrl: "/help-screenshots/dashboard.png"
        },
        proTips: [
          "Before traveling to a remote barangay, log in at the main RHU while connected to Wi-Fi so the latest patient list is downloaded to your device.",
          "You can lock the screen with your 4-digit PIN in the field without needing an internet connection to unlock."
        ]
      }
    ]
  },
  {
    id: "faqs",
    title: "Frequently Asked Questions & Troubleshooting",
    shortTitle: "FAQs & Problems",
    iconName: "HelpCircle",
    description: "Solutions to common staff questions, forgotten passwords, duplicate records, and technical support.",
    topics: [
      {
        id: "common-clinic-faqs",
        categoryId: "faqs",
        title: "Frequently Asked Questions (FAQs)",
        shortDescription: "Quick answers to the most common questions asked by health center staff.",
        badge: "Helpful",
        estimatedReadMinutes: 3,
        whenToUse: "Whenever you run into an unexpected question or minor issue.",
        whoCanUse: "All Clinic Staff.",
        steps: [
          {
            stepNumber: 1,
            title: "Browse the Question & Answer Accordion",
            instruction: "Click any question below to expand the answer and follow the step-by-step resolution.",
            actionTarget: "FAQ Accordion"
          }
        ]
      }
    ]
  }
]

export const FREQUENTLY_ASKED_QUESTIONS: FaqItem[] = [
  {
    id: "faq-1",
    category: "Mothers & Accounts",
    question: "What is the default password for a newly registered mother?",
    answer: "Whenever you register a new mother on the BMS web portal, the system automatically creates her mobile patient account with the default password: Mother@123. Instruct the mother to download the BMS Mother App, enter her mobile number or email, and use Mother@123 to log in for the first time. She can change her password afterwards.",
    actionTip: "Write this down or give the mother an information card during her initial checkup."
  },
  {
    id: "faq-2",
    category: "Offline & Data",
    question: "What happens if our health center loses power or internet during a consultation?",
    answer: "Do not panic! BMS has built-in offline capability (IndexedDB). All vitals, notes, and registrations you type are stored safely in your computer's local memory. The top badge will show 'Offline Mode'. As soon as power and internet return, BMS automatically uploads all saved data to the central database without any data loss.",
    actionTip: "Never clear your browser browsing data/cache while in offline mode with pending syncs."
  },
  {
    id: "faq-3",
    category: "PIN & Security",
    question: "What should I do if I forget my 4-digit quick-unlock PIN?",
    answer: "If you forget your 4-digit PIN on the lock screen, you can click 'Forgot your PIN? Re-login to reset' below the keypad. If you enter the wrong PIN 3 times, the system automatically locks the session and presents a re-login screen. Signing in afresh with your email and password resets your credentials and immediately prompts you to configure a new 4-digit offline PIN.",
    actionTip: "You can change your PIN at any time under Settings -> Security."
  },
  {
    id: "faq-4",
    category: "Clinical & CDSS",
    question: "Why did a patient's badge turn red ('High Risk') after logging vitals?",
    answer: "The Clinical Decision Support System (CDSS) evaluates maternal vitals against Philippine Department of Health and MEOWS (Modified Early Obstetric Warning Score) guidelines. A red 'High Risk' badge triggers if: (1) Blood pressure is ≥140/90 mmHg, (2) Fetal Heart Tone is abnormal (<110 or >160 bpm), (3) Any danger sign like vaginal bleeding, convulsions, or severe headache is checked, or (4) The mother has severe pre-existing complications.",
    actionTip: "Immediately alert your attending Municipal Health Officer / Doctor to evaluate the case or prepare an inter-clinic referral."
  },
  {
    id: "faq-5",
    category: "Referrals",
    question: "How does the receiving hospital view our emergency referral?",
    answer: "When you submit a referral, BMS generates a unique public tracking link and a QR code. You can copy this link and send it to the receiving hospital ER via SMS/Viber, or show the QR code to the ambulance driver. The hospital staff can open the link directly on their smartphones without needing an account to see the mother's vital signs and clinical urgency.",
    actionTip: "Always follow up with a telephone call to the receiving hospital emergency department."
  },
  {
    id: "faq-6",
    category: "Appointments",
    question: "How do I mark an appointment as completed after the checkup?",
    answer: "Open the Appointments list or the Calendar view. Click on the mother's appointment to open the sidepeek drawer on the right. In the drawer, change the status dropdown or click the green 'Mark as Completed' button. This updates the daily clinic census and schedules her next visit.",
    actionTip: "Marking appointments as completed keeps your clinic attendance statistics accurate."
  },
  {
    id: "faq-7",
    category: "Printing & Reports",
    question: "Can I print a summary of a mother's clinical record for her hospital bag?",
    answer: "Yes! Open the mother's profile and click the 'Export Record' button in the top action bar. You can choose to download or print an official maternal clinical summary sheet to place inside her mother-and-child health booklet (Pink Book) or referral envelope.",
    actionTip: "Always print a clinical summary sheet when transferring a patient to another facility."
  },
  {
    id: "faq-8",
    category: "Duplicates",
    question: "What if a mother was accidentally registered twice?",
    answer: "Check both records to see which one has the most complete prenatal history. Facility administrators can deactivate or delete duplicate records using the three-dots menu on the Mothers table. If you need help merging records, contact your IT technical officer.",
    actionTip: "Always search by PhilHealth number or birth date first before creating a new registration."
  }
]
