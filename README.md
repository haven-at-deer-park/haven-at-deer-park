# Haven at Deer Park

A luxury countryside retreat website for properties in Vernon, BC. Built with Next.js, shadcn/ui, Tailwind CSS, and Supabase.

## Tech Stack

- **Framework**: Next.js 14 (App Router, static export)
- **UI**: React 18 + shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Hosting**: Firebase Hosting
- **Localization**: English / Italian

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run build        # Static export → /out
firebase deploy      # Deploy to Firebase Hosting
```

## Project Structure

```
app/              # Next.js App Router pages
src/
  components/     # UI components
  contexts/       # Language context provider
  hooks/          # Custom hooks (analytics, auth, etc.)
  integrations/   # Supabase client
  locales/        # EN/IT translations
public/images/    # Property photos and assets
supabase/         # Edge functions & migrations
```
