# LibreTranslate Visual Guide

## 📍 Where to Find LibreTranslate Status

### Header Status Indicators

The LibreTranslate status is now **always visible** in the top-right corner of the app:

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Smart Book Translator                                       │
│                                                                 │
│  [🌐 English ▼]  [🔧 System Status]  [🏠 Local]  [🟢 Online]  │
│                                         ↑           ↑           │
│                                    LibreTranslate  Backend      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual States

### When LibreTranslate is Running ✅

```
┌──────────────┐
│  🏠 Local    │  ← Green background
└──────────────┘
```

**What it means:**
- ✅ LibreTranslate container is running
- ✅ Service is responding on port 5001
- ✅ Ready to translate books for FREE!

**Hover to see:**
```
LibreTranslate: Running (45 languages)
```

**Click to:**
- Go to Settings tab
- View detailed status
- Configure LibreTranslate

---

### When LibreTranslate is Stopped ⚠️

```
┌──────────────┐
│  🏠 ⚠️       │  ← Red background
└──────────────┘
```

**What it means:**
- ❌ LibreTranslate is not running
- ❌ Cannot use local translation
- ⚠️ Need to start it manually or via auto-start

**Hover to see:**
```
LibreTranslate: Stopped
```

**Click to:**
- Go to Settings tab
- Start LibreTranslate
- Configure auto-start

---

## 🔄 Real-Time Updates

The status updates **automatically every 10 seconds**, so you always see the current state:

```
Time: 10:00:00  →  🏠 ⚠️  (Stopped)
Time: 10:00:05  →  Starting container...
Time: 10:00:15  →  🏠 Local  (Running!)  ← Auto-detected!
```

No need to refresh the page or click anything!

---

## 🎯 Complete Status Overview

### Full Header Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Smart Book Translator                                       │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │
│  │🌐 English│  │🔧 System     │  │🏠 Local  │  │🟢 Online │  │
│  │    ▼     │  │   Status     │  │          │  │          │  │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────┘  │
│       ↑              ↑                ↑              ↑         │
│   Language      System Info    LibreTranslate   Backend       │
│   Selector      (Click)         (Click)         Status        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Status Combinations

### All Systems Operational ✅✅

```
[🏠 Local]  [🟢 Online]
   Green       Green
```
**Perfect!** Both local and cloud translation available.

### Only Backend Online ⚠️✅

```
[🏠 ⚠️]  [🟢 Online]
   Red       Green
```
**OK:** Can use cloud APIs (DeepL, OpenAI, Google), but not local translation.

### Only LibreTranslate Running ✅⚠️

```
[🏠 Local]  [🔴 Offline]
   Green       Red
```
**Unusual:** LibreTranslate works but backend is down. Restart the app.

### Everything Offline ⚠️⚠️

```
[🏠 ⚠️]  [🔴 Offline]
   Red       Red
```
**Problem:** Backend is not running. Start the backend first.

---

## 🖱️ Interactive Features

### Click LibreTranslate Status

```
Click [🏠 Local]
    ↓
Navigates to Settings Tab
    ↓
Scroll to "Local Translation (LibreTranslate)" section
    ↓
See detailed status, start/stop buttons, configuration
```

### Hover for Details

```
Hover over [🏠 Local]
    ↓
Tooltip appears:
┌─────────────────────────────────────┐
│ LibreTranslate: Running             │
│ (45 languages)                      │
└─────────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop View

```
[Language ▼]  [System Status]  [🏠 Local]  [🟢 Online]
```

### Tablet/Mobile View

```
[Language ▼]  [System]
[🏠 Local]    [🟢 Online]
```

---

## 🎬 Startup Sequence

Watch the status change as the app starts:

```
1. App Loads
   [🏠 ⚠️]  [🔴 Offline]
   
2. Backend Connects (1-2 seconds)
   [🏠 ⚠️]  [🟢 Online]
   
3. Checking LibreTranslate... (2-3 seconds)
   [🏠 ⚠️]  [🟢 Online]
   
4. LibreTranslate Detected! (if auto-start enabled)
   [🏠 Local]  [🟢 Online]
   
✅ Ready to translate!
```

---

## 🔍 Detailed Status in Settings

Click on the LibreTranslate indicator or go to Settings tab:

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Local Translation (LibreTranslate)         [🟢 Running] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LibreTranslate URL:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ http://localhost:5001                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ☑ Auto-start LibreTranslate on app launch                 │
│     Automatically start LibreTranslate when the backend     │
│     starts (requires Docker)                                │
│                                                             │
│  [Show advanced ▼]                    [💾 Save]            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Status Information                                         │
├─────────────────────────────────────────────────────────────┤
│  URL: http://localhost:5001                                 │
│  Languages: 45 language pairs                               │
│  Last Check: 10:30:15 AM                                    │
│                                                             │
│  [🧪 Test Translation]  [🔄 Refresh Status]                │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Quick Tips

### Tip 1: Check Status Anytime
Just look at the top-right corner! No need to navigate anywhere.

### Tip 2: Click to Manage
Click the LibreTranslate indicator to quickly access settings.

### Tip 3: Auto-Updates
Status refreshes every 10 seconds automatically.

### Tip 4: Hover for Details
Hover over the indicator to see language count and status details.

### Tip 5: Color Coding
- **Green** = Working ✅
- **Red** = Not working ⚠️

---

## 🎓 Understanding the Indicators

### 🏠 Home Icon
Represents "Local" translation (runs on your computer)

### 🟢 Green Circle
Represents "Online" status (backend connected)

### ⚠️ Warning Triangle
Indicates something needs attention

### Language Count
Shows how many language pairs are available (typically 45)

---

## 🚀 First-Time Experience

### When You First Open the App

```
Step 1: App opens
┌────────────────────────────────────────┐
│  [🏠 ⚠️]  [🟢 Online]                  │
│     ↑                                  │
│  LibreTranslate is starting...         │
└────────────────────────────────────────┘

Step 2: After 10-30 seconds
┌────────────────────────────────────────┐
│  [🏠 Local]  [🟢 Online]               │
│     ↑                                  │
│  Ready to translate!                   │
└────────────────────────────────────────┘
```

### If Auto-Start is Disabled

```
┌────────────────────────────────────────┐
│  [🏠 ⚠️]  [🟢 Online]                  │
│     ↑                                  │
│  Click here to start LibreTranslate    │
└────────────────────────────────────────┘
```

---

## 📖 Glossary

| Term | Meaning |
|------|---------|
| **🏠 Local** | LibreTranslate is running on your computer |
| **🟢 Online** | Backend server is connected |
| **Running** | Service is active and responding |
| **Stopped** | Service is not running |
| **Language Count** | Number of language pairs available (e.g., 45) |
| **Health Check** | Automatic test to verify service is working |

---

## ✅ Success Checklist

When everything is working, you should see:

- [x] **🏠 Local** indicator is green
- [x] **🟢 Online** indicator is green
- [x] Hover shows "Running (45 languages)"
- [x] Click takes you to Settings
- [x] Test translation works
- [x] Status updates automatically

---

## 🎉 You're All Set!

The LibreTranslate status is now always visible and updates automatically. No more guessing if it's running - just look at the top-right corner!

**Questions?** Check the [LIBRETRANSLATE_TROUBLESHOOTING.md](./LIBRETRANSLATE_TROUBLESHOOTING.md) guide.
