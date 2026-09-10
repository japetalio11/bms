# AGENTS.md - Frontend Security & Coding Guidelines

This repository enforces strict security and coding standards for all AI coding assistants (Antigravity, Gemini, Claude, Cursor, Copilot).

---

## 🔒 Security & Secret Management Rules (STRICT)

1. **NO HARDCODED SECRETS OR API KEYS**
   - Never embed API keys, OAuth secrets, database credentials, or JWT secrets directly into code as string literals.
   - Always load credentials exclusively from environment variables (`import.meta.env.VITE_*`).

2. **NO DANGEROUS SECRET FALLBACKS**
   - Never write OR fallback operators for secrets (e.g., `import.meta.env.VITE_KEY || "AIzaSy..."`).
   - If an environment variable is missing, either log a warning or handle missing config gracefully. Do NOT supply hardcoded secret fallbacks.

3. **ENVIRONMENT HYGIENE**
   - Keep `.env` files out of Git tracking (`.gitignore`).
