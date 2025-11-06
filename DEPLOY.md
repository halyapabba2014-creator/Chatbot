# Deploy to Render - Step by Step Guide

## Prerequisites
- GitHub account with your code pushed (already done ✅)
- Render account (free tier available)

## Step-by-Step Deployment

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account (recommended) or email
3. Verify your email if needed

### Step 2: Create New Web Service
1. Click **"New +"** button in the dashboard
2. Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: `halyapabba2014-creator/Chatbot`

### Step 3: Configure Service
Fill in the following settings:

- **Name**: `halya-chat` (or any name you prefer)
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: Leave empty (or `.` if required)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `npm install`
   - Start your server with `npm start`
3. Wait 2-3 minutes for the build to complete

### Step 5: Get Your Live URL
Once deployed, you'll get a URL like:
- `https://halya-chat.onrender.com` (or your custom name)

### Step 6: Test Your Deployment
1. Visit your Render URL
2. Test the chatbot functionality
3. Your app is now live! 🎉

## Optional: Custom Domain
1. In your service settings, go to **"Custom Domains"**
2. Add your domain name
3. Follow Render's DNS instructions

## Auto-Deploy
- Render automatically deploys when you push to `main` branch
- Each deployment gets a unique URL
- Previous deployments are kept for rollback

## Troubleshooting
- **Build fails**: Check logs in Render dashboard
- **App not loading**: Ensure `server.js` is in root directory
- **Port issues**: Render sets `PORT` automatically (already handled in code)

## Free Tier Limits
- 750 hours/month free
- Spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds

---

**Your app is now live on Render!** 🚀

