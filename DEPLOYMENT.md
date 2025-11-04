# Deployment Guide for admin.gentlepiercing.pl

This guide will help you deploy the Gentle Piercing CRM to `admin.gentlepiercing.pl`.

## Prerequisites

- [ ] Supabase project created and configured
- [ ] All database migrations run
- [ ] Environment variables ready
- [ ] Domain `admin.gentlepiercing.pl` ready for configuration

## Option 1: Deploy to Vercel (Easiest)

### Step 1: Prepare Repository

1. Ensure all code is committed:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js configuration

### Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Add Custom Domain

1. Go to project settings → **Domains**
2. Click **"Add Domain"**
3. Enter: `admin.gentlepiercing.pl`
4. Vercel will show DNS configuration instructions
5. Add the DNS records to your domain provider:
   - **Type**: CNAME
   - **Name**: admin (or @)
   - **Value**: cname.vercel-dns.com (or the provided value)
6. Wait for DNS propagation (usually 5-60 minutes)

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete
3. Your site will be live at `admin.gentlepiercing.pl` once DNS propagates

## Option 2: Deploy to Custom Server/VPS

### Step 1: Server Setup

1. SSH into your server
2. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### Step 2: Clone and Build

```bash
git clone <your-repo-url>
cd gentle-piercing-crm
npm install
npm run build
```

### Step 3: Environment Variables

Create `.env.production`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Set Up PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start npm --name "gentle-piercing-crm" -- start
pm2 save
pm2 startup
```

### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/admin.gentlepiercing.pl`:

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/admin.gentlepiercing.pl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.gentlepiercing.pl
```

## Database Setup

Before deployment, ensure all migrations are run in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order:
   - `001_initial_schema.sql`
   - `002_multiple_items.sql`
   - `003_rename_earring_cost.sql`
   - `004_broken_earrings_and_price.sql`
   - `005_fix_calculate_profit.sql`
   - `006_update_rls_policies.sql`

## Post-Deployment Verification

1. **Test Authentication**
   - Visit `https://admin.gentlepiercing.pl`
   - Should redirect to login page
   - Test sign up and sign in

2. **Test Features**
   - Create a client
   - Create a booking
   - Add an earring
   - Add a service
   - Verify dashboard loads correctly

3. **Check Environment**
   - Verify all Supabase queries work
   - Check browser console for errors
   - Verify RLS policies are working

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify all dependencies are installed
- Check Node.js version (18+ required)

### DNS Not Resolving
- Wait up to 24 hours for DNS propagation
- Verify DNS records are correct
- Use `dig admin.gentlepiercing.pl` to check DNS

### Authentication Not Working
- Verify Supabase environment variables are correct
- Check Supabase project settings
- Verify RLS policies are applied
- Check browser console for errors

### 500 Errors
- Check server logs (PM2: `pm2 logs`)
- Verify database migrations are complete
- Check Supabase project is active

## Maintenance

### Update Application

1. Pull latest code:
   ```bash
   git pull origin main
   npm install
   npm run build
   pm2 restart gentle-piercing-crm
   ```

2. For Vercel: Push to GitHub, Vercel auto-deploys

### Monitor Logs

- Vercel: Project → Deployments → View logs
- PM2: `pm2 logs gentle-piercing-crm`

