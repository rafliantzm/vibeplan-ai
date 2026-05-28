# AGENTS.md

## Project Name
VibePlan AI

## Main Reference
Use `docs/PRD_VibePlan_AI.md` as the primary product requirement document.

## Tech Stack
- Frontend: Next.js
- Backend: Laravel REST API
- Database: MongoDB
- AI Provider: Groq or OpenRouter
- Output: Markdown `.md`

## Development Rules
- Do not expose API keys in frontend code.
- Store all API keys in `backend-laravel/.env`.
- Do not commit `.env` files.
- Prioritize MVP features first.
- Keep frontend and backend separated.
- Store every AI generation result in MongoDB.
- Every AI generation result must include `markdown_content`.
- Every result must be downloadable as `.md`.

## Folder Structure
- `frontend-next/` for Next.js frontend.
- `backend-laravel/` for Laravel backend.
- `docs/` for PRD and documentation.

## MVP Priority
Build these features first:
1. Generate PRD
2. Generate Next Step Planner
3. Generate Coding Prompt
4. Save result to MongoDB
5. History Page
6. Detail History Page
7. Download `.md`
8. About Team Page

## Safety
Never hardcode real API keys.
If an API key is needed, use placeholder values and explain where the user should put the real key.