# SeniorBrowse — User Simulation Report

**Date:** May 1, 2026  
**Method:** User Simulator — step-by-step conversation embodying a real user  
**Personas:** Caregiver (Mark, 42) · Senior (Helen, 74)  
**Status:** Pre-MVP

---

## Overarching Observation

The biggest threat to this product is not technology — it is **fear**. Helen's fear of clicking something wrong, Mark's fear of breaking the settings, both of their fears of the unknown. SeniorBrowse wins not through features — it wins by **reducing fear at every step**.

---

## Use Case 1 — Caregiver Perspective

### Persona

- **Name:** Mark, 42 years old
- **Role:** son of an elderly mother (Helen, 74), primary buyer and decision-maker
- **Characteristics:** works full-time, little free time, not a technical expert
- **Goal:** enable his mother to browse the internet independently and safely, without needing his constant help
- **Motivation to pay:** peace of mind and safety — not features

---

### Step 1 — Product Discovery

Mark finds SeniorBrowse through a search engine and lands on the landing page.

**✅ What works:**
- Landing page with a short video demo (max 90 seconds)
- Video and documentation immediately accessible

**⚠️ Critical risk:**
- The video **must open with the end result** — the senior browsing the internet independently. The first 10 seconds decide whether Mark stays. A video that opens with installation instructions = Mark leaves in 15 seconds.

---

### Step 2 — Installation

Mark clicks "Add to Chrome". The browser displays a list of required permissions.

**✅ What works:**
- In the video, right after the product introduction, a simple installation walkthrough with a plain-language explanation of why the extension needs each permission (e.g. *"Access to all sites is required so the sidebar works on every page Helen visits"*)

**⚠️ Critical risk:**
- Without explaining the permissions, some caregivers will abandon here — a long list of permissions triggers distrust in non-technical users

---

### Step 3 — First Launch and Caregiver Wizard

After installation, a setup wizard opens automatically — a dimmed screen with a highlighted element and a step-by-step tutorial.

**✅ What works:**
- The wizard guides the caregiver by hand — zero guessing about what to do next
- A list of popular sites ready to add (YouTube, news, weather, Gmail...) + option to type a custom URL removes the technical barrier
- Visual drag-and-drop when arranging shortcuts

**⚠️ Critical risk:**
- No wizard after installation = the caregiver closes the browser and returns "later" (and "later" often means never)
- The wizard must end with a **sense of accomplishment** — a confirmation screen that everything is ready and a clear statement of what to do next

---

### Step 4 — The Handover Ritual

After the caregiver wizard ends — a success message and a prompt to have the senior sit at the computer. The senior wizard launches with a request for the caregiver to be present.

**✅ Key insight:**
- This is not a technical feature — this is a **handover ritual**. The caregiver feels like someone handing over a gift. No competitor does this.
- The senior wizard opens with a reassuring, personalized message: *"Nothing is broken, Helen. This is a special program that Mark set up so you can browse the internet comfortably."*

---

### Step 5 — Admin Panel

Mark returns a few days later to change a shortcut icon. He uses the drag-and-drop interface.

**✅ What works:**
- Changes are saved automatically and immediately visible to the senior on their next browser open — zero action required from the senior's side
- Confirmation before deleting an icon (must have — without this Mark is afraid to use the panel freely)
- Ability to undo an action immediately after performing it (Gmail "Undo" pattern — appears for 5 seconds after any destructive action)

---

### Step 6 — Saved Links Panel

Mark checks what his mother saved during her browsing session.

**✅ Key insight:**
- The panel shows not a raw list of URLs but a **visual gallery**: page thumbnail + title + date saved. E.g. *"Traditional Borscht — YouTube — yesterday at 2:32 PM"*
- This is not an archive — this is the **story of mom's day** that Mark wants to read. This single moment drives trial-to-paid conversion.
- The save feature becomes a natural **communication channel** between senior and caregiver — it replaces email that Helen doesn't know how to use.

**📋 Suggestion — activity log:**
- A silent local activity log (visited pages, form inputs) stored locally — visible only to the caregiver in the admin panel
- Does not alarm the senior, requires no cloud infrastructure
- Becomes the natural upgrade argument for premium: *"Want real-time notifications instead of checking manually? Go premium."*

---

### Step 7 — Trial End and Payment Moment

After 30 days, Mark receives a notification that the trial is ending.

**✅ What works:**
- Trial-ending notification appears **7 days early** — not on the day of expiration
- **Emotional anchor with the senior's name:** *"Helen used SeniorBrowse 28 out of the last 30 days."* — the senior's name transforms a cold subscription message into a reminder of the relationship
- **Everyday spending comparison:** *"That's less than one coffee a month."*

**⚠️ Must have:**
- **Grace period of at least 3 days after trial expiry.** If Helen sits down in the morning and nothing works — product reputation disaster. The first association with the product after the trial is negative and Mark cancels.

**✅ Intentional product decision:**
- **The senior never sees any information about payment or subscription.** Elderly people often give up things when they feel they are a "cost" to their family. Payment is exclusively the caregiver's concern.

---

## Use Case 2 — Senior Perspective

### Persona

- **Name:** Helen, 74 years old
- **Role:** end user, retired, lives alone
- **Characteristics:** never had a smartphone, sees a computer only a few times a year at her son's place, afraid of clicking "something wrong"
- **Goals:** check the weather, watch a YouTube video, find a cooking recipe
- **Greatest fear:** *"I'll click something and break it"* + *"I don't want to be a burden to Mark"*

---

### Step 1 — Home Screen

Helen opens the browser. She sees the SeniorBrowse home screen.

**✅ What works:**
- **Personalized greeting text:** *"Good morning, Helen! What would you like to do?"* with a few options (Check weather / Search for something / My shortcuts)
- A single clear focal point for the eye — not all elements have equal visual weight. When everything is equally large and colorful, decision paralysis sets in.
- The name in the greeting builds trust from the first second — Helen doesn't feel she's facing an unfamiliar machine, she feels at home.

**✅ Key insight:**
- A senior profile with a name entered during first setup by the caregiver personalizes **all** messages throughout the entire product. This is the biggest emotional insight of the entire simulation — it transforms the product from a tool into a relationship.

---

### Step 2 — Navigating External Sites

Helen clicks the weather shortcut. An external website opens.

**✅ What works:**
- The sidebar is always visible regardless of which site is open — it is the senior's **lifeline**. External sites must not cover or overlap it.
- Shortcut icons always have a visible **text label** underneath — never just a logo. The YouTube logo (red rectangle with a triangle) is abstract to a 74-year-old without a label like *"Videos"*.
- The caregiver can name each shortcut freely — e.g. *"Videos"* instead of *"YouTube"*
- The "Home" button is visually distinct from other sidebar buttons — larger or a different color. It is the number one rescue button.

---

### Step 3 — Searching

Helen types *"cheesecake recipe"* into the search box. Google results appear.

**✅ What works:**
- Ability to adjust text size on external pages via a button in the sidebar

**⚠️ Risk:**
- Standard Google results are a wall of small text with many elements — disorienting for a senior who has little experience with this view

---

### Step 4 — Reading Content and Scrolling

Helen opens a recipe and reads. She accidentally scrolls too far down with the mouse wheel and gets lost deep on the page.

**✅ What works:**
- A **"Back to top"** button in the sidebar — trivial technically, critical for a senior who has lost their place while scrolling

---

### Step 5 — Saving a Link

Helen wants to remember the recipe and show it to Mark. She looks for a button in the sidebar.

**✅ What works:**
- All sidebar buttons have a **text label** under the icon — never just the icon alone. A heart icon can mean anything to Helen.
- The message after saving is not just action confirmation — it is a **connection to the caregiver:** *"Saved! Mark will see this recipe in his panel."* One message that changes the whole feel of the product.

**✅ Key insight:**
- The save-link feature becomes the senior's **natural communication channel** with the caregiver. Helen doesn't know how to send an email — but she knows how to click "Save". The product solves a problem that was not explicitly addressed in the spec.

---

### Step 6 — First Mistake and System Response

Helen accidentally clicks the text size button. Text suddenly grows large. Helen is scared and closes the browser without a word.

**✅ What works:**
- Text size buttons show a clear **current state** always visible: *"Text: normal / large / very large"* — Helen understands where she is and can get back
- **Settings are per-session** — the caregiver sets defaults that reload on every browser open. An accidental change is not permanent.
- On the next open, a calm message in safe colors: *"Helen, the text was enlarged last time. Keep it that way or go back to normal?"*

**⚠️ Key observation:**
- A senior **does not ask for help** when something goes wrong — they quietly withdraw and close the computer. The product must anticipate this moment and offer a recovery path on its own, without requiring the user to ask.
- Fear of irreversible action is the fundamental barrier for seniors. Every action must either be reversible or clearly communicated as safe.

---

### Step 7 — Routine and Natural Product Boundaries

After a week Helen has a daily routine: weather in the morning, recipes before lunch, YouTube in the afternoon. Every evening she saves something for Mark.

**✅ Observation:**
- The save feature replaces email — it becomes a daily communication ritual

**📋 Edge case — YouTube algorithm:**
- YouTube's algorithm can lead the senior to clickbait or misinformation content after a few clicks
- Out of MVP scope, but worth addressing — e.g. a suggestion in the caregiver panel to enable YouTube Restricted Mode, or as a premium feature

**📋 Edge case — system pop-ups:**
- Windows system notifications (updates, antivirus) appear suddenly and can cause panic in seniors
- Completely outside the scope of a browser extension — but worth including in caregiver onboarding materials so they can prepare the senior for this situation

---

## Full List of Suggestions from the Simulation

### Must have — without these the product doesn't work

- **Smooth loading screen** between Chrome and SeniorBrowse — zero flash, no white blank before the home screen renders
- **Confirmation before deleting** an icon in the caregiver panel
- **Undo action immediately after** performing it (Gmail "Undo" pattern — appears for 5 seconds)
- **Text labels** under every icon in the sidebar (not icon alone)
- **Text labels** under every shortcut icon on the home screen (configurable by caregiver)
- **Visually distinct "Home" button** in the sidebar — different from other buttons
- **Post-save message** telling the senior the caregiver will see it: *"Saved! Mark will see this recipe in his panel."*
- **Current text size state** always visible in the sidebar
- **Per-session settings with caregiver defaults** — accidental changes are not permanent
- **Grace period of at least 3 days** after trial expiry
- **Emotional anchor with senior's name** on the trial-end screen
- **Price-to-coffee comparison** on the payment screen
- **Trial-end notification 7 days early** — not on the day of expiry
- **Senior profile with name** entered during first setup — personalizes all messages

### Strongly recommended

- **"Back to top" button** in the sidebar
- **Text size control for external pages** via sidebar button
- **Visual saved links panel** (thumbnail + title + date) — not a raw URL list
- **Recovery message on next open** when settings were accidentally changed in the previous session
- **Personalized greeting with senior's name** on the home screen with suggested actions
- **Clear instruction for the caregiver after wizard completion** — what to do now, what to tell the senior
- **Reassuring opening message in the senior wizard** — *"Nothing is broken — this is a special program that [caregiver name] set up for you"*
- **Silent local activity log** visible only to the caregiver in the admin panel

### Roadmap — premium features

- **Real-time caregiver notifications** when the senior visits a new site or fills in a form
- **YouTube restricted mode** — caregiver can limit content categories available to the senior
- **Saved link sharing** as a lightweight social feature (senior → caregiver → family)

### Intentional non-features (and why)

- **Windows system pop-ups** — outside the scope of a browser extension, cannot be controlled
- **Payment information visible to the senior** — intentional psychological decision; elderly people give up things when they feel they are a "cost" to their family

---

## Key Product Decisions Confirmed in Simulation

| Decision | Simulation rationale |
|---|---|
| Senior and caregiver profile with names | Transforms every message from technical to personal. The biggest emotional insight. |
| Caregiver wizard → handover ritual → senior wizard | Three-phase onboarding no competitor does. Creates the feeling of giving a gift. |
| Per-session settings with caregiver defaults | Eliminates fear of experimenting. An accidental change doesn't ruin the experience. |
| Senior never sees payment info | Protects the senior-caregiver relationship. Helen should never feel like a cost. |
| Security on by default | The senior doesn't "turn on" security — it is invisibly built in. |
| Post-save message with caregiver's name | One message that connects both product personas in a single moment. |
| Activity log local only (not cloud) | Doesn't alarm the senior, requires no infrastructure, natural premium upgrade argument. |

---

## The Moment That Drives Paid Retention

Mark opens the panel in the evening and sees: *"Helen saved: Traditional Borscht — YouTube — yesterday at 2:32 PM"*

He is not paying for software. He is paying to know that his mother is safe and happy. That single moment — a visual panel with the story of mom's day — is what converts a trial user into a paying subscriber.
