# BuildSignal CLI & Agent Observer 🚀

> **Turn your everyday coding sessions into verified technical stories, LinkedIn posts, and 1080×1350 visual cards with Zero-Leak local privacy.**

BuildSignal observes your AI coding sessions in **Claude Code** and **OpenAI Codex**, detects high-value educational learnings, and synthesizes publishable stories with code evidence.

---

## ⚡ Quickstart

### 1. Link your terminal to your BuildSignal Account:
```bash
npx buildsignal link <your_installation_token>
```

### 2. Auto-configure hooks for Claude Code & Codex:
```bash
npx buildsignal install
```

### 3. Send a test session to verify the connection:
```bash
npx buildsignal simulate
```

### 4. Check system diagnostics & Zero-Leak health:
```bash
npx buildsignal status
```

---

## 🔒 Zero-Leak Local Privacy

BuildSignal executes its secret redactor locally **before any byte is transmitted**:
- Redacts API keys (`sk-...`, Clerk, GitHub, AWS, Bearer tokens)
- Strips personal home directory paths
- Truncates verbose outputs
- Redacts sensitive email addresses

---

## 🛠️ CLI Commands

| Command | Description |
| :--- | :--- |
| `buildsignal link <token>` | Link terminal to your user account |
| `buildsignal install` | Auto-configure `~/.claude/config.json` & `~/.codex/config.json` |
| `buildsignal status` | Check account link, offline queue & endpoint health |
| `buildsignal whoami` | View currently connected account & device |
| `buildsignal simulate` | Send a verified test session with failing/passing tests |
| `buildsignal flush` | Drain offline queue to Convex |
| `buildsignal unlink` | Reset to anonymous local mode |

---

## 📄 License

MIT © BuildSignal
