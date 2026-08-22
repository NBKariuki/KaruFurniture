# KARU Furniture Website

## Setup
1. `npm install`
2. `npm run dev` — local preview
3. `npm run build` — build for deployment

## Deploy to Netlify
- Connect GitHub repo OR drag `dist/` folder to Netlify
- Build command: `npm run build`
- Publish directory: `dist`

## Admin Access
- Click KARU logo 5 times on the site
- Password: set via VITE_ADMIN_PW environment variable in Netlify

## Supabase
- Configure via Netlify environment variables: VITE_SB_URL, VITE_SB_KEY
- Storage bucket: product-images (must be public)
