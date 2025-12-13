# Schema Ehnemark

Custody scheduling application for the Ehnemark family.

## Tech Stack

- **Frontend**: React + Vite + JoyUI
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1

## Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
```

## Deployment to Cloudflare

### 1. Create D1 Database

```bash
# Login to Cloudflare
npx wrangler login

# Create the database
npx wrangler d1 create schema-ehnemark-db
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "schema-ehnemark-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 2. Initialize the Database

```bash
# For local development
npm run db:init:local

# For production
npm run db:init
```

### 3. Local Development with Wrangler

```bash
# Build and serve locally with Cloudflare Pages emulation
npm run build
npm run pages:dev
```

### 4. Deploy to Cloudflare Pages

```bash
# Deploy to production
npm run pages:deploy
```

### 5. Set Custom Domain

In Cloudflare Dashboard:
1. Go to Pages > schema-ehnemark
2. Custom domains > Add custom domain
3. Enter: schema.ehnemark.com

## Features

- 📅 12-month calendar view
- 🎨 Color-coded custody periods (pink = Jennifer, blue = Klas)
- 🔄 Switch day highlighting
- 📊 Statistics with day counts and percentages
- 📝 Proposal system for schedule changes
- 💬 Comments on proposals
- ✅ Agreement workflow

## Users

- Jennifer / starch2008
- Klas / papalagi23
