# 🚀 Quick Start: TransfoStock Backend

Choose your setup path and follow the steps:

---

## Option 1: Test Locally First ⚡ (10 minutes)

### What You Get
- Backend runs on your computer
- Only THIS device can access it
- Perfect for testing before cloud

### Setup

1. **Install PostgreSQL locally** (if not already)
   - Windows: https://www.postgresql.org/download/windows/
   - Mac: `brew install postgresql`
   - Linux: `sudo apt install postgresql`

2. **Create local database**
   ```bash
   createdb transfostock
   ```

3. **Start backend**
   ```bash
   cd TransfoStock-backend
   npm install
   cp .env.example .env
   # Edit .env, set: DATABASE_URL=postgresql://localhost:5432/transfostock
   npm run dev
   ```

4. **Enable API in frontend**
   - In frontend folder, create `.env.local`:
   ```env
   VITE_USE_BACKEND=true
   VITE_API_URL=http://localhost:3001
   ```

5. **Restart frontend dev server**
   ```bash
   npm run dev
   ```

6. **Test**
   - Open app in browser
   - Try adding an item → should sync to local database
   - Check backend terminal for API logs

---

## Option 2: Deploy to Render.com ☁️ (Free, 20 minutes)

### What You Get
- Stock visible from anywhere
- Team can access together
- Auto-scaled, always on
- FREE to start (may pause after 7 days inactivity)

### Setup

1. **Create account** at render.com (use GitHub)

2. **Create database**
   - New → PostgreSQL
   - Name: `transfostock-db`
   - Copy the PostgreSQL URL

3. **Deploy backend**
   - New → Web Service
   - Choose GitHub repo (TransfoStock-backend)
   - Fill:
     - Name: `transfostock-api`
     - Build: `npm install`
     - Start: `npm start`
   - Add environment:
     - Key: `DATABASE_URL`
     - Value: Paste PostgreSQL URL
   - Deploy

4. **Update frontend**
   - Create `.env.local`:
   ```env
   VITE_USE_BACKEND=true
   VITE_API_URL=https://transfostock-api.onrender.com
   ```

5. **Restart frontend & test**
   - Any device can now access
   - Share the app URL with team!

---

## Option 3: Deploy to Hostinger 🏢 (Best, 30 minutes)

### What You Get
- 100GB storage (plenty!)
- Professional hosting
- Always on, no auto-pause
- You already have account

### Setup

1. **Log in to Hostinger cPanel**

2. **Create PostgreSQL database**
   - Database manager
   - Create: `transfostock_inventory`
   - Save connection details

3. **Upload backend**
   - File Manager → public_html
   - Create `api` folder
   - Upload TransfoStock-backend files
   - Create `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost/transfostock_inventory
   PORT=3001
   ```

4. **Install & run**
   - SSH to Hostinger:
   ```bash
   ssh user@your-host.com
   cd public_html/api
   npm install
   npm start
   ```

5. **Update frontend**
   - Create `.env.local`:
   ```env
   VITE_USE_BACKEND=true
   VITE_API_URL=https://your-domain.com/api
   ```

6. **Test**
   - App now uses cloud database
   - Share with all team members

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend running (check Render logs or terminal)
- [ ] Database created (can you connect to PostgreSQL?)
- [ ] Frontend has `.env.local` with correct URL
- [ ] Try adding item in app
- [ ] Check browser Console (F12) - no CORS errors?
- [ ] Backend logs show API call?
- [ ] Item appears in database?

---

## 🆘 If Something Breaks

### Backend won't start
```bash
# Check error in terminal/logs
# Verify: DATABASE_URL is set
# Verify: PostgreSQL is running
# Verify: npm packages installed (node_modules folder exists)
```

### Frontend can't reach backend
```bash
# Check .env.local has correct URL
# Check VITE_USE_BACKEND=true
# Check browser Console (F12) for CORS errors
# Verify backend is running and accessible
```

### Database connection fails
```bash
# Test locally first (Option 1)
# Verify DATABASE_URL format
# Verify PostgreSQL is running
# Check credentials are correct
```

---

## 📊 Compare Options

| Feature | Local | Render | Hostinger |
|---------|-------|--------|-----------|
| Cost | FREE | FREE/tier | Already paid |
| Setup | 10 min | 20 min | 30 min |
| Remote | ❌ | ✅ | ✅ |
| Team | ❌ | ✅ | ✅ |
| Uptime | Device | 99.9% | 99.9% |

**Recommendation**: Start with Local or Render, upgrade to Hostinger later.

---

## 📚 Full Documentation

- **Setup Guide**: See `SETUP_BACKEND.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Backend README**: See `TransfoStock-backend/README.md`
- **Deployment**: See `TransfoStock-backend/DEPLOYMENT.md`

---

## 🎯 What's Next?

1. Choose option (Local/Render/Hostinger)
2. Follow setup above
3. Test it works
4. **Share app with team!**

---

**Need Help?**
- Check the full guides above
- Test with local option first
- Review browser console errors (F12)
- Check backend logs for errors

**Good luck! 🚀**
