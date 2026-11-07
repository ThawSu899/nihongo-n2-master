# Architectural Stack Specification: Nihongo N2 Master (Bunpro-Enhanced)
**Project**: Nihongo N2 Master  
**Paradigm**: 100% Offline-First Progressive Web App (PWA) with Local IndexedDB Persistence  
**Design Theme**: Modern Obsidian Glass & Neon Glow (#09090b with Emerald/Rose/Indigo Accents)  

---

## 1. Core Technology Stack

| Layer | Technology | Version | Rationale & Trade-offs |
| --- | --- | --- | --- |
| **Runtime & Framework** | React + TypeScript | React 19 / TS 5.7+ | Strict static typing for JLPT curricula, high-performance virtual DOM for rapid reviews |
| **Styling & Design System** | Tailwind CSS v4 + Obsidian Glass Theme | Tailwind 4.x | Utility-first CSS with native hardware-accelerated backdrops (`backdrop-blur-xl`, `bg-zinc-900/80`) |
| **Animation & Transitions** | Framer Motion | 12.x | 3D card flips (`preserve-3d`), layout animations for segmented nav tabs (`layoutId="activeTestTab"`), drawer slide-overs |
| **Local Database & Storage** | Dexie.js (IndexedDB wrapper) | 4.x | Fast, zero-network, relational indexing on device; survives browser cache evictions; handles 100,000+ records |
| **Spaced Repetition Algorithm** | Free Spaced Repetition Scheduler (FSRS) | ts-fsrs 5.4+ | Superior retention model compared to SM-2, with stability/difficulty decay metrics |
| **Japanese IME & Input** | WanaKana | 5.3+ | Real-time Romaji-to-Kana conversion for cloze typing tests without requiring native OS Japanese IME |
| **Audio Engine** | Web Speech API + HTML5 Audio Pre-cache | Native Browser API | Instant offline pronunciation of Japanese text with zero bandwidth footprint |
| **Data Validation** | Zod | 3.x / 4.x | Runtime schema enforcement for 174 lesson packs and Anki exports |
| **PWA & Offline Service Worker** | VitePWA + Workbox | 2.x / Vite 8.x | Aggressive precaching of JS/CSS, fonts (Noto Sans JP/Myanmar), and curriculum JSON for cold offline boots |

---

## 2. Key Architectural Decisions (ADRs)

### ADR-01: Hybrid Cloze Production vs. Flashcard Flipping
- **Decision**: In `SRSReviewScreen.tsx`, grammar cards default to **Cloze Mode** (fill-in-the-blank with WanaKana auto-conversion), while vocabulary and kanji retain **Flip Card Mode**.
- **Rationale**: Bunpro's primary competitive advantage is active grammar formulation. Memorizing full sentences passively on flashcards leads to recognition illusion; cloze input forces conjugation and particle synthesis.
- **Fallbacks**: Mobile users on tight commutes can toggle "Quick Flip Mode" (Space / 1-4 numeric rating) at any time.

### ADR-02: Client-Side Nuance Interception (Synonym Handling)
- **Decision**: Introduce a `NuanceInterceptor` engine with a curated map of accepted synonyms, near-misses, and register differences.
- **Rationale**: When a user inputs `〜としたら` for a sentence expecting `〜ものなら`, an SM-2/FSRS card failure is pedagogically destructive. The interceptor catches valid synonyms, shakes the input amber, and shows a contextual prompt (*"Looking for an impossible desire"*).

### ADR-03: Ghost Reviews via Dexie Sub-Table with Alternate Sentences
- **Decision**: Lapsed cards (&ge; 3 lapses) spawn a temporary `ghost_cards` entry with its own accelerated 4-stage schedule (4h &rarr; 8h &rarr; 24h &rarr; 48h) and rotate to an alternate context sentence from the lesson pack.
- **Rationale**: Isolates leeches so they do not artificially distort main FSRS deck statistics, while ensuring the learner practices the pattern in fresh context rather than memorizing a single sentence.

### ADR-04: Zero-Backend Architecture
- **Decision**: No external server database, no user accounts, no subscriptions.
- **Rationale**: Ensures privacy, zero operating cost, infinite offline longevity, and instant sub-10ms UI latency.
