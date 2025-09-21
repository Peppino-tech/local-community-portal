# Local Community Portal (Starter)

## Quick Start
```bash
npm install
npm run setup-db
npm start
# Visit http://localhost:5000
```

## Tech
- Node.js (Express, EJS)
- better-sqlite3 (SQLite)
- HTML, CSS, JavaScript

## Notes
- Uses port **5000** (as required).
- `database/setup_db.js` creates and seeds `database/database.db`.
- Routes: `/`, `/sports`, `/health`, `/education`, `/arts`, `/faq`, `/contact`.
- Client-side validation in `public/js/script.js`.
- Responsive CSS with media queries in `public/css/style.css`.
