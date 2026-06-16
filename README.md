# BigQuery Release Notes Dashboard & X/Twitter Share Tool

A responsive web application that fetches, parses, searches, filters, and shares official Google Cloud BigQuery release updates. Built using Python Flask and Vanilla HTML/CSS/JavaScript.

---

## 🌟 Features

* **Atom Feed Ingestion**: Connects directly to the official Google Cloud BigQuery release notes XML feed.
* **Granular Entry Parsing**: Splits combined daily updates into individual items (e.g. separates multiple Features, Issues, and Deprecations) for structured reading.
* **Instant Filter & Search**: Client-side filtering by categories (Features, Issues, Deprecations) and instant search queries.
* **Animated Analytics**: Real-time counter metrics highlighting the current volume of updates in the feed.
* **Sleek Glassmorphism UI**: High-fidelity theme offering both Dark Mode (default) and Light Mode with preferences persisted via `localStorage`.
* **Integrated X/Twitter Composers**:
  * **Single Share**: Instantly tweet a single release note pre-formatted with official documentation links.
  * **Batch/Thread Composer**: Select multiple updates to auto-compile a bulleted thread with character-limit validation (280 characters max).

---

## 📁 Project Structure

```text
bigquery_dashboard/
│
├── app.py                 # Flask server, Atom XML parser, & REST API
├── feed_cache.xml         # Local cache of the XML feed (auto-generated)
├── README.md              # Project documentation
├── .gitignore             # Git exclusion rules
│
├── templates/
│   └── index.html         # Frontend HTML structure
│
└── static/
    ├── css/
    │   └── style.css      # Styling rules, variables, light/dark themes
    └── js/
        └── main.js        # Controller for DOM manipulation, AJAX, & Twitter draft tools
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.x
* `pip` package manager

### 1. Installation
Clone the repository or navigate to your local workspace, then install Flask and Requests dependencies:

```bash
pip install flask requests
```

### 2. Run the Application
Start the development server from the project root directory:

```bash
python3 app.py
```

The application will start, parse the initial feed, and launch the server.

### 3. Open in Browser
Open your browser and navigate to:
```text
http://127.0.0.1:5001
```

---

## 🔧 API Reference

### `GET /api/notes`
Fetches and returns the parsed list of updates.

**Query Parameters:**
* `refresh` (optional): Set to `true` (e.g., `/api/notes?refresh=true`) to force the backend to fetch a fresh XML copy from Google Cloud, bypass the cache, and rebuild the data.

**Sample JSON Response:**
```json
[
  {
    "id": "June_15_2026_0",
    "date": "June 15, 2026",
    "type": "Feature",
    "html": "<h3>Feature</h3>\n<p>Use Gemini Cloud Assist to analyze your SQL...</p>",
    "text": "Use Gemini Cloud Assist to analyze your SQL...",
    "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026",
    "tweet_text": "BigQuery [Feature] (June 15, 2026): Use Gemini Cloud Assist... https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026"
  }
]
```

---

## 🎨 Technology Stack
* **Backend**: Python 3, Flask, XML ElementTree, Requests
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Custom Design System, Flexbox/Grid)
* **Icons**: Custom SVG graphics
* **Fonts**: Google Fonts (Inter, Outfit)
