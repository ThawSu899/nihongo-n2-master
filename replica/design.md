# Design System & UI Specification: Nihongo N2 Master (Bunpro-Enhanced)
**Theme**: Modern Obsidian Glass & Neon Glow  
**Base Surface**: Deep Obsidian Zinc (`#09090b` / `bg-zinc-950`) with Frosted Glass Containers (`bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-2xl`)  
**Typography**: Inter (Latin/UI), Noto Sans JP (Japanese Kanji/Kana), Noto Sans Myanmar (Burmese Definitions), JetBrains Mono (Intervals/Hotkeys)

---

## 1. Design Tokens & Visual Hierarchy

### Semantic Neon Color Matrix

| Token Name | Hex Code | Tailwind Class | Usage in Bunpro-Enhanced Features |
| --- | --- | --- | --- |
| **Obsidian Void** | `#09090b` | `bg-zinc-950` | Full-screen app background, immersive review backdrop |
| **Glass Surface** | `rgba(24, 24, 27, 0.8)` | `bg-zinc-900/80 backdrop-blur-xl` | Flashcard containers, cram modal cards, ghost decks |
| **Glass Border** | `rgba(39, 39, 42, 0.8)` | `border-zinc-800/80` | Subtle 1px structural hairlines |
| **Neon Emerald** | `#10b981` | `text-emerald-400 border-emerald-500/40` | Correct cloze answers, mastered SRS rank, online PWA status |
| **Neon Amber** | `#f59e0b` | `text-amber-400 border-amber-500/40` | Nuance warnings, synonym interceptors, ghost alerts |
| **Neon Rose** | `#f43f5e` | `text-rose-400 border-rose-500/40` | Incorrect cloze answers, leech quarantine badges, reset button |
| **Neon Indigo** | `#6366f1` | `text-indigo-400 border-indigo-500/40` | Active Cloze input focus ring, Cram Lab badges, N2 level indicator |

---

## 2. Component 1: Cloze Active Recall Card (`ClozeSentenceCard.tsx`)
- Japanese sentence prompt with interactive input blank `[ _____ ]`.
- Built-in real-time Wanakana conversion from Romaji to Hiragana.
- Toggleable progressive nuance hints.
- Audio playback on completion.

---

## 3. Component 2: Nuance Interceptor Warning (`NuanceWarningBanner.tsx`)
- Pulsing Amber glass badge alerting learner when input is grammatically valid but another synonym was expected.
- Contrastive prompt explaining why the target grammar pattern differs.
- Horizontal micro-shake animation.

---

## 4. Component 3: Ghost Leech Quarantine Hub (`GhostQuarantineHub.tsx`)
- 4-stage micro-interval timeline (4h &rarr; 8h &rarr; 24h &rarr; 48h).
- Context sentence rotation indicator.
- Exorcise drill launcher.

---

## 5. Component 4: Grammar Cram Lab (`GrammarCramLab.tsx`)
- Filterable thematic categories (Conditions, Emotions, Assertions, Tendencies).
- Unranked drill sprint selector (10, 15, 25, 40 Qs).
