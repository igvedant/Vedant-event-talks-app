# BigQuery Release Pulse

BigQuery Release Pulse is a premium, glassmorphic web dashboard that monitors Google Cloud's BigQuery release notes feed. It segments complex, multi-item daily release notes into independent visual cards, tracks platform metrics, and allows you to customize and share updates to X (formerly Twitter) using an integrated URL-shortening character limit composer.

---

## ✨ Features

- **Automated Update Segmentation**: Splits single-day release posts containing multiple updates (e.g. Features, Announcements, Issues, Breaking Changes) into distinct visual cards.
- **Dynamic Metrics Tracker**: Automatically computes platform totals for features, announcements, and critical issues/warnings with loading counter animations.
- **X/Twitter Composer Modal**: Integrates with Twitter's Web Intent system. Features live character count tracking that respects Twitter's automatic 23-character shortening for links.
- **Smart Caching Layer**: Caches Google Cloud's RSS feed in memory for 10 minutes to minimize network latency and prevent rate-limiting, with visual force-refresh controls.
- **Premium Dark Aesthetics**: Styled using modern HSL colors, responsive grid cards, sticky date bars, and soft glowing indicators.

---

## 📂 Project Structure

```bash
bigquery-release-notes-app/
├── app.py               # Flask backend, XML parser, and in-memory cache
├── templates/
│   └── index.html       # HTML5 structure, inline SVGs, & composer modal
├── static/
│   ├── css/
│   │   └── style.css    # Premium CSS design, animations, & themes
│   └── js/
│       └── app.js       # Dynamic feed rendering, metrics, & composer control
├── .gitignore           # Ignores byte-code, environments, & workspace configs
└── README.md            # Project guide and instructions
```

---

## 🛠️ Installation & Getting Started

### Prerequisites

Make sure you have Python 3.12+ (or 3.7+) installed on your machine.

### 1. Install Dependencies

Install the required library packages via `pip`:

```bash
pip install flask requests
```

### 2. Start the Application

Run the Flask server:

```bash
python app.py
```

The application will start in development mode on `http://127.0.0.1:5000`.

### 3. Open in Browser

Go to [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## 🔌 API Documentation

### `GET /api/releases`

Fetches and returns the segmented BigQuery release list.

#### Query Parameters
- `refresh` (boolean, optional): Set to `true` to bypass the in-memory cache and fetch directly from Google Cloud. Example: `/api/releases?refresh=true`

#### Sample Response
```json
{
  "success": true,
  "source": "network",
  "timestamp": 1718627800,
  "data": [
    {
      "date": "June 16, 2026",
      "iso_date": "2026-06-16T00:00:00-07:00",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026",
      "updates": [
        {
          "id": "update_june_16_2026_0",
          "type": "Announcement",
          "body": "<h3>Announcement</h3><p>Table Explorer behavior is moving to the Reference panel...</p>",
          "snippet": "Announcement: Table Explorer behavior is moving to the Reference panel..."
        }
      ]
    }
  ]
}
```

---

## 🛠️ Git Integration

To push this repository to your GitHub account:

1. Authenticate your GitHub CLI locally:
   ```bash
   gh auth login
   ```
2. Create the remote repository on your account and push:
   ```bash
   gh repo create Vedant-event-talks-app --public --source=. --remote=origin --push
   ```
