# Cloud File Storage

A full-stack cloud file storage web application powered by Node.js, Express, and Supabase Storage.

## Features

- 📁 Upload files securely to Supabase Cloud Storage
- 📄 View and list uploaded files
- ⬇️ Download files with direct links
- 🗑️ Delete files from storage
- 🎨 Modern and responsive UI

## Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase account and project

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Ganeshgond944/CLOUD-PROJECT.git
   ```

2. Navigate into the application folder:
   ```bash
   cd cloud-file-storage
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` and configure your credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SECRET_KEY=your_supabase_secret_key
   PORT=5000
   ```

5. Start the server:
   ```bash
   node server.js
   ```

6. Open `http://localhost:5000` in your browser.
