# Nihongo N2 Master 🇯🇵

> A JLPT-aligned mastery learning operating system designed to guide learners seamlessly from **JLPT N5 to N2**. Powered by an adaptive spaced repetition system (SRS), a 15-stage pedagogical lesson engine, dual-language explanations (English & Myanmar/Burmese), interactive Kanji drill workbench, Google Drive cloud sync, and honest progress analytics.

🌐 **Live Production Application**: [https://nihongo-n2-master-rewv.vercel.app](https://nihongo-n2-master-rewv.vercel.app)

---

## 🌟 Highlights & Key Features

- **Comprehensive 4-Level Curriculum (N5 → N4 → N3 → N2)**:
  - **174 total structured lessons**: N5 (30 lessons), N4 (36 lessons), N3 (48 lessons), N2 (60 lessons).
  - Fully curated vocabulary, kanji with stroke & radical data, sentence grammar linkages, and natural dialogues.
  - Complete reading passages and listening comprehension scripts for all 174 lessons.
  - Standardized, pure Burmese contextual explanations across all assessment questions and choice options.
- **Enhanced Kanji Deck & Stroke Visualizer**:
  - Full Onyomi (音) in Katakana and Kunyomi (訓) in Hiragana with stroke order visualizer (`画数`).
  - Compound vocabulary examples with native Web Speech TTS audio playback.
  - 3 interactive study modes: `一覧 (Grid View)`, `フラッシュカード (Flashcards)`, and `クイズ (Kanji Quiz)`.
- **15-Stage Lesson Progression Pipeline**:
  - Stage 1: Lesson Orientation & Target Objectives
  - Stage 2: Target Vocabulary Mastery & Pronunciation
  - Stage 3: Kanji Stroke Order & Compound Formation
  - Stage 4: Grammar Formations & Nuance Analysis
  - Stage 5: Sentence Parsing & Particle Analysis
  - Stage 6: Spaced Repetition Flashcard Induction
  - Stage 7: Reading Comprehension with Furigana Toggles (Dokkai Workbench)
  - Stage 8: Listening Audio Simulation & Transcript Breakdown
  - Stage 9: Sentence Scramble & Construction Practice
  - Stage 10: Cloze Fill-in-the-Blank Practice
  - Stage 11: Particle Drill Challenge
  - Stage 12: Contextual Dialogue Simulation
  - Stage 13: 30-Question Rigorous Mastery Assessment (80% Passing Gate)
  - Stage 14: Dynamic Remediation Flow (Targeted Retry for Missed Items)
  - Stage 15: Mastery Completion & Ladder Promotion
- **Adaptive Spaced Repetition (SRS)**:
  - SM-2 / Leitner-hybrid algorithm with 8 ladder stages (*Apprentice I–IV, Guru I–II, Master, Enlightened, Burned*).
  - Real-time rating options (*Again, Hard, Good, Easy*) with interval projection chips.
  - Leech quarantine detection, review due date calculations, and streak retention tracking.
  - Smooth 3D tactile card-flip animations powered by Framer Motion.
- **Dual Support Languages**:
  - Comprehensive English and Burmese / Myanmar (`my`) translations, vocabulary breakdowns, and grammatical nuance notes.
- **Google Drive Cloud Backup & Sync**:
  - Seamless OAuth2 authentication via Google Identity Services (`VITE_GOOGLE_CLIENT_ID`).
  - Strict `drive.file` scope access ensuring the app only reads and writes its own `Japanese-N2-Master` backup folder.
  - Resilient folder and file ID caching with explicit API permission error handling.
- **Quota-Safe Dual-Tier Storage Architecture**:
  - Full rolling database snapshots stored in IndexedDB to completely prevent browser `QuotaExceededError`.
  - Quota-safe `localStorage` secondary mirror containing active learner state while stripping redundant static lesson packs.
- **Automatic PWA Update System (`PWAUpdateBanner`)**:
  - Proactive Service Worker update detection on tab focus (`visibilitychange`) and every 30 minutes while online.
  - Clean non-intrusive banner notification allowing instant single-click reload without requiring manual hard refreshes (Ctrl+F5).
- **Privacy-First & Offline-First Architecture**:
  - 100% operable offline via IndexedDB / Dexie with full exportable/importable JSON backups.
  - Generates standard `.ics` calendar files for scheduled study reminders without requiring third-party cloud accounts.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) (`19.3.1`) + [TypeScript](https://www.typescriptlang.org/) (`7.0.2`)
- **Bundler / Dev Server**: [Vite 8](https://vitejs.dev/) (`8.3.4`)
- **Compiler / Engine**: [esbuild](https://esbuild.github.io/) (`0.28.2`)
- **Client Storage**: [Dexie](https://dexie.org/) (`4.4.6`) / IndexedDB
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`4.3.3`)
- **PWA & Offline Worker**: [Vite PWA](https://vite-pwa-org.netlify.app/) (`2.0.0`)
- **Animations & Micro-interactions**: [Framer Motion](https://www.framer.com/motion/) (`12.43.0`)
- **Icons**: [Lucide React](https://lucide.dev/) (`0.546.0`)
- **Host Server**: [Express](https://expressjs.com/) (`4.22.3`) (optional lightweight SPA server)
- **Testing**: [Vitest](https://vitest.dev/) (`5.0.5`) — **1,057 automated tests across 53 test files (100% passing)**
- **Validation**: [Zod](https://zod.dev/) (`4.6.7`) schemas enforcing strict curriculum integrity

---

## 📁 Curriculum Data Structure

All curriculum content is organized under `content/` with strict schema validation:

```text
content/
├── curriculum-map.json       # Master index with metadata for all 174 lessons
└── packs/
    ├── n5/
    │   ├── n5.l01.json
    │   └── ... (n5.l01 through n5.l30 — 30 published lessons)
    ├── n4/
    │   ├── n4.l01.json
    │   └── ... (n4.l01 through n4.l36 — 36 published lessons)
    ├── n3/
    │   ├── n3.l01.json
    │   └── ... (n3.l01 through n3.l48 — 48 published lessons)
    └── n2/
        ├── n2.l01.json
        └── ... (n2.l01 through n2.l60 — 60 published lessons)
```

Each lesson pack file conforms to the strict Zod `LessonPackSchema`:
- `meta`: `id`, `title`, `level` (`N5` | `N4` | `N3` | `N2`), `summary`, `estimatedMinutes`
- `vocabularies`: `id`, `ja`, `kana`, `en`, `my`, `pos`, `exampleSentenceId`, `kanjiIds`, `pitchPattern`
- `kanjis`: `id`, `kanji`, `onyomi`, `kunyomi`, `meaningEn`, `meaningMy`, `strokeCount`, `exampleSentenceIds`
- `grammars`: `id`, `pattern`, `meaningEn`, `meaningMy`, `formation`, `nuance`, `exampleSentenceIds`
- `sentences`: `id`, `ja`, `en`, `my`, `particles`, `targetVocabIds`, `targetGrammarIds`
- `reading`: `passages`, `title`, `format` (`tanki` | `chuki` | `choubun`), `translations`, `questions`
- `listening`: `transcript`, `dialogueTurns`, `translations`, `questions`, `audio`
- `questions`: 30 multiple-choice assessment questions per lesson with 4 unique options and detailed explanations in English and Burmese (`explanationMy`)

---

## 💻 Local Development Instructions

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/ThawSu899/nihongo-n2-master.git
cd nihongo-n2-master
npm install
```

### 2. Environment Configuration (Optional)
The application runs 100% offline-first in the browser using IndexedDB without requiring external API keys. To configure optional Google Drive backup or local port settings:
```bash
cp .env.example .env
```
Edit `.env` to configure your `VITE_GOOGLE_CLIENT_ID` (OAuth 2.0 Web Client ID from Google Cloud Console).

### 3. Running the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` (or `http://localhost:5173`).

### 4. Running Quality Verification & Tests
```bash
# Run Vitest test suite (53 files, 1,057 tests)
npm test

# Run TypeScript type check
npm run lint

# Build production bundle with Vite PWA
npm run build
```

---

## 🚀 Deployment Guides

### Option 1: Vercel (Production Live Deployment)
The application is pre-configured with `vercel.json` for SPA rewrites, Service Worker headers, and cache rules:
- **Live URL**: [https://nihongo-n2-master-rewv.vercel.app](https://nihongo-n2-master-rewv.vercel.app)
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Add `VITE_GOOGLE_CLIENT_ID` in the Vercel Project Settings if using cloud backup.

### Option 2: Express Node.js Server
For self-hosting on Docker, Render, Fly.io, or Google Cloud Run:
```bash
# Build the client SPA
npm run build

# Start the production Express server on port 3000
npm start
```

---

## 📜 License & Acknowledgments

Built for dedicated Japanese language learners aiming for JLPT N5 through N2 proficiency. All curriculum data is structured for educational progression and retention.
