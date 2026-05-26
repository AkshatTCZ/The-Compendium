# The Compendium

A modern full-stack video game tracking platform inspired by services like Backloggd, MyAnimeList, and Steam libraries — built with a focus on discovery, personal tracking, rich game metadata, and immersive UX.

Live Demo: https://the-compendium-track.vercel.app/

---

# Features

## Game Discovery

* Search games using the RAWG Video Games Database API
* Discover trending, top-rated, and recent releases
* Rich game metadata and screenshots
* Dynamic game detail modals
* Responsive discovery sections

## Personal Game Library

Users can:

* Add games to their personal library
* Track play status
* Rate games
* Track hours played
* Mark completion state
* Track replay counts
* Edit and delete entries

Supported statuses:

* Playing
* Completed
* Dropped
* On Hold
* Plan To Play

Completion states:

* None
* Story Complete
* 100%

## Authentication System

* Multi-user account system
* Session-based authentication
* Persistent login sessions
* Secure cross-origin cookie authentication
* Protected API routes
* Production-ready session persistence

## Modern UI/UX

* Responsive dark-mode design
* Vertical cinematic modals
* Smooth hover effects and animations
* Grid + list library views
* Dynamic badges and metadata displays
* Mobile-friendly layouts
* Loading skeletons and graceful error handling

## Rich Game Detail Pages

Each game detail modal includes:

* Screenshots
* Trailers/clips
* Metacritic scores
* Community ratings
* Platform support
* Developer and publisher information
* Store links (Steam, PlayStation, Xbox, etc.)
* User tracking statistics

---

# Tech Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript

## Backend

* Node.js
* Express.js

## Database

* SQLite
* better-sqlite3

## Authentication

* express-session
* better-sqlite3-session-store
* bcrypt

## APIs

* RAWG Video Games Database API

## Deployment

* Frontend: Vercel
* Backend: Render

---

# Architecture Overview

## Frontend

The frontend is a lightweight Vanilla JS SPA-style experience with modular UI sections, dynamic modals, and fetch-driven rendering.

### Key Systems

* Dynamic search/discovery rendering
* Modal management system
* Session-aware navigation
* Cached game detail fetching
* Responsive list/grid rendering
* Toast notification system

## Backend

The Express backend acts as:

* Authentication server
* Session manager
* RAWG API proxy
* Library CRUD API
* Community stats provider

### Core Backend Features

* Session persistence
* Protected routes middleware
* SQLite persistence
* Modular route architecture
* Production CORS handling
* Cross-origin secure cookie auth

---

# Authentication Architecture

The app uses:

* Session-based authentication
* Secure HTTP-only cookies
* Cross-origin credentials handling
* Persistent SQLite session storage

Security features include:

* bcrypt password hashing
* Secure cookies
* SameSite=None configuration
* Partitioned cookies (CHIPS)
* Session persistence validation
* Protected API routes

---

# Project Structure

```bash
Game Tracker/
│
├── backend/
│   ├── middleware/
│   ├── routes/
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── database.sqlite
│
├── frontend/
│   ├── index.html
│   ├── library.html
│   ├── login.html
│   ├── signup.html
│   ├── script.js
│   ├── library.js
│   ├── auth.js
│   └── style.css
│
└── README.md
```

---

# Production Deployment

## Backend (Render)

Required environment variables:

```env
RAWG_API_KEY=your_key
SESSION_SECRET=your_secret
NODE_ENV=production
```

## Frontend (Vercel)

Frontend automatically switches API URLs depending on environment.

---

# Current Features Implemented

* [x] Game search
* [x] Discovery homepage
* [x] User authentication
* [x] Session persistence
* [x] Library CRUD
* [x] Game detail modals
* [x] Responsive UI
* [x] Replay tracking
* [x] Community statistics
* [x] Cross-origin deployment
* [x] Production deployment

---

# Planned Features

## Stats Dashboard

Planned user analytics:

* Favorite genres
* Completion rate
* Total hours played
* Most replayed games
* Platform distribution
* Rating breakdowns

## Hover Preview System

Planned hover interactions:

* Screenshot cycling previews
* Hover trailers
* Animated discovery cards

## Steam Integration

Future support for:

* Steam profile linking
* Imported libraries
* Playtime syncing
* Achievement syncing

## Social Features

Potential future additions:

* Public profiles
* Reviews
* Friends/following
* Shared lists
* Recommendations

---

# Challenges & Learnings

This project involved solving several real-world full-stack engineering challenges including:

* Cross-origin session authentication
* Modern browser cookie restrictions
* Session persistence race conditions
* Deployment environment mismatches
* SQLite migration issues
* Production CORS configuration
* Dynamic UI state management
* Async loading/error handling

---

# Credits

## APIs

* RAWG Video Games Database API

## Inspiration

Inspired by:

* Backloggd
* MyAnimeList
* Steam
* PlayStation Store

---

# License

This project is currently for educational and portfolio purposes.

---

# Author

Built by Akshat Kulshreshtha.
