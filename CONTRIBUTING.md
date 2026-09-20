# Contributing to LegalSaathi

Thank you for contributing to LegalSaathi! To ensure maintainability and high code quality, we adhere strictly to the **Conventional Commits** specification.

---

## Commit Message Format

```text
<type>(<scope>): <subject>

Why:
- Explanation of why this change is necessary

What:
- Summary of what changes were implemented

Notes:
- Any additional context, migrations, or breaking changes
```

---

## Commit Types & Examples

### 1. `feat` (A new feature)

- `feat(parser): add pdf document text extraction support`
- `feat(summary): implement plain-language legal clause summarizer`

### 2. `fix` (A bug fix)

- `fix(env): resolve zod validation crash on missing optional keys`
- `fix(parser): handle empty pages in corrupted docx uploads`

### 3. `chore` (Routine maintenance, configs, or tooling updates)

- `chore(deps): upgrade tailwindcss and zod dependencies`
- `chore(husky): configure pre-commit hook for strict type checking`

### 4. `docs` (Documentation additions or updates)

- `docs(readme): add environment variables table and local setup guide`
- `docs(contributing): clarify conventional commits policy and examples`

### 5. `test` (Adding or updating tests)

- `test(parser): add unit tests for multi-page pdf extraction`
- `test(env): verify error throwing on invalid gemini api key`

### 6. `refactor` (Code refactoring without changing behavior)

- `refactor(gemini): extract prompt templates into separate module`
- `refactor(types): unify legal document clause interfaces`

---

## Development Workflow

1. Create a feature branch: `git checkout -b feat/your-feature-name`
2. Follow strict TypeScript conventions (no `any`).
3. Ensure all quality checks pass locally:
   ```bash
   npm run lint:strict
   npm run type-check
   npm run format:check
   npm run build
   ```
4. Commit using conventional commit format.
5. Push your branch and open a Pull Request.
