# Fika Takeaway — Digital Operations Suite

> Fast · Fresh · Consistent · Friendly

Internal operations platform for Fika Takeaway, Dillibazar, Kathmandu, Nepal.

---

## Monorepo Structure

```
fika-system/
├── design/              # Design system — tokens, components, screen wireframes
│   ├── tokens.json
│   ├── components/      # SVG component exports
│   ├── screens/
│   │   ├── mobile/      # 375px wireframes
│   │   └── web/         # 1280px wireframes
│   ├── figma-export.json
│   └── README.md
├── backend/             # Node.js + Express + PostgreSQL + Prisma
├── mobile/              # React Native + Expo SDK 51
├── web/                 # React + Vite + Tailwind CSS
├── docs/                # All documentation
└── package.json         # Root monorepo scripts
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Expo CLI (`npm install -g expo-cli eas-cli`)

### 1. Install all dependencies

```bash
npm run setup
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

### 3. Push database schema and seed data

```bash
npm run db:push
npm run db:seed
```

### 4. Start backend + web together

```bash
npm run dev
```

### 5. Start mobile (separate terminal)

```bash
cd mobile && npx expo start
```

---

## Default Login PINs (Seed Data)

| User      | Role        | PIN  | Shift           |
|-----------|-------------|------|-----------------|
| Barista 1 | barista_am  | 1111 | 6:00 AM–2:00 PM |
| Barista 2 | barista_pm  | 2222 | 12:00 PM–8:00 PM|
| Owner     | owner       | 0000 | Full access     |

**Change all PINs before going live via Settings screen.**

---

## Tech Stack

| Layer    | Stack                                              |
|----------|----------------------------------------------------|
| Backend  | Node.js 20, Express 4, PostgreSQL 15, Prisma ORM   |
| Mobile   | React Native, Expo SDK 51, Zustand, React Query    |
| Web      | React 18, Vite 5, Tailwind CSS 3, Chart.js         |
| Auth     | PIN-based, JWT (8-hour expiry)                     |
| Sync     | Notion API (manual owner-triggered)                |

---

## Brand

- **Primary:** `#6BCB77` (Light Green)
- **Secondary:** `#2D6A4F` (Dark Green)
- **Background:** `#FFFFFF`
- **Surface:** `#F7F9F7`
- **Font:** Inter (Google Fonts)

---

## Deployment

| Service  | Platform | Guide                        |
|----------|----------|------------------------------|
| Backend  | Railway  | [docs/DEPLOY_BACKEND.md](docs/DEPLOY_BACKEND.md) |
| Web      | Vercel   | [docs/DEPLOY_WEB.md](docs/DEPLOY_WEB.md)         |
| Mobile   | EAS      | [docs/PLAYSTORE.md](docs/PLAYSTORE.md)           |

---

## Documentation Index

- [API Reference](docs/API.md)
- [Staff Guide (Barista)](docs/STAFF_GUIDE.md)
- [Owner Guide](docs/OWNER_GUIDE.md)
- [Figma Import Guide](docs/FIGMA.md)
- [Notion Sync Guide](docs/NOTION_SYNC.md)

---

© 2026 Fika Takeaway. Dillibazar, Kathmandu, Nepal.
