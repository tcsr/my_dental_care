# 🦷 Dental Pro Care - B2B ERP Console

Welcome to the **Dental Pro Care**, a premium, medical-grade B2B ERP application designed for dental implants suppliers, manufacturing representatives, and dental clinics. This application replaces manual consultant actions with an automated alerts engine, coordinates implant patient healing pipelines, manages inventory stock levels, handles sales orders with localized currency parameters, integrates an AI FAQ Assistant, and features custom calendar reminders & alarms.

---

## 🌟 Key Features & B2B Flows

### 1. 📦 Sales & Orders Management
* **Clinic Directory**: Register, edit, and manage client clinics (Doctors/Hospitals) with dedicated tier structures and regional state mappings (Andhra Pradesh, Telangana, Tamil Nadu, Karnataka, Maharashtra, Delhi).
* **Tiered Discounts**: Automatically applies discounts based on clinic tiers:
  * **Standard**: 0%
  * **Gold**: 10%
  * **Platinum**: 15%
  * **VIP**: 20%
* **Indian Rupee (₹) Pricing**: Custom-tailored currency rendering for Indian regional sales and payment invoices.
* **GST Tax Calculations**: Calculates 12% GST dynamically. Splits CGST (6%) and SGST (6%) for intra-state (local Telangana) billing, or applies IGST (12%) for inter-state billing.
* **B2B Tax Invoice modal**: Generates printable tax invoices featuring distributor GSTIN, HSN codes, custom discounts, detailed tax splits, and payment status stamps.
* **Order Placement**: Deducts stock dynamically from inventory on placement.

### 2. 🔬 Dental Implant Case Tracker
* **Healing Pipeline**: Tracks patient implant progress dynamically through clinical stages:
  1. **Planning** (ప్రణాళిక / योजना / திட்டமிடல்)
  2. **Surgical (Fixture)** (శస్త్రచికిత్స / सर्जिकल / அறுவை சிகிச்சை)
  3. **Healing (Abutment)** (హీలింగ్ / हीलिंग / ఆరుதல்)
  4. **Prosthetic (Crown)** (ప్రొస్థెటిక్ / प्रोस्थेटिक / செயற்கை பல்)
  5. **Completed** (పూర్తయింది / पूर्ण / முடிந்தது)
* **Sleek Medical Timeline**: A visual horizontal progress bar that shifts colors dynamically from active violet highlights to success mint-green gradients.
* **Stage Controls**: Step forwards or backwards to automatically calculate checkup dates.
* **Interactive 2D Implant Component Assembler**: Playground workspace to test engineered clearances of implants. Renders parts dynamically inside a high-tech CAD SVG blueprint. Simulates snapping fits, threading rotations, and snap-bounce animations.
  - **Dynamic Torque Guidance**: Telemetry panel renders target torque parameters (20/30/35 Ncm) based on size.
  - **Specs Mismatch Alerts**: Displays instant warning alerts if platforms or profiles don't line up.
  - **Interactive Scanner Glow**: Dropdown selection flashes corresponding graphic parts with a holographic scanner glow.
  - **Laser Grid Toggle**: Control button to show/hide alignment lasers and concentric grid overlays.
  - **Mobile Haptic Feedback**: Triggers vibration signals upon seating completion.
  - **Clinical Record Linkage**: Select patient cases to load prior configurations and save active selections to case files.
* **CRM Voice Notes Dictation**: Real-time microphone audio recognition mapping transcribed text directly to clinical notes.
* **AI Sales Forecasting & Trend Projections**: Evaluates past sales records using mathematical regressions to project future volumes.
* **B2B Invoice & Challan Printing**: Premium print stylesheets adapting proforma quotes, invoices, and dispatch challans cleanly for physical record keeping.

### 3. 📊 Inventory Catalog & Stock Alarm
* **Critical Stock Warnings**: Triggers red visual alerts when items fall below safe threshold minimums.
* **Quick Restock Adjustments**: Add item units instantly to keep clinic shipments flowing.
* **Category Tagging**: Organizes implants, crowns, and abutments with full SKU registrations.
* **Supplier Purchase Orders (PO)**: Generate, track, and receive supplier POs to automatically restock warehouses.
* **Multi-Warehouse Tracking**: Assign batches and stock levels to specific hubs (`Main Warehouse`, `Hyderabad Hub`, or `Rep Kit`).
* **Visual Barcode/QR Code**: Generate graphical barcode mocks for SKUs and simulate scanning input.
* **Physical Stock Audits**: Reconcile system stocks with physical audits, logging differences under stock adjustments.
* **Serialized Units**: Register unique serial numbers for surgical equipment tools and high-value items.

### 4. ⚡ Automated Reminder Engine & WhatsApp Simulator
* **No Manual Consultants**: Replaces manual follow-up workflows by scanning database registers.
* **Automated Scans**: Scans for unpaid invoices, clinical checkup follow-up schedules, and catalog restock limits to write SMS/Email log alerts automatically.
* **WhatsApp Mock Chats**: Smartphone frame chat simulator where users test gateway payments (Razorpay/Stripe), track logistics, or query chatbot support.

### 5. ⏰ Custom Tracker & Medication-Style Alarms
* **Form Scheduler**: Schedule reminders for doctor/clinic visits or delivery tasks with custom dates, times, and priority levels.
* **Synthesized Audio Chimes**: Generates chord-based alarm chime beeps using the browser's Web Audio API (offline-friendly, no external audio files needed).
* **Live Background Loop**: Continuously scans active alarms in the background. On trigger, it plays audio and launches a prominent modal.
* **Dismiss & Snooze**: Interactive modal buttons allowing reps to Dismiss completed alarms or Snooze them for 10 minutes.
* **Alarm Toggles**: Active tracking registry containing toggle switches, status pills, and deletion controls.

### 6. 🎬 Clinical Training Guides
* **Video Library**: Add watch or share links for clinical guides.
* **Dynamic Modals**: Uses high-performance React Portals to overlay YouTube playback guides directly over the medical console.

### 7. 🌐 Dynamic Internationalization (i18n)
* **Dynamic Language Switcher**: Toggle languages instantly from the header globe dropdown.
* **Full Translation Support**: All forms, labels, status pills, implant stages, navigation bars, and AI messages dynamically switch between:
  * 🇬🇧 **English** (EN)
  * 🇮🇳 **తెలుగు** (Telugu)
  * 🇮🇳 **हिंदी** (Hindi)
  * 🇮🇳 **தமிழ்** (Tamil)

### 8. 🤖 Localized AI FAQ Assistant
* **Floating Chat FAB**: Renders inside the mobile view boundaries without viewport overflow.
* **Interactive Prompt Chips**: Clicking a B2B FAQ suggestion gives instant, localized answers about clinic registration, ordering, implant tracking, and reminder scanners.
* **Custom Chat Box**: Text console with typing animation simulation and context-aware responses.

### 9. 🛡️ B2B Credit Controls, Payments & Quotations
* **Credit Limits & Block Check**: Enforces clinic credit limits (default ₹2,00,000) and blocks orders that breach bounds.
* **Proforma Sales Quotations**: Create estimates, manage active quotes, and convert them to active invoice orders.
* **Partial Collection Payments**: Record payment receipts and update invoice balances dynamically.
* **Delivery Challans**: Dispatch orders with designated logistics courier details and airway bills.
* **RMA Returns & Credit Notes**: Return damaged/wrong implants to corresponding batches and issue credit note write-offs.
* **Sales Agent Dashboard**: Evaluates sales metrics, target progress bar (₹5L quota), and flat 5% commissions.
* **CRM Diaries**: Save custom clinic visit logs and phone call history notes under client details.

### 10. 📷 Live QR & Barcode Camera Scanner
* **Webcam Integration**: Triggers live webcam video streaming capturing bar/QR codes.
* **Retro Finder UI**: Features a custom viewport overlay with a holographic animated green laser scanner line.
* **Sound FX & Logic**: Plays scanner beep tones and increments matching product inventories by +5 units.

### 11. 📈 Circular Healing Case Visualizers
* **SVG Completion Circles**: Beautiful circular completion circles rendering healing stage status visually in implant case registries.

### 12. 📄 Instant CSV Data Exports
* **Data Portability**: Downloader modules that export active B2B orders list and inventory catalogs to CSV spreadsheets instantly.

### 13. 📖 Multi-Lingual Written User Guide
* **Interactive Accordion**: Collapsible manual sections structured with custom bullet points, detailed instructions, and professional category icons.
* **Quad-Language Translations**: Translates instructions dynamically in English, Telugu, Hindi, and Tamil.

### 14. 👤 Distributor Address CRUD Config
* **Dynamic Invoicing**: Manage the distributor's primary physical address in settings and sync invoice layouts dynamically.

### 15. 🎨 Professional Emojiless Standardizations
* **Modern Interface**: Replaced obsolete emojis on screen tabs and card title headers with modern, premium Lucide icon layouts.

### 16. 🔔 Modern Toaster Notifications
* **Dialog Replacement**: Replaces standard browser dialog alerts with beautiful, themed animated Toast alerts (Success, Error, Warning, Info).

### 17. 🖼️ Base64 Logo & Photo CRUD
* **Photo Uploading**: Added file input controls to register/edit products and clinics with Base64 encoding.
* **Responsive Visuals**: Renders uploaded logos/photos as high-resolution thumbnails with text-fallback states inside directory cards.

---

## 🛠️ Technology Stack
1. **Core**: React (Vite, JSX, HMR)
2. **Icons**: Lucide React
3. **Database**: IndexedDB backed by Dexie.js for persistent, fast storage.
4. **Styling**: Vanilla CSS utilizing custom HSL color palettes, modern typography (Outfit & Inter), glassmorphism styles, and backdrop filters.
5. **Localization**: Custom dictionary mapper in `src/utils/i18n.js`.
