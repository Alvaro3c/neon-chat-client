# CLAUDE.md — Chat App MVP

## Visual Reference
Use this repository **only as a reference for design and features**:
👉 [INSERT V0 REPO URL HERE]

- Do not copy any source code
- Use it to understand the UI structure, screens, and user flows
- Completely ignore TypeScript, Tailwind, and any repo-specific libraries

---

## Tech Stack

- **Framework**: React with JSX
- **Styles**: Plain CSS (one `.css` file per component, no Tailwind, no CSS-in-JS)
- **Language**: JavaScript (no TypeScript)
- **Authentication**: Firebase Authentication (Google Auth)
- **Real-time**: not included in this phase — backend will be added later
- **Drag and drop**: native HTML5 Drag and Drop API (no external libraries)
- **No database**: messages are ephemeral, nothing is persisted

---

## Folder Structure

```
src/
├── components/
│   ├── features/        # components tied to a specific feature/domain
│   │   ├── ChatWindow/
│   │   │   ├── index.jsx
│   │   │   └── ChatWindow.css
│   │   ├── MessageList/
│   │   └── ConversationSidebar/
│   └── shared/          # generic, reusable components with no domain knowledge
│       ├── Button/
│       │   ├── index.jsx
│       │   └── Button.css
│       ├── Avatar/
│       └── Input/
├── hooks/               # custom hooks (useAuth, useDragAndDrop, etc.)
├── context/             # React Context for global state (auth, chat)
├── services/            # external service logic (firebase.js, etc.)
├── styles/              # global styles and CSS variables
│   └── global.css
└── App.jsx
```

**`shared/`**: reusable anywhere in the app, no coupling to business logic (Button, Avatar, Input, Modal...)

**`features/`**: coupled to a specific part of the app (ChatWindow, MessageList, ConversationSidebar...)

---

## Code Conventions

- Each component lives in its own folder: `ComponentName/index.jsx` + `ComponentName.css`
- Component names in PascalCase
- All file and folder names in English
- All code (variables, functions, comments) in English
- CSS variables defined in `global.css` under `:root`
- No external UI libraries (no MUI, no Chakra, no shadcn) unless strictly necessary

---

## Authentication

- Google login via **Firebase Authentication**
- Used only to identify the user (name, email, avatar)
- No custom user system or manual registration
- Unauthenticated users cannot access the chat
- Firebase config goes in `services/firebase.js`

---

## Drag and Drop

- Implemented with the **native HTML5 Drag and Drop API** — no external libraries
- Used for reordering conversations in the sidebar
- Use `draggable`, `onDragStart`, `onDragOver`, `onDrop` attributes directly on JSX elements
- Extract reusable drag logic into a custom hook: `hooks/useDragAndDrop.js`

---

## What this MVP does NOT include

- Message history (no database)
- Real-time backend (added in a later phase)
- Push notifications
- Multiple rooms or channels
- User roles or moderation

---

## Notes for Claude Code

- Prioritize clean, readable code over premature optimization
- Respect the folder structure — do not create new folders without justification
- CSS must be semantic and use variables for colors, typography, and spacing
- If anything in the visual reference is unclear, ask before assuming
