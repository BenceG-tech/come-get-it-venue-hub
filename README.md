# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c40952ff-7625-45d8-8cc4-e06de5f6ee13

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c40952ff-7625-45d8-8cc4-e06de5f6ee13) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Data Provider Configuration

This application uses a configurable data provider system that can switch between Supabase (production) and mock data (development).

### Environment Behavior

**Production:**
- Data provider is **locked to Supabase**
- URL parameters (`?provider=mock`) and localStorage overrides are **ignored for security**
- Override attempts are logged as security warnings

**Development/Staging:**
- Flexible provider switching supported
- Switch via URL: `?provider=supabase` or `?provider=mock`
- Switch via localStorage: `localStorage.setItem('provider', 'supabase')`
- Switch via env: `VITE_USE_SUPABASE=true`

### Environment Variables

Create appropriate `.env` files for each environment:

```bash
# .env.development
VITE_ENVIRONMENT=development
VITE_USE_SUPABASE=false
VITE_FORCE_SUPABASE=false

# .env.staging  
VITE_ENVIRONMENT=staging
VITE_USE_SUPABASE=true
VITE_FORCE_SUPABASE=false

# .env.production
VITE_ENVIRONMENT=production
VITE_USE_SUPABASE=true
VITE_FORCE_SUPABASE=true
```

### Troubleshooting: Provider Won't Change

**Q: Why can't I switch to mock data in production?**
A: This is intentional security behavior. Production always uses Supabase to prevent data inconsistencies and security issues.

**Q: Provider switching not working in development?**
A: Check these in order:
1. Verify you're in development mode (`import.meta.env.MODE !== 'production'`)
2. Check `VITE_FORCE_SUPABASE` is not set to `true`
3. Clear localStorage and try URL parameter: `?provider=mock`
4. Check browser console for configuration logs

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c40952ff-7625-45d8-8cc4-e06de5f6ee13) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
