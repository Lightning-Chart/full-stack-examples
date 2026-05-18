# LCJS Reference Implementations

This repository provides high-performance LightningChart JS (LCJS) integration examples for modern web frameworks. Created as a Bachelor’s Thesis for Savonia UAS (commissioned by LightningChart Ltd.), the goal is to make LCJS integration simple and fast for developers.


## Quick Start

### 1. Installation

Clone the repository and install all workspace dependencies **from the root folder**:
```
npm install
```

### 2. Environment Setup
A valid [LightningChart JS license key](https://lightningchart.com/js-charts/#license-key) is required for the charts to function.

1. Copy the `.env.example` file to a new file named `.env` in the project root.

2. Replace the placeholder with your actual license key:
    ```
    VITE_LCJS_LICENSE="license key goes here"
    ```

### 3. Usage

#### Development Mode

Starts the Node.js backend and the Vite development server for the viewer application.
```
npm run dev
```
Open the local URL shown in your terminal (usually **localhost:5173**).

#### Production Preview

Compiles all assets and serves them via a local production-grade server to simulate a real deployment.
```
npm run build
npm run serve
```


## Running Modes
The application environment is configured at launch to operate in one of two modes:

- **Local Mode**: A full-stack environment using the Node.js `/backend` and a SQLite database. This mode supports real-time data streaming via WebSockets and persistent data storage.

- **Browser Mode**: A standalone client-side version. It uses internal data generators for interactive previews, requiring no external backend or database.


## AI-Optimized Documentation

This project features a modular documentation suite specifically generated for Large Language Models (LLMs). It provides AI assistants with the necessary context to help you with framework-specific implementations.

- **Modular Context:** The system generates targeted documentation files located in the `/backend/llms` directory (e.g., `full.txt` and framework-specific versions).

- **Auto-update:** The documentation is automatically updated during `npm run dev` and `npm run build`.

- **Manual Update:** You can manually trigger the generation by running `npm run generate-llms` in the root folder.

- **Access:** When running in Local Mode, the documentation index is served at `/llms.txt`.


## Repository Structure

- `/backend`: Node.js server with SQLite for local data storage and real-time streaming.
- `/docs`: Project documentation.
- `/frameworks`: Source code for React, Vue, Angular, Svelte, and Vanilla JS.
- `/shared`: Shared types, reusable logic, and mock data generators.
- `/viewer`: The main UI app that integrates scenarios and displays source code.

## Project Info

- Author: [Jenni Mikkonen](https://jenni-mikkonen.netlify.app/)
- Target completion: August 2026