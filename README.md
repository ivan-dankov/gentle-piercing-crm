# Gentle Piercing CRM

A comprehensive CRM web application for managing a piercing business, including client management, earrings inventory, services, and bookings with calendar view, profit calculations, and tax logic.

## Features

- **Clients Management**: Add, edit, and view clients with full booking history
- **Earrings Inventory**: Track stock levels, costs, and sales
- **Services Management**: Manage available services with pricing and duration
- **Bookings**: 
  - Calendar view (day/week/month)
  - Create and edit bookings with automatic calculations
  - Profit calculations including tax deductions
  - Automatic stock management
  - Tax logic (8.5% default, auto-enabled for BLIK payments)
- **Dashboard**: Overview of key metrics

## Tech Stack

- **Framework**: Next.js 16+ (App Router) with TypeScript
- **UI**: shadcn/ui components with Tailwind CSS
- **Backend**: Supabase (PostgreSQL database)
- **Calendar**: react-big-calendar
- **Forms**: react-hook-form with zod validation

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration file:
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and execute in the Supabase SQL Editor

### 4. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   You can find these in your Supabase project settings under API.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
gentle-piercing-crm/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx            # Dashboard home
│   │   ├── clients/            # Client pages
│   │   ├── bookings/           # Booking pages with calendar
│   │   ├── earrings/           # Earring inventory pages
│   │   └── services/           # Service management pages
│   └── layout.tsx              # Root layout
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── booking-calendar.tsx    # Calendar view component
│   ├── booking-form.tsx        # Booking form with calculations
│   ├── client-form.tsx         # Client form
│   ├── earring-form.tsx        # Earring form
│   └── service-form.tsx        # Service form
├── lib/
│   ├── supabase/               # Supabase client utilities
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utility functions
└── supabase/
    └── migrations/             # Database migrations
```

## Key Features Explained

### Booking Logic

- **Profit Calculation**: `total_paid - (earring_cost + booksy_fee + broken_earring_loss + tax_amount)`
- **Tax**: Automatically enabled for BLIK payments, 8.5% default rate (configurable)
- **Stock Management**: Automatically updates earring stock when bookings are created/updated/deleted
- **Service Price**: Automatically set to 0 when `is_model` is checked
- **End Time**: Automatically calculated from service duration

### Database Triggers

The database includes several triggers:
- **Stock Management**: Updates earring stock quantities automatically
- **Profit Calculation**: Calculates profit before insert/update
- **Tax Calculation**: Calculates tax amount when enabled
- **Model Service**: Sets service_price to 0 when is_model is true

## Usage

1. **Set up your data**: Add clients, earrings, and services first
2. **Create bookings**: Use the calendar view to create new bookings
3. **Track profitability**: View profit calculations on each booking
4. **Manage inventory**: Stock levels update automatically when bookings are created

## Notes

- The client field in bookings is optional - you can create bookings without a client
- You can add a new client directly from the booking form
- Tax is automatically enabled for BLIK payments but can be toggled manually
- All calculations update in real-time as you fill out the booking form

## Deployment

### Deploying to Vercel (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project" and import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

4. **Add Custom Domain**
   - In project settings, go to "Domains"
   - Add `admin.gentlepiercing.pl`
   - Follow DNS configuration instructions
   - Update your DNS records (A or CNAME) as instructed

5. **Deploy**
   - Click "Deploy" - Vercel will build and deploy automatically
   - Your site will be live at `admin.gentlepiercing.pl` once DNS propagates

### Deploying to Custom Server/VPS

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables** (create `.env.production` or set in your hosting panel):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the production server**
   ```bash
   npm start
   ```

4. **Set up a reverse proxy** (nginx example):
   ```nginx
   server {
       listen 80;
       server_name admin.gentlepiercing.pl;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up SSL** (Let's Encrypt recommended):
   ```bash
   certbot --nginx -d admin.gentlepiercing.pl
   ```

### Database Migration

Before deploying, make sure to run all migrations in your Supabase project:
1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   - `001_initial_schema.sql`
   - `002_multiple_items.sql`
   - `003_rename_earring_cost.sql`
   - `004_broken_earrings_and_price.sql`
   - `005_fix_calculate_profit.sql`
   - `006_update_rls_policies.sql`

### Post-Deployment Checklist

- [ ] Environment variables are set in production
- [ ] All database migrations have been run
- [ ] Custom domain is configured and DNS is pointing correctly
- [ ] SSL certificate is installed (HTTPS)
- [ ] Test authentication flow (login/signup)
- [ ] Test all major features (bookings, clients, earrings, services)
- [ ] Verify RLS policies are working correctly
