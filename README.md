# 🌴 The Grand Oasis Resort Management System

An enterprise-grade, high-performance luxury resort management and booking platform engineered using the **MEAN Stack** (Angular, Node.js, Express, MongoDB) and scaled with modern features like real-time WebSocket availability updates, Razorpay fintech gateways, Cloudinary media streaming, Google Gemini AI concierges, and Progressive Web App (PWA) offline archives.

[![Live Demo](https://img.shields.io/badge/Live-Website-brightgreen?style=for-the-badge&logo=vercel)](https://the-grand-oasis-resort.vercel.app/home) &nbsp;
[![Angular](https://img.shields.io/badge/Angular-21-red?style=for-the-badge&logo=angular)](https://angular.dev/) &nbsp;
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/) &nbsp;
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/) &nbsp;
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/) &nbsp;
[![License](https://img.shields.io/badge/License-MIT-gold?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🚀 Project Overview

**The Grand Oasis Resort** application represents a boutique luxury digital ecosystem designed for premium hospitality. The platform is structured into two core pathways: a reactive, rich-media guest portal for villa booking and rating verification, and a high-security staff concierge and administration cockpit featuring real-time ledger updates and advanced business intelligence analytics.

---

## ✨ Features Directory

| Feature Module | Core Functionality | Technical Implementation |
| :--- | :--- | :--- |
| **🔐 Auth & RBAC** | Multi-channel login (email, phone, OTP, google auth, and guest/staff segmented portals). | JWT secure cookies, HTTP Route Guards, client-side session interceptors. |
| **📅 Real-Time Availability** | Instant room grid updates and date-locking without page refreshes. | Bi-directional WebSockets (`Socket.io`) connecting backend to reactive RxJS subjects. |
| **💳 Fintech Payments** | Secure advance deposits and full checkouts with detailed invoices. | Razorpay Gateway checkout integration with backend cryptographic SHA256 HMAC verification. |
| **🤖 AI Concierge** | Persistent sandbox room advisor and resort FAQ concierge. | `Google Gemini 1.5 Flash` SDK with automated chat-turn sanitizers. |
| **📊 Admin Analytics** | Ledger controls, role modifiers, and live business analytics. | Dynamic Chart.js modules aggregating revenue, occupancy, and villa allocations. |
| **☁️ Media Uploads** | High-performance drag-and-drop media upload streams. | Multer memory engines piping streams directly to Cloudinary with local backup fallbacks. |
| **⭐ Verified Reviews** | Star-rating distributions with strict reservation validation. | MongoDB average aggregate pipelines and authenticated transaction check gates. |
| **📱 Offline PWA Vault** | Offline loading alerts, static prefetching, and local reservation archives. | Service worker configurations (`ngsw-config.json`) and localStorage invoice vaults. |

---

## 🛠️ Technology Stack

| Layer | Component / Tool | Role / Purpose |
| :--- | :--- | :--- |
| **Frontend** | **Angular 21 (TypeScript)** | Single-page framework providing modern component structure and modular views. |
| **State & Async** | **RxJS Observables** | Reactive pipelines handling debounced search states, live filters, and socket feeds. |
| **Styling** | **Vanilla CSS & Flexbox** | Custom-tailored luxury stylesheets featuring glassmorphism and HSL-based palettes. |
| **Backend** | **Node.js / Express.js** | Non-blocking RESTful routing, secure middleware, and controller logic. |
| **Real-Time** | **Socket.io** | Bi-directional WebSocket channels broadcasting status changes instantly. |
| **Database** | **MongoDB Atlas** | Document store utilizing high-speed query indexing and schema validations. |
| **Storage Engine** | **Mongoose ODM** | Data modeling, validation schemas, and database aggregation pipelines. |
| **Security** | **JSON Web Token (JWT)** | Tokenization, credential protection, and authorization controls. |
| **Email Gateway** | **Nodemailer** | Secure SMTP wrappers delivering transactional verification OTP codes. |

---

## 📐 System Architecture

The platform uses a decoupled, event-driven architecture that bridges clients, servers, databases, and third-party APIs seamlessly:

```mermaid
graph TD
    %% Styling definitions
    classDef frontend fill:#0f172a,stroke:#fbbf24,stroke-width:2px,color:#ffffff;
    classDef backend fill:#1e293b,stroke:#e2e8f0,stroke-width:1px,color:#ffffff;
    classDef database fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef external fill:#78350f,stroke:#fbbf24,stroke-width:1px,color:#ffffff;

    subgraph Client [Angular Client Application]
        A["Angular 21 SPA Component Layer"]:::frontend
        B["RxJS Debounced Filter State"]:::frontend
        C["PWA Service Worker & localStorage"]:::frontend
    end

    subgraph Server [Node.js Express Server]
        D["Express API Route Controllers"]:::backend
        E["Socket.io WebSocket Server"]:::backend
        F["JWT Authentication Middleware"]:::backend
    end

    subgraph Data [Database Storage]
        G["MongoDB Atlas Cluster"]:::database
        H["Mongoose Schemas & Query Indexing"]:::database
    end

    subgraph Integrations [External Luxury Services]
        I["Razorpay (Cryptographic FinTech Payments)"]:::external
        J["Cloudinary (High-Performance Image CDN)"]:::external
        K["Google Gemini 1.5 Flash (AI Room Concierge)"]:::external
    end

    %% Connections
    A <-->|HTTP REST & JSON Payloads| D
    A <-->|Live WebSocket Broadcasts| E
    C -.->|Caching Fallback| A
    D <-->|Advanced Mongoose Aggregations| G
    D <-->|HMAC Cryptographic Verification| I
    D <-->|Direct Media Upload Streams| J
    D <-->|Structured Context Prompts| K
    
    %% Apply styles
    class A,B,C frontend;
    class D,E,F backend;
    class G,H database;
    class I,J,K external;
```

---

## 🔐 Authentication System

The security paradigm balances friction-free user onboarding with hardened, role-based resource protection:

| Onboarding Channel | Mechanic & Security Flow | Target Dashboard |
| :--- | :--- | :--- |
| **Guest Signup / Login** | Double-entry validator (Username, Email, Phone) preventing database duplicates. Supports email OTP secure deliveries. | **Guest Portal** (Villas list, personal invoice caches, verified review submissions) |
| **Boutique Staff Sign In** | High-fidelity Segmented Portal Switcher loading dynamic inputs. Intercepts error loads to reset spinner states within 5 seconds. | **Staff Concierge Workspace** (Booking lists, live availability monitors, chatbot assistance) |
| **Admin Control Vault** | Double-locked authentication requiring server-side password check (`POST /api/admin/verify-password`) against `.env` variables. | **Administrator Command Center** (Ledger management, staff creation, revenue analytics, role modifiers) |

---

## 📡 Real-Time Booking Engine

Live synchronization ensures guests are greeted with exact inventory states and prevented from double-booking.

| Sync Channel | Event Triggers | WebSocket & RxJS Behavior |
| :--- | :--- | :--- |
| **Status Broadcasting** | Room checkouts, booking updates, system resets, and admin approvals. | `Socket.io` broadcasts `availability_change` JSON structures globally to all active sessions. |
| **Client grid update** | Incoming socket broadcasts intercepted by `socket.service.ts` in Angular. | Sinks directly into reactive RxJS `Subject` streams, repainting the villa grid dynamically. |
| **Active Lock State** | Real-time pending indicators locked for specific transaction windows. | Dynamic grid slot indicators gray out automatically to avoid race conditions. |

---

## 💳 Payment Gateway & Invoice System

Our fintech implementation combines a highly fluid user interface with server-side validation.

| Action Item | Razorpay SDK & Flow Mechanics | Verification & Output |
| :--- | :--- | :--- |
| **Order Creation** | Backend orders generated at `/api/payments/order` with advance deposit or full checkouts. | Returns a signed transaction payload containing unique order identification hashes. |
| **Checkout UI** | Seamless Angular modal launches the Razorpay UI supporting cards, UPI, wallets, and Netbanking. | Intercepts mock sandbox order IDs to allow complete end-to-end checkout runs without keys. |
| **Cryptographic Verify** | SHA256 HMAC verification in backend (`/api/payments/verify`) validates web signature headers. | Prevents fraud, saves transaction records to the ledger, and transitions villa to "Booked". |
| **PDF Invoice Generator** | Prints premium billing receipts with unique QR keys, breakdown tables, and taxes. | A custom `window.onload` script hides the toolbar and automatically triggers the PDF print save dialog. |

---

## 🤖 AI Concierge Chatbot

Our custom floating, glassmorphic conversational widget gives guests a premium interface.

| Module | Technical Framework | Behavior & Safety Rules |
| :--- | :--- | :--- |
| **Model / Core** | **Google Gemini 1.5 Flash** | Connects using the official `@google/generative-ai` SDK. |
| **Context Controls** | System Prompt Restriction | Enforces a strict context: guides conversational prompts back to resort FAQs, bookings, and services. |
| **Payload Slicing** | History turn index sanitizers | Slices the chat array to always begin at user index 0, preventing model welcome crash errors. |
| **Fallback Mode** | Local Mock relations responder | Instantly activates a local responder if no `GEMINI_API_KEY` is configured in `.env` variables. |

---

## 📊 Admin Dashboard & Business Intelligence

A centralized control hub powered by clean layouts and reactive state management:

| Control Panel | Available Operations | Integrated Metrics / Assets |
| :--- | :--- | :--- |
| **BI Analytics Dashboard** | Multi-axis data displays showing revenue gains, room splits, and occupancy. | Responsive **Chart.js** canvas charts, dynamic booking counters. |
| **Villa Director** | Add, edit, remove, and category-price villas. | Multer memory engines with drag-and-drop progress loaders. |
| **Booking Ledger** | Interactive, live booking checklist. Approve or reject reservations. | Automated WebSocket broadcasts syncing availability grids. |
| **User Directory** | Role adjustments, authorization codes, employee creations, account deletions. | High-fidelity profile avatars dynamically loading role-based images. |

---

## 📱 PWA Features & Offline Support

The application is configured to run resiliently under inconsistent mobile connectivity:

```
[ Static Cache Groups ]  ======> Prefetches CSS, Outfit/Playfair display fonts, and SVG icons
[ Dynamic API Caches ]  ======> Intercepts booking history assets
[ Offline Detection ]   ======> Detects network losses, displays offline card alerts
[ Local Invoice Vault]  ======> Pulls local transaction receipts directly from offline archives
```

---

## 💾 Database Optimization

| Collection Schema | Compound Query Index | Aggregation & Optimization Strategy |
| :--- | :--- | :--- |
| **User** | `{ email: 1, username: 1, phone: 1 }` | Sparse unique indexes to allow multiple login formats safely. |
| **Review** | `{ villaId: 1, rating: -1 }` | Aggregates dynamic feedback averages via MongoDB pipelines on request. |
| **Villa** | `{ status: 1, price: 1 }` | Compound filters to optimize multifaceted room searches and debounced sliders. |

---

## ⚙️ Installation & Setup

Follow these steps to deploy and run the entire MEAN project on your local machine:

### Prerequisites
* **Node.js** (v18 or higher)
* **NPM** (v9 or higher)
* **MongoDB** (Local instance running or a MongoDB Atlas connection string)

### 📦 1. Clone & Core Setup
```bash
# Clone the repository
git clone https://github.com/naivedhP2518/The-Grand-Oasis-Resort.git
cd The-Grand-Oasis-Resort
```

### 🖥️ 2. Start the Backend Server
```bash
cd backend
npm install
# Create a .env file (configure variables as shown in the section below)
npm run dev
```

### 🎨 3. Start the Frontend Client
```bash
cd ../frontend
npm install
npm start
```
*Your application will now be running fully synchronized at:*
* **Frontend Portal**: [http://localhost:4200](http://localhost:4200)
* **Backend API Base**: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Configuration

To run the application securely, create a `.env` file inside the `backend/` directory:

| Environment Key | Required Value / Description | Example Mock Value |
| :--- | :--- | :--- |
| **`PORT`** | Port listening number | `3000` |
| **`MONGODB_URI`** | MongoDB Atlas cluster connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| **`JWT_SECRET`** | Token signature hashing secret | `super_secret_oasis_key` |
| **`EMAIL_USER`** | Transmitter email address for OTP delivery | `smtp_concierge@gmail.com` |
| **`EMAIL_PASS`** | Gmail SMTP app password | `abcd efgh ijkl mnop` |
| **`RAZORPAY_KEY_ID`** | Razorpay integration gateway ID | `rzp_test_Svy7pakIbl3fpr` |
| **`RAZORPAY_KEY_SECRET`**| Razorpay secure signature hashing key | `gzplGNkMmVcx1lX2PI51K9uW` |
| **`CLOUDINARY_CLOUD_NAME`**| Cloudinary asset dashboard identifier | `OasisCloud` |
| **`CLOUDINARY_API_KEY`** | Cloudinary API access key | `788599934598437` |
| **`CLOUDINARY_API_SECRET`**| Cloudinary API secret | `oXAZiqxee2FUqoGFG-k5O-Rjnvw` |
| **`GEMINI_API_KEY`** | Google AI developer API key | `AIzaSyD_ExampleGeminiKey` |
| **`ADMIN_MASTER_PASSWORD`**| Locked dashboard password (Synced to database) | `GOD` |

---

## 📸 Project Screenshots

| Dashboard view | Live Interface Mockup | Highlights |
| :--- | :--- | :--- |
| **🌴 Landing Page** | ![Landing Page](https://placehold.co/800x450/0f172a/fbbf24?text=The+Grand+Oasis+Landing+Page) | High-end typography (Outfit & Playfair), luxury visual grids. |
| **🔑 Guest & Staff Login** | ![Portal Logins](https://placehold.co/800x450/0f172a/fbbf24?text=Segmented+Guest+and+Staff+Portals) | Elegant Segmented Tabs, 5-second dynamic error timeouts. |
| **🛠️ Admin Command Center** | ![Admin Command Center](https://placehold.co/800x450/0f172a/fbbf24?text=Admin+Command+Center+Dashboard) | Unified ledger approvals, dynamic user role modifier panels. |
| **📊 BI Analytics Charts** | ![BI Analytics Charts](https://placehold.co/800x450/0f172a/fbbf24?text=BI+Analytics+Charts) | Multi-axis **Chart.js** canvases displaying revenues and room splits. |
| **📅 Villa Booking Flow** | ![Booking Flow](https://placehold.co/800x450/0f172a/fbbf24?text=Luxury+Faceted+Villa+Booking+Flow) | Faceted debounced filters (sliders, star bars) and WebSocket grids. |
| **💳 Razorpay Payment Screen** | ![Fintech Payments](https://placehold.co/800x450/0f172a/fbbf24?text=Razorpay+Fintech+Checkout+System) | Advance deposit checkout and custom PDF invoice generation. |
| **🤖 Gemini AI Chatbot** | ![AI Chatbot](https://placehold.co/800x450/0f172a/fbbf24?text=Gemini+AI+Concierge+Assistant) | Persistent glassmorphic float-widget with history turn controls. |
| **📱 Mobile Responsive UI** | ![Mobile Responsive View](https://placehold.co/800x450/0f172a/fbbf24?text=Mobile+Responsive+UI+View) | Pure CSS layouts displaying offline fallback alerts and invoices. |

---

## 🚀 Future Enhancements (Roadmap)

- [ ] **Multi-Currency Support**: Dynamic checkout conversions inside Razorpay.
- [ ] **AI-Driven Room Allocator**: Machine learning occupancy predictions.
- [ ] **Biometric Passkey Sign-In**: Standard biometric credentials in the Staff Portal.
- [ ] **Visual Villa Customizer**: 3D interactive room layout maps.

---

## 📜 MIT License

Copyright (c) 2026 Naivedh Patel

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

<div align="center">
  Designed & Engineered with ❤️ By <b>Naivedh Patel</b>
</div>
