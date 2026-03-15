
# 🛠️ ToolManager - Enterprise Asset & Tool Tracking System

![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

## 📖 Overview

In heavy industry, mechanical engineering, and large-scale mining operations, tracking physical assets and high-value tools is a massive logistical challenge. Equipment loss, undocumented checkouts, and missed maintenance schedules lead to significant operational bottlenecks.

**ToolManager** is a full-stack, distributed digital ecosystem designed to solve this problem. It bridges the gap between the physical engineering floor and digital oversight by providing a mobile application for field workers and a centralized web dashboard for inventory administrators, all synchronized in real-time.

## 🏗️ System Architecture

This repository is structured as a **Monorepo**, containing the complete distributed system separated by operational concerns:

* 📱 **`/mobile` (Field Operations):** A cross-platform mobile application utilized by engineers and technicians on the floor to check out tools, log equipment status, and view inventory availability.
* 💻 **`/web` (Command Center):** A comprehensive administrative web dashboard for inventory managers to oversee asset allocation, track missing equipment, and manage user permissions.
* 🔥 **`/firebase` (Backend Infrastructure):** Cloud-native backend utilizing Firebase for real-time NoSQL database synchronization, secure user authentication, and cloud functions.
* ⚙️ **`/.github/workflows` (DevOps):** Automated CI/CD pipelines to ensure code quality and streamline deployments across the different environments.

## ✨ Key Features

* **Real-Time Synchronization:** The moment a tool is checked out on the mobile app, the web dashboard updates instantly, ensuring a single source of truth for the entire facility.
* **Role-Based Access Control (RBAC):** Secure authentication separating standard field technicians from inventory administrators.
* **Cross-Platform Accessibility:** A unified JavaScript/TypeScript codebase ensuring seamless performance across web browsers and mobile devices.
* **Automated CI/CD:** Integrated GitHub Actions for continuous integration, reducing manual deployment overhead.

## 🚀 Getting Started

### Prerequisites
* Node.js (v16 or higher)
* npm or yarn
* Firebase CLI

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Wuradclan/ToolManager.git](https://github.com/Wuradclan/ToolManager.git)
   cd ToolManager
2. Setup the Web Dashboard:
  ```bash
  cd web
  npm install
  npm start
  ```
3.Setup the Mobile App:
  ```Bash
  cd ../mobile
  npm install
  npm start
  ```
4.Configure Firebase:
Create a project in the Firebase Console.
Add your environment variables to both the /web and /mobile directories.
Deploy database rules:
  ```Bash
  cd ../firebase
  firebase deploy --only firestore:rules
  ```
Engineering Philosophy
This project was built with a strong focus on Software Engineering best practices:
Separation of Concerns: Strictly dividing the presentation layers (Web/Mobile) from the data layer (Firebase).
Scalability: Utilizing a NoSQL structure capable of handling thousands of simultaneous read/writes during shift changes.
Maintainability: Utilizing a monorepo structure to keep environment dependencies synchronized and easily auditable.
