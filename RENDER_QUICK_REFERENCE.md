# 🚀 Render.com Deployment - Quick Reference Card

**Save this! It has everything you need to deploy.**

---

## 📋 Pre-Deployment Checklist

- [ ] GitHub account created
- [ ] Code pushed to GitHub ✅ (DONE!)
- [ ] Render.com account created
- [ ] 20 minutes free time

---

## ⚡ 5-Minute Overview

```
1. Create Render account (2 min)
2. Create PostgreSQL database (5 min, then wait)
3. Deploy backend from GitHub (5 min)
4. Add DATABASE_URL environment variable (1 min)
5. Test API (1 min)
6. Update frontend .env.local (1 min)
```

**Total: ~20 minutes**

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### STEP 1: Create Render Account
```
Go to: https://render.com
Click: Get Started
Choose: Sign up with GitHub
Authorize: Click "Authorize render-inc"
Done! ✅
```

### STEP 2: Create PostgreSQL Database
```
Dashboard → New + → PostgreSQL

Fill form:
├─ Name: transfostock-db
├─ Database: transfostock
├─ User: postgres
├─ Region: Oregon (US) [or your region]
├─ PostgreSQL Version: 15
└─ Plan: Free

Click: Create Database
Wait: 3-5 minutes for "Available" status

When ready:
├─ Click on database
├─ Find "Connections" section
└─ Copy "External Database URL"
    Format: postgresql://user:pass@host/db
    Save this! ⭐
```

### STEP 3: Deploy Backend Service
```
Dashboard → New + → Web Service

Click: Connect GitHub
Select: TransfoStock repository
Fill form:
├─ Name: transfostock-api
├─ Environment: Node
├─ Build Command: npm install
├─ Start Command: npm start
├─ Instance Type: Free
├─ Region: Oregon (same as DB)
└─ Plan: Free

DON'T click Deploy yet!
Scroll down to "Advanced" section...
```

### STEP 4: Add Environment Variable
```
Still on the same form...
Click: Add Environment Variable

Fill:
├─ Key: DATABASE_URL
└─ Value: [PASTE the URL you saved from STEP 2]

⚠️ NO EXTRA SPACES!

Now click: Create Web Service
```

### STEP 5: Monitor Deployment
```
Watch the logs appear:
├─ "Building application..."
├─ "npm install running..."
├─ "✅ Connected to PostgreSQL database"
├─ "✅ Database tables ready"
└─ "🚀 Server running on http://localhost:3001"

Status changes to: "Live" ✅

Your API URL:
👉 https://transfostock-api.onrender.com
```

### STEP 6: Test Backend
```
Open in browser:
https://transfostock-api.onrender.com/api/health

Should show: {"status":"ok","timestamp":"..."}

Success! ✅
```

### STEP 7: Connect Frontend
```
In your project (TransfoStock-main/):

Create or edit: .env.local

Add:
VITE_USE_BACKEND=true
VITE_API_URL=https://transfostock-api.onrender.com

Save file!
```

### STEP 8: Restart Frontend
```
Terminal:
Ctrl+C (stop current server)

npm run dev

Browser reloads automatically ✅
```

### STEP 9: Test Complete Integration
```
App opens: http://localhost:5173/TransfoStock/
Log in: Admin (password: 6600)
Go to: Inward
Add item:
├─ Item: "Test Item"
├─ Qty: 10
└─ Unit: "Nos"
Click: Save

Check Render logs:
├─ Dashboard → transfostock-api
├─ Logs tab
└─ Should show: "POST /api/movements 200"

Success! ✅
```

---

## 🔗 Important URLs

| What | URL |
|------|-----|
| GitHub Repo | https://github.com/Harshad159/TransfoStock |
| Render Dashboard | https://render.com/dashboard |
| Your API | https://transfostock-api.onrender.com |
| API Health Check | https://transfostock-api.onrender.com/api/health |
| Get Items | https://transfostock-api.onrender.com/api/items |

---

## 📞 Render Support URLs

```
Docs: https://render.com/docs
Help: https://render.com/support
Logs: Dashboard → Service → Logs
Status: https://renderstatus.com
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Service won't start | Check DATABASE_URL in Environment variables |
| Can't connect to database | Copy PostgreSQL URL again (no extra spaces) |
| API returns 500 error | Check Render logs for errors |
| Frontend can't reach API | Verify .env.local has correct URL |
| CORS error | Normal - backend allows CORS |
| Service auto-pauses | Free tier pauses after 15 min - upgrade for always-on |

---

## ✅ Verification Checklist

- [ ] Render account created
- [ ] PostgreSQL database deployed and showing "Available"
- [ ] PostgreSQL URL copied
- [ ] Backend service deployed and showing "Live"
- [ ] DATABASE_URL environment variable set
- [ ] API health check works (browser test)
- [ ] Frontend .env.local configured
- [ ] Frontend restarted (npm run dev)
- [ ] Can add items in app
- [ ] Render logs showing API calls

---

## 🎉 You're Done!

Your backend is **LIVE** ☁️

**What you can do now:**
- ✅ Access stock from any device
- ✅ Team members can log in and view inventory
- ✅ Stock syncs to cloud database
- ✅ Scale to any number of users
- ✅ Monitor API in real-time

---

## 📊 Your Deployment Architecture

```
Your Computer
    ↓
GitHub (github.com/Harshad159/TransfoStock)
    ↓
Render.com (Cloud)
    ├─ transfostock-api (Backend)
    ├─ transfostock-db (Database)
    └─ Logs & Monitoring
    ↓
Any Device
    ├─ Web Browser
    ├─ Mobile Phone
    └─ Tablet
```

---

## 🚀 Next Steps After Deployment

1. **Share with team**
   - Give them app URL
   - Passwords: Admin (6600), Storekeeper (7125)

2. **Test with real data**
   - Add actual items
   - Create inward/outward entries
   - Check from multiple devices

3. **Monitor performance**
   - Watch Render logs
   - Check API response times

4. **Plan upgrades** (if needed)
   - Upgrade to paid for always-on (no auto-pause)
   - Add more storage if inventory grows
   - Enable automatic backups

---

## 💾 For Your Team

**Share this:**
```
App URL: [your frontend URL or localhost]
Admin Password: 6600
Storekeeper Password: 7125
```

**They can:**
- Access stock from browser
- Create/update inventory
- View reports
- Download delivery documents

---

## 📝 Remember

- ✅ Database is in Oregon Render region (fast!)
- ✅ Free tier storage is 1GB (plenty for inventory!)
- ✅ Auto-pauses after 15 min (restart by accessing)
- ⚠️ Free database pauses after 7 days (upgrade if permanent)
- 💪 Can always upgrade to paid anytime

---

## 🎊 Congratulations!

You now have a **fully deployed cloud-based inventory management system!**

**GitHub Repository:** https://github.com/Harshad159/TransfoStock
**Backend API:** https://transfostock-api.onrender.com
**Status:** ✅ LIVE

---

**Last Updated**: February 12, 2026
**Difficulty**: Easy (no coding required)
**Time**: ~20 minutes
**Cost**: FREE! 🎉
