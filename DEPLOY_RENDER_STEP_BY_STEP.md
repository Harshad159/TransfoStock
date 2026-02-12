# 🚀 Deploy Backend to Render.com (Complete Step-by-Step)

## ✅ Your GitHub Repository
**Repository**: https://github.com/Harshad159/TransfoStock

Your code includes:
- ✅ Frontend app (React)
- ✅ Backend API (Node.js + Express)
- ✅ All documentation

---

## 📋 Deployment Checklist

- [ ] Create Render.com account
- [ ] Create PostgreSQL database
- [ ] Deploy backend service
- [ ] Configure environment variables
- [ ] Test API endpoints
- [ ] Update frontend configuration

---

## 🎯 Step 1: Create Render.com Account (2 min)

1. Go to **https://render.com**
2. Click **Get Started** or **Sign Up**
3. Choose **Sign up with GitHub** (easiest!)
4. Authorize Render to connect to your GitHub
5. Verify email if needed
6. You're logged in! ✅

---

## 🗄️ Step 2: Create PostgreSQL Database (5 min)

### In your Render Dashboard:

1. Click **New +** button (top right)
2. Select **PostgreSQL**
3. Fill the form:
   ```
   Name: transfostock-db
   Database: transfostock
   User: postgres
   Region: Oregon (US - closest)  [or pick your region]
   PostgreSQL Version: 15
   Plan: Free
   ```
4. Click **Create Database**
5. ⏳ **Wait 3-5 minutes** until it shows "Available"

### Copy Your Database URL

1. Click on your database from the dashboard
2. Scroll to **Connections** section
3. Copy the **External Database URL** (red box)
   - Format: `postgresql://user_xyz:password_abc@oregon-postgres.render.com:5432/database_name`
4. **Save this somewhere safe** - you'll need it next!

---

## 🔧 Step 3: Deploy Backend Service (8 min)

### Create Web Service for Backend

1. In Render Dashboard, click **New +**
2. Select **Web Service**
3. Click **Connect GitHub** (or select existing auth)
4. Find and select **TransfoStock** repository
5. Fill the deployment form:
   ```
   Name: transfostock-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   Plan: Free
   Region: Oregon (same as database)
   ```
6. **Scroll down** to "Advanced" section

### Add Environment Variable

1. Click **Add Environment Variable**
2. Fill:
   ```
   Key: DATABASE_URL
   Value: [PASTE the PostgreSQL URL from Step 2]
   ```
3. Make sure there are **NO extra spaces** in the URL!

### Deploy!

1. Click **Create Web Service** button at bottom
2. Render will start building and deploying
3. Watch the logs for:
   ```
   ✅ Connected to PostgreSQL database
   ✅ Database tables ready
   🚀 Server running
   ```
4. Once it shows **"Live"** - you're deployed! 🎉

**Your API URL will be:**
```
https://transfostock-api.onrender.com
```

---

## ✅ Step 4: Test Backend API (2 min)

### Test 1: Health Check
Open in browser:
```
https://transfostock-api.onrender.com/api/health
```
You should see:
```json
{"status":"ok","timestamp":"2026-02-12T..."}
```

### Test 2: Get Items (Empty at first)
```
https://transfostock-api.onrender.com/api/items
```
Should show: `[]`

### Test 3: Create Item (Using curl or Postman)
```bash
curl -X POST https://transfostock-api.onrender.com/api/items \
  -H "Content-Type: application/json" \
  -d '{"id":"bolt1","name":"Bolt M10","unit":"Nos"}'
```

If successful, check logs in Render dashboard.

---

## 🔌 Step 5: Connect Frontend to Backend (3 min)

### Update Frontend Configuration

In your **TransfoStock-main** folder, create `.env.local`:

```env
VITE_USE_BACKEND=true
VITE_API_URL=https://transfostock-api.onrender.com
```

### Restart Frontend Dev Server

1. Go to frontend terminal
2. Press **Ctrl+C** to stop
3. Run:
   ```bash
   npm run dev
   ```
4. Browser reloads automatically

### Test Frontend + Backend Integration

1. Open app (http://localhost:5173/TransfoStock/)
2. Log in (Admin: 6600)
3. Go to **Inward**
4. Add an item:
   - Item: "Test Bolt"
   - Qty: 100
   - Unit: "Nos"
5. Click **Save**
6. Check Render logs:
   - Should show API call logged

---

## 🔍 Monitor Your Backend

### View Logs in Real-time

1. Render Dashboard → Select **transfostock-api** service
2. Click **Logs** tab
3. Watch for API calls as you use the app

### Common Log Messages

✅ Good signs:
```
Connection pool ready
POST /api/movements 200
Database tables ready
```

❌ Problem signs:
```
ECONNREFUSED (can't reach database)
FATAL (database connection failed)
TypeError (code error)
```

---

## 🆘 Troubleshooting

### "Service won't start"
```
❌ Problem: Database URL not set
✅ Solution: 
   1. Go to Service Settings
   2. Check Environment → DATABASE_URL is set
   3. Click Restart service
```

### "Cannot connect to database"
```
❌ Problem: Wrong DATABASE_URL format
✅ Solution:
   1. Copy PostgreSQL URL again (no extra spaces)
   2. Update in Environment variables
   3. Restart service
```

### "Frontend can't reach backend"
```
❌ Problem: Wrong API URL in .env.local
✅ Solution:
   1. Check .env.local has: VITE_API_URL=https://transfostock-api.onrender.com
   2. Check VITE_USE_BACKEND=true
   3. Restart frontend (npm run dev)
   4. Hard refresh browser (Ctrl+Shift+R)
```

### "CORS error in browser console"
```
✅ The backend already allows CORS - just wait a moment
✅ Check browser console for exact error
✅ Verify DATABASE_URL is set in Render
```

---

## 📊 API Endpoints Reference

Your backend now provides these endpoints:

```
GET    /api/items                    # List all items
POST   /api/items                    # Create/update item
GET    /api/movements                # List transactions
POST   /api/movements                # Record transaction
DELETE /api/movements/:id            # Delete transaction
GET    /api/stock-summary           # Current stock levels
GET    /api/dashboard-stats         # Dashboard metrics
POST   /api/challans                # Create delivery challan
GET    /api/health                  # Health check
```

---

## 🎯 Your URLs After Deployment

| Service | URL |
|---------|-----|
| Frontend (Dev) | `http://localhost:5173/TransfoStock/` |
| Frontend (Production) | Deploy to Render too (next) |
| Backend API | `https://transfostock-api.onrender.com` |
| PostgreSQL | Internal (Render manages) |
| GitHub Repo | `https://github.com/Harshad159/TransfoStock` |

---

## ⚙️ Free Tier Limitations

- ✅ **Storage**: 1 GB (plenty!)
- ✅ **CPU**: 0.5 vCPU (enough for your team)
- ✅ **RAM**: 512 MB (good for inventory app)
- ⚠️ **Auto-pause**: Service pauses after 15 min inactivity
- ⚠️ **Database pause**: After 7 days of inactivity

**To remove auto-pause**: Upgrade to Paid plan (~$12/month)

---

## 🚀 Next: Deploy Frontend to Render (Optional)

You can also deploy your React app to Render for a fully hosted solution:

1. Create new Web Service
2. Select TransfoStock repository
3. Build: `npm run build`
4. Start: `npm run preview`
5. Gets a live URL automatically

Then share that URL with your team - no local hosting needed!

---

## 📝 Quick Reference: What Just Happened

```
Your Computer:
├─ TransfoStock-main/         (Frontend source)
├─ TransfoStock-backend/      (Backend source)
└─ .git/                       (Git history)
    └─ Pushed to GitHub ✅

GitHub (github.com):
└─ Harshad159/TransfoStock    (Your repository)
    └─ Connected to Render via webhook

Render.com (Cloud):
├─ transfostock-api           (Node.js + Express backend)
│   └─ Running 24/7 ✅
├─ transfostock-db            (PostgreSQL database)
│   └─ Data persisted ✅
└─ Real-time logs & monitoring ✅

Frontend (Your Computer):
└─ Talks to Render API
    └─ Stock synced to cloud ✅
```

---

## ✅ Success Checklist

- [ ] Render account created
- [ ] PostgreSQL database deployed
- [ ] Backend service deployed
- [ ] API responds to health check
- [ ] Frontend configured with correct API URL
- [ ] Can add items in app
- [ ] Stock visible from another device
- [ ] Render logs showing API calls

---

## 🎉 What You Can Now Do

✅ **Access stock from anywhere** using any browser
✅ **Share with team** - give them your frontend URL
✅ **Real-time sync** - all devices see same data
✅ **Scale up** - from free to paid anytime
✅ **Monitor** - watch API calls in Render logs
✅ **Backup** - data safely in cloud PostgreSQL

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **GitHub Issues**: Create issue in your repo
- **Status Page**: https://renderstatus.com

---

## 🎯 You've Deployed!

Your backend is now **LIVE** ☁️

**API URL**: https://transfostock-api.onrender.com
**Database**: Connected & running ✅
**Team**: Can access from anywhere 🌍

---

**Next Steps:**
1. Share app URL with team
2. Monitor Render logs for issues
3. Add more items to test
4. Upgrade to paid plan if needed

Good luck! 🚀
