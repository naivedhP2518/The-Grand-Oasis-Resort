# 🌴 The Grand Oasis Resort

A modern, high-performance resort management and booking system built with the **MEAN Stack**. This application provides a seamless experience for guests to explore luxury villas and for administrators to manage the resort's operations efficiently.

[![Live Demo](https://img.shields.io/badge/Live-Website-brightgreen?style=for-the-badge&logo=vercel)](https://the-grand-oasis-resort.vercel.app/home) &nbsp;
[![AngularJS](https://img.shields.io/badge/AngularJS-DD0031?style=for-the-badge&logo=angularjs&logoColor=white)](https://angularjs.org/) &nbsp;
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/) &nbsp;
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/) &nbsp;
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/) &nbsp;

---

## 🚀 Project Overview

**The Grand Oasis Resort** is designed to provide a premium digital experience for luxury travelers. It features a robust booking engine, a secure authentication system with OTP verification, and a comprehensive admin panel for real-time resort management.

### Key Features
| Feature | Description |
| :--- | :--- |
| **🏨 Villa Management** | Detailed listings of 1BHK, 2BHK, and 3BHK villas with category-specific pricing. |
| **🔐 Secure Auth** | Email-based OTP verification for high-security user accounts. |
| **📅 Booking Engine** | Real-time availability checks and booking management for guests. |
| **🛠️ Admin Dashboard** | All-in-one control center for managing bookings, villa status, and user data. |
| **📱 Responsive UI** | A fluid, modern interface optimized for all screen sizes (Desktop, Tablet, Mobile). |

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | **Angular 21** | Building a fast, reactive, and modular user interface. |
| **Backend** | **Node.js / Express** | Handling API requests, business logic, and server-side processing. |
| **Database** | **MongoDB (Mongoose)** | Scalable NoSQL storage for users, bookings, and villa data. |
| **Security** | **JWT & Nodemailer** | Token-based sessions and secure OTP delivery via email. |
| **Deployment**| **Vercel** | High-performance hosting for the frontend application. |

---

## 📁 Project Structure (Position Breakdown)

| Folder/File | Purpose |
| :--- | :--- |
| `frontend/` | **Client Side**: Contains the Angular application source code. |
| `frontend/src/app/components/` | Individual UI modules like `home`, `villas`, `login`, and `admin`. |
| `frontend/src/app/services/` | Logic for API communication (Hotel & Authentication services). |
| `backend/` | **Server Side**: The Express.js backend for managing the API. |
| `backend/models/` | Mongoose Schemas (User, Villa, Booking, AuthCode) for the database. |
| `backend/routes/` | API routing for authentication (`auth.js`) and resort data (`hotel.js`). |
| `backend/index.js` | Main entry point for the backend server. |
| `.env` | Environment configuration for sensitive keys (DB URI, JWT secret, Email). |

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **NPM** (v9+)
- **MongoDB** (Local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file with your credentials (see section below)
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
ng serve
```

---

## 🔑 Environment Variables
To run the backend properly, create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
```

---

## 📜 MIT License

Copyright (c) 2025 Naivedh Patel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
