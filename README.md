# PsyOps SV

A SvelteKit application with Google OAuth, PostgreSQL and Bun, presented through a dark editorial field-ledger interface and optimized for mobile devices.

## Features

- **Google OAuth**: Secure authentication via Google.
- **PostgreSQL**: Robust and scalable database management using Drizzle ORM.
- **Bun**: Fast JavaScript runtime and package manager.
- **Editorial field-ledger UI**: A restrained midnight-ink interface with parchment rules, serif headings and amber interaction cues.
- **Mobile Optimized**: Responsive layout for seamless experience across devices.

## Setup

### Prerequisites

- Bun (v1.x or higher)
- PostgreSQL database

### 1. Clone the repository

```bash
git clone https://github.com/pxnx/psyops-sv.git
cd psyops-sv
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```dotenv
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
DATABASE_URL="postgresql://user:password@host:port/database_name"
```

Replace `your_google_client_id`, `your_google_client_secret`, and the `DATABASE_URL` with your actual credentials. The `DATABASE_URL` should point to your PostgreSQL instance.

### 3. Install Dependencies

> **Use Bun, not yarn.** This project uses Bun exclusively for dependency management and running scripts. Do not use `yarn` (or `npm`) — always use `bun` (e.g., `bun install`, `bun add`, `bun run`).

```bash
bun install
```

### 4. Run Drizzle Migrations

Ensure your database schema is up-to-date by running Drizzle migrations:

```bash
bun drizzle-kit migrate
```

### 5. Run the Application

```bash
bun dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## UI Styling and Mobile Optimization

The application uses a dark editorial interface inspired by operational field notes: midnight-ink surfaces, parchment-toned rules, serif hierarchy and carefully reserved amber feedback. It remains optimized for mobile screens with responsive navigation and content layouts.

## Development

- **Removed `.vscode`**: Editor-specific configurations have been removed to ensure consistency across different development environments.
- **Bun Workflow**: All scripts and package management now exclusively use Bun. Use `bun`, not `yarn` (or `npm`), for installing dependencies and running scripts.

## Contributing

Feel free to fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.
