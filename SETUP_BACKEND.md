# TransfoStock Backend Setup Guide

Complete guide to set up your backend infrastructure for TransfoStock on Render.com with PostgreSQL.

---

## 🎯 Overview

Your TransfoStock app currently stores data locally using browser's localStorage. This means:

❌ **Current limitations:**
- Data only visible on this device
- No sync across devices/browsers
- Data lost if browser cache cleared
- Single device only

✅ **With Backend on Render.com:**
- Access stock from anywhere (web/mobile/desktop)
- All devices see same real-time data
- Persistent data in cloud
- Team can access together
- Works offline → syncs online

---

## 🚀 Quick Setup Steps

### **Option A: Deploy to Render.com (Recommended - Free)**

#### Step 1: Create Render Account
1. Go to **render.com**
2. Click **Sign Up**
3. Use GitHub account or create new email
4. Verify email

#### Step 2: Create PostgreSQL Database

1. On Render Dashboard, click **New +** button
2. Select **PostgreSQL**
3. Fill the form:
   ```
   Name: transfostock-db
   Region: (pick closest to you)
   PostgreSQL Version: 15
   Plan: Free
   ```
4. Click **Create Database**
5. Wait 3-5 minutes for setup
6. Copy the **External Database URL** (you'll need this)
   - It looks like: `postgresql://user_xyz:pass_abc@oregon-postgres.render.com:5432/transfostock_xyz`

#### Step 3: Deploy Backend API

**Option A1: Using Git (Easier)**
1. Go to the `TransfoStock-backend` folder
2. Initialize Git & push to GitHub:
   ```bash
   cd TransfoStock-backend
   git init
   git add .
   git commit -m "Initial backend setup"
   git remote add origin https://github.com/YOUR_USERNAME/TransfoStock-backend.git
   git push -u origin main
   ```

3. On Render Dashboard, click **New +** → **Web Service**
4. Click **Connect GitHub**
5. Select the **TransfoStock-backend** repository
6. Fill form:
   ```
   Name: transfostock-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   Region: Same as database
   ```

7. **Add Environment Variable:**
   - Click **Add Environment Variable**
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the PostgreSQL URL from Step 2
   - Click **Save**

8. Click **Create Web Service**
9. Wait 3-5 minutes for deployment
10. Once deployed, copy the URL (looks like: `https://transfostock-api.onrender.com`)

**Option A2: Manual Upload (No Git)**
1. Download TransfoStock-backend as ZIP
2. On Render, upload through web interface
3. Fill same settings as Option A1

#### Step 4: Update Frontend Configuration

In your React app, create or update:

**File: `src/.env.local`**
```env
VITE_USE_BACKEND=true
VITE_API_URL=https://transfostock-api.onrender.com
```

#### Step 5: Restart Frontend

1. Go back to your React app terminal
2. Press **Ctrl+C** to stop dev server
3. Restart:
   ```bash
   npm run dev
   ```

4. Browser will reload automatically
5. Your app now syncs to the cloud! ☁️

---

### **Option B: Host on Hostinger (100GB - Better for Production)**

#### Step 1: Access Hostinger Control Panel
1. Log in to hostinger.com
2. Go to your hosting account
3. Open **cPanel**

#### Step 2: Create PostgreSQL Database in cPanel
1. Search for **PostgreSQL Databases** or **MySQL Databases** (ask support if unsure)
2. Create new database:
   ```
   Database Name: transfostock_inventory
   User: inventoryuser
   Password: (create strong password)
   ```
3. Note the connection details

#### Step 3: Upload Backend to Hostinger

1. Via **File Manager** in cPanel:
   - Go to `public_html` or create `api` subfolder
   - Upload `TransfoStock-backend` files
   - Make sure `node_modules` is NOT uploaded

2. Create `.env` file:
   ```
   DATABASE_URL=postgresql://inventoryuser:yourpassword@localhost:5432/transfostock_inventory
   PORT=3001
   ```

3. Install dependencies via SSH:
   ```bash
   ssh your-hostinger-user@your-server.com
   cd /home/youruser/public_html/api
   npm install
   npm start
   ```

4. Configure Node.js app in Hostinger:
   - Go to Node.js Apps in cPanel
   - Add new app pointing to your TransfoStock-backend folder
   - Set entry point to `server.js`
   - Allocate 512 MB RAM minimum

#### Step 4: Update Frontend (Hostinger)

In `src/.env.local`:
```env
VITE_USE_BACKEND=true
VITE_API_URL=https://your-hostinger-domain.com/api
```

---

## 📝 How to Use Backend API

Once deployed and connected, your app works the same but with these differences:

### ✅ New Features:

**1. Access from Multiple Devices**
- Log in to stock app on phone
- Same data as on computer
- Real-time updates

**2. Share with Team**
- Other staff log in with their role
- All see same inventory
- No duplicate data entry

**3. Remote Stock Check**
- Check stock while at warehouse/yard
- On phone browser, go to app
- See live inventory

**4. Offline Mode** (Coming Soon)
- Works offline, syncs when online
- Data backup in localStorage

---

## 🧪 Test Backend Connection

After setup, verify everything works:

1. In your React app, open **Developer Console** (F12)
2. Go to **Network** tab
3. Try any action (add item, create inward entry)
4. You should see API calls to your Render/Hostinger URL
5. Check **Response** - should show `{"success": true}`

If requests fail, check:
- [ ] Backend deployed and running (check Render/Hostinger logs)
- [ ] DATABASE_URL environment variable set
- [ ] PostgreSQL database created
- [ ] Frontend API URL matches deployment URL
- [ ] No CORS errors (check Browser Console)

---

## 📊 Monitor Your Deployment

### Render.com
1. Dashboard → Select your service
2. View **Logs** tab (real-time activity)
3. Check **Metrics** for database usage

### Hostinger
1. cPanel → Node.js Apps
2. Click app to see logs
3. Monitor CPU/RAM usage

---

## 💾 Database Management

### View Your Data

**Render.com:**
- Use any PostgreSQL client (pgAdmin, DBeaver)
- Connect with Database URL from dashboard

**Hostinger:**
- cPanel → phpMyAdmin (if you used MySQL)
- Or SSH into server and use `psql` CLI

### Backup Your Data

**Render.com:**
- Auto backups (paid plans)
- Download SQL export: Dashboard → Backups

**Hostinger:**
- Download from cPanel → Backups
- Or use `pg_dump` via SSH

---

## 🔒 Security Best Practices

### Before Going Live:

1. **Change Database Password**
   - Don't use default/weak passwords
   - Use 12+ character passwords

2. **Restrict API Access** (future enhancement)
   - Add API authentication
   - Use JWT tokens

3. **SSL Certificates**
   - Use HTTPS only (both provide by default)
   - Never send data unencrypted

4. **Regular Backups**
   - Set up automated backups
   - Test restore process

---

## 📈 Cost Estimation

### Render.com (Free to Start)
- **PostgreSQL**: Free (auto-paused after 7 days inactivity)
- **Web Service**: Free (auto-spins down after 15 min inactivity)
- **Paid Plan**: ~$15/month (if you need always-on)

### Hostinger (You Already Have $)
- **Existing Plan**: Use your 100GB allocation
- **Database**: Usually included
- **Cost**: $0 additional (already paid)

**🎯 Recommendation**: Start with Render.com free, upgrade to Hostinger paid plan or Render paid when you hit limits.

---

## 🆘 Troubleshooting

### "Cannot connect to database"
```
✅ Check DATABASE_URL environment variable is set
✅ Verify PostgreSQL database exists and is running
✅ Test connection string locally first
```

### "Backend API returning 500 error"
```
✅ Check backend logs in Render/Hostinger dashboard
✅ Verify all required environment variables are set
✅ Make sure npm packages installed (check node_modules folder)
```

### "Frontend not calling backend"
```
✅ Check VITE_USE_BACKEND=true in .env.local
✅ Verify VITE_API_URL matches deployed URL
✅ Check browser console (F12) for CORS errors
```

### "Great but it keeps auto-pausing (Render Free Tier)"
```
✅ Upgrade to paid plan (Settings → Change Plan)
✅ Or restart manually when needed (minimal downtime)
✅ Paid plans never pause ($0.25/hour onwards)
```

---

## 🚀 Next Steps

1. **Choose hosting** (Render or Hostinger)
2. **Create database** (PostgreSQL)
3. **Deploy backend** (Node.js app)
4. **Update frontend** env variables
5. **Test API connection**
6. **Invite team** to use cloud version!

---

## 📞 Support Links

- **Render.com Docs**: https://render.com/docs
- **Hostinger Support**: https://www.hostinger.com/support
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Node.js Docs**: https://nodejs.org/en/docs/

---

**Need Help?** 
- Check backend logs for errors
- Test API endpoints manually with curl/Postman
- Verify environment variables are correct
- Make sure database is created and accessible

---

**Last Updated**: February 12, 2026
**Version**: 1.0
