# Chrome Web Store Submission Guide

## ✅ What's Ready to Upload

**ZIP File:** `seniorbrowse-v1.0.0.zip` (168 KB)
- Location: `E:\EasySurf\seniorbrowse-v1.0.0.zip`
- Contents: Complete built extension (all JavaScript, CSS, HTML, icons, rules, assets)
- Excludes: Source code, node_modules, documentation, screenshots (uploaded separately)

**Screenshots:** In `public/store/` folder
- screenshot-1-hero.png (1280×800)
- screenshot-2-home.png (1280×800)
- screenshot-3-sidepanel.png (1280×800)
- screenshot-4-settings.png (1280×800)
- screenshot-5-activitylog.png (1280×800)

---

## Step-by-Step Upload Instructions

### 1. Go to Chrome Web Store Developer Console
```
https://chrome.google.com/webstore/devconsole/
```
(You'll need a Google account with a $5 developer registration fee, one-time)

### 2. Create New Item or Update Existing

**If NEW submission:**
- Click "Create new item"
- Choose "Chrome Extension"
- Follow the wizard

**If UPDATING existing:**
- Select the extension
- Click "Package" → "Upload new package"

### 3. Upload the ZIP File
- Drag & drop OR click to select: `seniorbrowse-v1.0.0.zip`
- System validates the manifest.json automatically
- Wait for validation (usually ~1 minute)
- **Validation should pass** (if it fails, check manifest.json syntax)

### 4. Fill Store Listing Details

#### **Name** (required)
```
SeniorBrowse
```

#### **Short Description** (80 characters)
```
Browse safely. Full caregiver control. No tech skills needed.
```

#### **Full Description** (use from `docs/STORE_LISTING.md`)
```
The browser extension that makes the internet safe and easy for your loved ones — while giving you full caregiver control behind the scenes.

[Full text available in docs/STORE_LISTING.md]
```

#### **Language** (required)
```
English (en)
```

#### **Category** (required)
```
Productivity (or Family & Parenting if available)
```

#### **Content Rating Questionnaire**
- Click to complete (a few quick questions about content)
- Select: Not harmful, no adult content, etc.
- Submit

### 5. Upload Images

#### **Icons**
- **128×128 icon** (required)
  - File: `public/icons/icon-128.png`
  - Upload as primary/featured icon

#### **Screenshots** (up to 5, 1280×800 or 1400×560)
- Upload all 5 screenshots from `public/store/`:
  1. screenshot-1-hero.png
  2. screenshot-2-home.png
  3. screenshot-3-sidepanel.png
  4. screenshot-4-settings.png
  5. screenshot-5-activitylog.png
- Add optional captions (e.g., "Personalized home screen", "Always-there helper panel")

#### **Marquee Image** (Optional but recommended, 1400×560)
- Can be resized from hero screenshot
- Use screenshot-1-hero.png resized to 1400×560

### 6. Privacy & Permissions

#### **Privacy Policy** (required)
- Option A: Paste your privacy policy
- Option B: Link to online version
- **Use:** Copy text from `docs/PRIVACY_POLICY.md`

#### **Support Email** (required)
```
kamilpinas@gmail.com
```

#### **Permissions Disclosure**
The form will auto-detect these from your manifest:
- `storage` — for saving user preferences
- `tabs` — for monitoring active tabs
- `downloads` — for blocking downloads
- `webNavigation` — for blocking malicious sites
- `sidePanel` — for the helper panel
- `alarms` — for scheduled tasks
- `declarativeNetRequest` — for ad blocking

Each has a pre-filled explanation. Review and keep as-is (they're accurate).

### 7. Review & Publish

#### **Review Checklist**
- ✅ ZIP uploaded and validated
- ✅ Icons uploaded (128×128)
- ✅ Screenshots uploaded (5 × 1280×800)
- ✅ Short description filled
- ✅ Full description filled
- ✅ Privacy policy pasted/linked
- ✅ Support email filled
- ✅ Category selected
- ✅ Content rating submitted

#### **Submit for Review**
- Click "Submit for review"
- You'll see: "Pending review" (typically 1–3 days)
- Email notification when approved or if revisions needed

---

## What Happens Next

### Approval (typical timeline)
- **1–3 days:** Google reviews for compliance
- **Checks:**
  - Manifest validity
  - Permissions justification
  - Privacy policy completeness
  - No malware/deceptive practices
  - Content appropriateness for stated use case

### If Rejected
- Google will email specific reasons (very detailed)
- Common reasons: Missing privacy policy, vague permissions, content mismatch
- Simply fix and resubmit (no new $5 fee)

### After Approval
- ✅ Extension goes live on Chrome Web Store
- ✅ Customers can install with one click
- ✅ Auto-updates handled by Chrome (whenever you push new versions)
- ✅ You can view install counts, reviews, ratings in the console

---

## Version Updates (Later)

To push a new version (bug fixes, features):

1. Update `manifest.json` → increment version (e.g., 1.0.0 → 1.0.1)
2. Run: `npm run build`
3. Create new ZIP: `seniorbrowse-v1.0.1.zip` (from new `dist/` folder)
4. Go to Chrome Store console
5. Click "Package" → "Upload new package"
6. Upload ZIP, same form, submit for review
7. Wait 1–3 days for Google's approval

---

## Checklist Before You Submit

- [ ] Have you tested the extension in Chrome manually?
  - [ ] Home screen loads with no errors
  - [ ] Side panel opens and closes smoothly
  - [ ] Settings modal opens with PIN prompt
  - [ ] Activity log displays correctly
  - [ ] Screenshots match the actual UI
  
- [ ] ZIP file created and contains:
  - [ ] manifest.json
  - [ ] All JS/CSS/HTML files
  - [ ] All icons (16, 32, 48, 128px)
  - [ ] malware-domains.txt
  - [ ] ad-rules.json
  
- [ ] Store copy ready:
  - [ ] Short description (80 chars max)
  - [ ] Full description
  - [ ] Privacy Policy (from docs/)
  - [ ] 5 screenshots (1280×800)
  - [ ] 128×128 icon
  
- [ ] Metadata ready:
  - [ ] Support email: kamilpinas@gmail.com
  - [ ] Category: Productivity
  - [ ] Language: English

---

## Need Help?

### Common Issues

**"Manifest validation failed"**
- Check `dist/manifest.json` syntax (use JSON validator)
- Ensure all file paths in manifest exist in the ZIP

**"Missing privacy policy"**
- Must be pasted in the form, not just linked
- Copy from `docs/PRIVACY_POLICY.md` into the text area

**"Unclear what this does"**
- Make description more specific
- Use the copy from `docs/STORE_LISTING.md`

**"Screenshots don't match extension"**
- Replace with actual screenshots from your running extension
- Use Chrome DevTools (F12) to set viewport to 1280×800

### Support
- Chrome Web Store Help: https://support.google.com/chrome_webstore
- Developer Account: https://chrome.google.com/webstore/devconsole/
- Contact: kamilpinas@gmail.com

---

## Success! 🎉

Once approved, your extension will be live and visible to all Chrome users. Celebrate! 🚀
