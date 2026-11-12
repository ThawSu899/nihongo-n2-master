# Nihongo N2 Master 🇯🇵

> A JLPT-aligned mastery learning operating system designed to guide learners seamlessly from **JLPT N5 to N2**. Powered by an adaptive spaced repetition system (SRS), a 15-stage pedagogical lesson engine, dual-language explanations (English & Myanmar/Burmese), and honest progress analytics.

---

## 🌟 Highlights & Key Features

- **Comprehensive 4-Level Curriculum (N5 → N4 → N3 → N2)**:
  - **174 total structured lessons**: N5 (30 lessons), N4 (36 lessons), N3 (48 lessons), N2 (60 lessons).
  - Fully curated vocabulary, kanji with stroke & radical data, sentence grammar linkages, and natural dialogues.
  - Complete reading passages and listening comprehension scripts for all lessons.
- **15-Stage Lesson Progression Pipeline**:
  - Stage 1: Lesson Orientation & Target Objectives
  - Stage 2: Target Vocabulary Mastery & Pronunciation
  - Stage 3: Kanji Stroke Order & Compound Formation
  - Stage 4: Grammar Formations & Nuance Analysis
  - Stage 5: Sentence Parsing & Particle Analysis
  - Stage 6: Spaced Repetition Flashcard Induction
  - Stage 7: Reading Comprehension with Furigana Toggles
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
  - Leech detection, review due date calculations, and streak retention tracking.
  - Smooth 3D card-flip animations powered by Framer Motion.
- **Dual Support Languages**:
  - Full English and Burmese / Myanmar (`my`) translations and explanations for grammatical patterns and vocabulary.
- **Privacy-First & Offline-First Architecture**:
  - Fully functional offline via Dexie / IndexedDB with exportable/importable JSON backups.
  - Generates standard `.ics` calendar files for scheduled study reminders without requiring external cloud accounts.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler / Dev Server**: [Vite 7](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations & Micro-interactions**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Host Server**: [Express](https://expressjs.com/) (lightweight hosting server for development and production SPA serving)
- **Testing**: [Vitest](https://vitest.dev/) (946 automated tests covering domain, assessment, curriculum sync, and flows)
- **Validation**: [Zod](https://zod.dev/) schemas enforcing curriculum data integrity

---

## 📁 Curriculum Data Structure

All curriculum content is organized under `content/` with strict schema validation:

```
content/
├── curriculum-map.json       # Master index with metadata for all 174 lessons
└── packs/
    ├── n5/
    │   ├── n5.l01.json
    │   └── ... (n5.l01 through n5.l30)
    ├── n4/
    │   ├── n4.l01.json
    │   └── ... (n4.l01 through n4.l36)
    ├── n3/
    │   ├── n3.l01.json
    │   └── ... (n3.l01 through n3.l48)
    └── n2/
        ├── n2.l01.json
        └── ... (n2.l01 through n2.l60)
```

Each lesson pack file conforms to the strict Zod `LessonPackSchema`:
- `meta`: `id`, `title`, `level` (`n5` | `n4` | `n3` | `n2`), `summary`, `estimatedMinutes`
- `vocabularies`: `id`, `kanji`, `kana`, `meaning` (en/my), `partOfSpeech`, `exampleSentenceId`
- `kanjis`: `id`, `character`, `onyomi`, `kunyomi`, `meaning` (en/my), `strokeCount`, `exampleSentenceIds`
- `grammars`: `id`, `pattern`, `meaning` (en/my), `formation`, `nuance`, `exampleSentenceIds`
- `sentences`: `id`, `japanese`, `english`, `burmese`, `particles`, `targetVocabIds`, `targetGrammarIds`
- `reading`: `passage`, `title`, `translations` (en/my), `questions`
- `listening`: `transcript`, `dialogueTurns`, `translations` (en/my), `questions`
- `questions`: 30 multiple-choice assessment questions with 4 unique distractors and answer explanations

---

## 💻 Local Development Instructions

### Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher

### 1. Installation
Clone your repository and install dependencies:
```bash
git clone https://github.com/<your-username>/nihongo-n2-master.git
cd nihongo-n2-master
npm install
```

### 2. Environment Variables (Optional)
The application runs 100% offline-first in the browser using Dexie / IndexedDB without requiring external API keys. You can optionally configure your server port in `.env`:
```bash
cp .env.example .env
```

### 3. Running the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` (or the port output in your terminal).

### 4. Running Tests & Quality Verification
```bash
# Run Vitest test suite
npm test

# Run TypeScript type check
npm run lint

# Build production bundle
npm run build
```

---

## 🚀 Deployment Guides

The project is built as a modern Single-Page Application (SPA) with pre-configured static routing rules.

### Option 1: Vercel (Recommended for instant SPA hosting)
The repository includes `vercel.json` configured for SPA rewrites and asset caching:
1. Push your repository to **GitHub**.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your `nihongo-n2-master` repository.
4. Set the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**. Your app will be live with full URL rewrite support.

### Option 2: Node.js Express Hosting Server
If you want to host the pre-built SPA via the Node.js Express server (`server.ts`) on platforms like Render, Railway, Fly.io, or Google Cloud Run:
```bash
# Build the client SPA
npm run build

# Start the production static server on port 3000
npm start
```

---

## 📥 How to Export from Google AI Studio to GitHub

Follow these steps to export the entire project files and publish to your own GitHub repository:

### Method A: Download Project ZIP from AI Studio UI
1. Look at the upper-right corner of the **Google AI Studio** workspace.
2. Click the **Export / Download** button (or project options menu `...` $\rightarrow$ **"Download Project"** / **"Export Code"**).
3. Save the downloaded `.zip` file to your computer and extract it.
4. Open your terminal in the extracted folder:
   ```bash
   cd nihongo-n2-master
   git init
   git add .
   git commit -m "Initial commit: Nihongo N2 Master full curriculum & app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

### Method B: Git Push Direct via CLI
If you have personal access token / SSH access configured in your environment:
```bash
git init
git config user.name "Your Name"
git config user.email "your-email@example.com"
git add .
git commit -m "feat: complete Nihongo N2 Master operating system"
git remote add origin https://github.com/<your-username>/nihongo-n2-master.git
git push -u origin main
```

---

## 📜 License & Acknowledgments

Built for dedicated Japanese language learners aiming for JLPT N5 through N2 proficiency. All curriculum data is structured for educational progression and retention.
