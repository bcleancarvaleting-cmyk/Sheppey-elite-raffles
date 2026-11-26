# Sheppey Elite Raffles – website

Prize competitions with customer accounts, bank-transfer payments that you confirm, free entries and a free postal route. It also has public entry lists, live wheel or Google-number draws, automatic emails and an admin dashboard.

No extra packages are needed. It runs on **Node.js 18+**.

## Quick start (on your computer)
    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="a-long-password-123" node server.js

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin (or whatever you set `ADMIN_PATH` to)

The admin account is created the first time the server starts. Remove `ADMIN_PASSWORD` from the environment afterwards.

## Going live (recommended: Railway)
1. Put this folder in a GitHub repository and create a Railway project from it.
2. Add a **Volume** mounted at `/data`.
3. Set the variables from `.env.example` (`DATA_DIR=/data`, `TRUST_PROXY=1`, `TZ=Europe/London`, and your admin email and password).
4. Add your domain. Railway gives you HTTPS automatically.
5. Sign in to admin. Then:
   - Go to **Security** and turn on two-factor sign-in.
   - Go to **Settings** and fill in your bank details, postal-entry address, Facebook group link, contact email and "Send emails from".

Any host that runs Node with a persistent disk works (Render with a disk, a VPS with Caddy or Nginx, and so on).

## Emails
Customers get emails when they register, when they place an order (with the bank details and their reference), when you confirm the order, and if they win.

To send them for real:
1. Create a free account at resend.com and verify your domain.
2. Put the API key in `RESEND_API_KEY`.
3. Set "Send emails from" in Settings, for example `Sheppey Elite Raffles <hello@yourdomain.co.uk>`.

Until then, emails are still recorded under **Admin → Emails** so you can see what would have been sent.

## How an order works
1. The customer adds tickets to the basket and checks out. They must be logged in.
2. Paid tickets are reserved and show **orange (pending)** on the public entry list. The customer gets a unique reference such as `SE7K3QXP` and your bank details.
3. You match the reference on your bank statement in **Admin → Orders** and press **Confirm order**. Every ticket in that order, across all competitions, turns **green**, and the customer is emailed.
4. Unpaid orders are released after the hold time (48h by default, set in Settings).
5. Free competitions confirm instantly, up to the per-person limit you set.

## Draws
A competition is ready to draw when every ticket is confirmed, or when its end date passes if it has one.

Open **Draws → Draw studio**. Prizes are drawn in the order you listed them, lowest first and top prize last. The method depends on the competition type:
- **Free competitions: wheel spin.** Every entrant's name is on the wheel. The server picks a random confirmed ticket using a cryptographic random number generator, and the wheel lands on it.
- **Paid competitions: Google number.** Type the number Google's random number generator gave you. The site checks it's a confirmed ticket that hasn't already won, then the names roll in a letterbox and stop on the winner.

The draw studio also lists every entrant's tickets and percentage chance, so it's clear to anyone watching a live draw.

Every draw is recorded in the activity log. You can void a result (with a reason) if a mistake was made.

## Ticket numbers
Each competition is set to either **Randomly allocated** (customers get random available numbers) or **Customers pick their numbers**. With "pick", customers choose from a number grid or use Lucky dip. If someone else takes a picked number first, the customer is told which one and asked to pick again.

## Open-ended free draws
A free competition can have **no ticket limit**. It stays open to everyone until its end date (required) and is drawn then. The competition page shows "X entries so far". An optional per-person limit still applies.

## Kent-only competitions
Set **Who can enter** to *Kent residents only* and only customers whose account town is in Kent can enter (postal entries are checked too). The Kent towns list is `KENT` at the bottom of `public/towns.js` – add or remove towns there.

## Charity donations
Each competition can have a charity name and donation amount. The competition page then shows, for example, "£1,000 donated to Demelza House when this competition sells out".

## Charity donations page
The public **Charity** page shows a totaliser of everything donated, then a card for each donation with its photo, charity, amount and a link to the competition. Competitions with a pledged donation that hasn't been paid yet appear under "Coming up". In **Admin → Donations**, press **Record donation** once you've paid. Add a payment screenshot (blank out bank details) or a photo of the handover, plus an optional note.

## Community chat & live draw chat
A 💬 button opens the chat with two rooms: **Community** and **🔴 Live draw**. Players must be logged in to post (max 300 characters, one message every few seconds). In the **Draw studio**, press **🔴 Go live**: the Live draw tab lights up for everyone, and the comments appear beside the wheel. You can reply as host from there. **Admin → Chat** lets you read both rooms, post as Sheppey Elite, delete messages and mute people.

## "Just entered" pop-ups
Visitors see a small pop-up every ~16 seconds showing a recent entry: first name, town, the competition and its picture. Only details already shown on the public entry lists are used.

## Accounts: one per person
- Every account needs a unique **email** and a unique **mobile number**, so the same person can't open a second account. Numbers are compared in any format, so 07… and +44 7… count as the same.
- No email confirmation is needed – but every email address **and** mobile number can only be used once, so nobody can open a second account.
- **Forgot password:** customers use the link on the log-in box to get a reset link (valid 1 hour). From **Admin → Customers → (customer) → Send password reset**, you can email them a link valid for 24 hours, and copy it to send by text.
- Customers must agree to the **Terms & conditions** and **Privacy policy** when they register (the date is recorded). Both pages are templates. Edit them in Settings, and have them checked before launch.

## The app (download + notifications)
The site is also an installable app (a "PWA") – no App Store needed.
- Tapping **Download app** asks **iPhone / iPad** or **Android** (the phone they're on is pre-selected) and shows the steps for that phone. On Android with Chrome there's a one-tap **Install the app now** button. iPhones must add it from Safari (Share → Add to Home Screen).
- When someone logs in inside the app they get a "Keep up to date" pop-up asking to turn on notifications (new free draws, live draws, their wins). It comes back **every time they open the app until they turn notifications on**. If they've blocked notifications on their phone, it shows them how to switch them back on in their phone settings.
- In the app customers get a **back button**, the bottom bar (Comps · Home · Account) and a prompt to **allow notifications**.
- Admin → **App & alerts** shows downloads and who has notifications on, and sends notifications. Use the quick buttons – **🎉 Draw full – going live**, **🔴 We're live now**, **🎁 New free draw** – then choose who gets it (everyone, or only people who entered a competition) and what it opens (your **Facebook group**, a competition, or a page). The **📣 Notify** button next to each competition in Draws jumps straight there with the message filled in.
- New **free draws are app-exclusive by default** (you can untick it).
- **Going live:** press **🎉 Draw full – going live** or **🔴 Going live at…**, set the time and paste your Facebook live (or group) link. The message is written for you ("…LIVE tonight at 8pm in the Sheppey Raffle Group"), a big countdown appears at the top of the homepage, and a second "We're LIVE now" notification goes out automatically at that time (untick if you don't want it).
- Notifications are also sent automatically when you **go live**, when an order is **confirmed**, when someone **wins** or is **picked for Elite Banker**, and when a **withdrawal is paid**.
- Push keys are created automatically on first start (`data/vapid.json`). Keep the `data` folder backed up – if it's lost, customers need to turn notifications on again.
- Notifications only work on the real site over **https** (Railway gives you this).

## App-exclusive competitions
Tick **📱 App exclusive** when creating a competition. It shows on the website with a "Download the app" button instead of the entry form, and can only be entered from inside the app.

## Live mode
The **Live mode** switch at the bottom of the admin menu (and "Go live" in the draw studio) turns on a red LIVE banner across the site, opens the **Live draw chat** for everyone and keeps it on screen for the whole draw (customers can only minimise it). Everyone with notifications on gets a "We're live!" alert. Switch it off when you finish.

## Live games
Choose a **Draw style** when you create a competition. They work for paid or free competitions, and for cash or physical prizes. Everything you see in the draw studio plays at the same moment on the website (on the competition page and the **Live games** page), so customers watch exactly what you see. Tap 🔇 on the game to turn on sound.

**🦆 Duck Race / 🏁 Race Around Sheppey**
- Up to **25 per race**. Set the **Number of races** – one race (and one winner) per prize. E.g. 50 tickets, 2 races = ducks 1–25 race first, then 26–50.
- Ducks swim right round the island in the sea, between buoys and under Kingsferry Bridge. Cars line up at Iwade, cross **Kingsferry Bridge** to start, then race laps of the island.
- In Draws, pick the **laps (1–5)** for each race and press **Start race live**. Everyone gets a 3-2-1 countdown, then the race, live commentary, leaderboard, mini-map, a slow-motion finish, the winner and a podium.
- The winner is picked first by the same secure random draw (from that race's tickets) – the race is the show. The winner's name, email and cash credit only go out when the race finishes, so nobody can find out early.

**💼 Elite Banker**
- Set the number of players and the top box value. There are **22 boxes**, from 0.2% of the top box up to the top box (for £50: 10p, 25p, 50p … £45, £50).
- Press **Reveal player** – a slot-machine reel runs through the entrants and lands on the ticket chosen by the random draw (one go per person).
- Click their box, then the boxes they call: 5 in the first round, then 3 per round. After each round the phone rings and the Banker's offer appears – it rises from 30% to 95% of the average of the boxes left. Press **DEAL** or **NO DEAL**. If they say no deal to the last offer, their own box is opened.
- Then **Next player** for the next reveal and game. Every result appears on the **Live games** page, and cash goes straight to the winner's balance.

## Streaming the live games (Facebook Live, OBS, a TV)
- **Stream screen:** in Draws, open a game and press **📺 Open stream screen** (or use the **📺 Stream screen** link in the admin menu, which automatically follows whichever game is live and shows "Next up" and the latest winners in between).
- It's a clean full-screen 16:9 view – your logo, a red LIVE badge, the game title, the clock and "Enter at yoursite" along the bottom. No admin buttons, menus or chat. It scales to fit any laptop, TV or projector.
- **OBS:** add a *Browser source* with the stream link, size 1920×1080, and tick "Control audio via OBS" to get the countdown beeps, phone ring and fanfares. In a normal browser window, click once on the screen to turn the sound on (browsers need one click).
- **One screen for every draw:** the stream screen follows whatever you open in the draw studio – **wheel spins** (free draws), **Google number reveals** (the digits spin, then the name reel lands on the winner), the races and Elite Banker. When you start a spin or type a number, the stream and your studio animate together, and a big winner card appears at the end. When the studio is closed it goes back to live games / "Next up" and the latest winners.
- **Remote control:** keep the stream screen on your laptop and run the game from the draw studio on your iPad or phone. Both stay in sync, and your button presses never appear on the stream.

## Homepage
In order: the hero carousel → the **next live draw countdown** (when you've set one) → a scrolling ticker of totals (won by players, entries today, donated, live competitions, players) → **Live Competitions** → **Live Game Prizes** → the app download banner → **Free Entry Competitions** → **Sheppey Elite in numbers** (counters that count up) → free postal entry → **Recent winners** (scrolling). Cards show **🔥 Almost gone – 12 left** at 85% sold and **⏰ Ends today** on their last day. Every page has a faint moving red/blue neon background (drifting glows, light beams, a neon grid and rising sparks) – switched off automatically for people who've turned on "reduce motion".

## End-draw reveals (normal competitions)
Pick a default **End draw reveal** when you create a competition, and switch it for any prize in the draw studio. Every one is decided by the secure random draw first – the reveal is the show – and plays on the stream screen at the same moment.
- **🔢 Google number** – type the number, the digits spin and the name reel lands on the winner.
- **🎡 Wheel spin** – every entrant's name on the wheel.
- **🎰 Name reveal** – the slot-machine name reel on its own.
- **🪂 Sheppey Drop** – a Plinko board: one ball drops for each digit of the winning ticket number.
- **🍀 Scratch card** – a giant gold scratch card is scratched off to reveal the winner.
- **☠️ Last Man Standing** – every ticket goes on the board. Press **Knock out** (or **Auto-play**): while more than 12 are left, half are knocked out each round with a red cross; then one at a time, with a spotlight that hunts across the board before landing. The last ticket left wins. Customers can watch it on the competition page too.
- **🏁 Race / 🦆 Duck race** – offered whenever 25 or fewer tickets are left in the draw.

## Higher or Lower (live game)
Choose **🃏 Higher or Lower** as the Draw style, then set the number of players and the top prize. The ladder has 10 rungs scaling up to the top prize (for £100: £2, £4, £7, £10, £15, £22, £32, £45, £65, £100) with **safe levels at rungs 1, 4 and 7**. In the draw studio: **Reveal player** (random reel) → press **HIGHER** or **LOWER** for each call → they climb a rung when right; if wrong they drop to the last safe level; they can **Cash out** any time; reaching the top wins the top prize. Equal cards don't count either way. Cash goes straight to the winner's balance.

## Refer a friend
Every customer has a personal link in **My account → Refer a friend** (with Copy, WhatsApp and Facebook buttons). They can see how many people clicked it, who joined, and who has entered. You see each customer's referrals on their page and the **Top referrers** in Admin → Leaderboard.

## Weekly Elite Player
Switch it on in **Settings → Weekly Elite Player draw** and set the prize (and an optional minimum spend). Every Monday a free "Weekly Elite Player" competition is created; anyone whose paid entry is confirmed that week is entered automatically (one entry each). It closes Sunday night and appears in Draws, ready to draw live with the reveal you chose (Last Man Standing by default). Customers see "✅ You're in this week's draw" on it.

## Leaderboard challenge
Admin → **Leaderboard**: set a name, a free prize, start and end dates and **Everyone or Kent residents only**. Points are earned **automatically on the site** – nothing to claim. Every value can be changed (0 = off) and the board recalculates straight away:
- 💷 10 points per £1 spent · 🎟️ 4 per different competition entered · ⚡ 5 for entering a comp in its first 24 hours
- 🤝 25 per friend who registers with your link · 💪 25 more when that friend has spent £5
- 📅 2 per day logged in · 🔥 20 per 7-day login streak · 🔔 15 for turning on notifications · 🪪 10 for verifying ID · 🏆 per prize won (off by default)
- ⚡ **Double/triple points window** on spend and competitions for set times (e.g. a weekend).
- ⭐ Add or remove bonus points by hand with a reason (e.g. won a live quiz).
Only confirmed entries inside the dates count; expired or cancelled orders never do. Customers who've taken a break are left off the board. The public page shows each player their points breakdown, rank, how many points to the next place, and quick ways to earn more. Press **Award the prize** at the end.

## Provably fair draws
Every winner and every live-game player is picked in a way anyone can check:
1. When the draw starts, the entry list is **locked** and its SHA-256 fingerprint is recorded.
2. The server names a future **drand** round (League of Entropy, quicknet – a public random number published every 3 seconds by independent organisations) and waits for it. Nobody can know it in advance.
3. Winner = HMAC-SHA256(random number, fingerprint + ":" + draw number) mod number of entries.
4. The wheel/race/reveal then plays out that result.
If drand can't be reached, a **sealed seed** is used instead: its SHA-256 is shown publicly from when the competition is created, and the seed is revealed once every prize is drawn.
Each competition has a public **Draw certificate** (`#proof-<id>`, linked from the prize page, Results and Winners) listing every draw, the locked list, the fingerprint, the random number (with a link to check it on drand) and a **Verify this draw** button that re-does the maths on the customer's phone. Undone draws stay on the certificate marked as cancelled, so a re-roll can never be hidden. Banker boxes and Higher or Lower decks are shuffled from the same provable number. The "Google number" reveal is still available but is marked as a manual draw on the certificate. The server needs outbound internet access to `api.drand.sh` (Node 18+).

## Instant wins
In the competition editor add instant prizes (e.g. 5 × £20 cash, 1 × hamper). Winning ticket numbers are picked from unsold tickets and sealed when you save (fingerprint shown on the prize page, full list + salt revealed when it ends). When a winning ticket's payment is confirmed, cash goes straight into the winner's cash balance and they get a notification and email; other prizes you arrange. Instant prizes can't be changed once one has been won. Give non-cash prizes a value so cards and the prize page can show one line above the title on the prize page: **⚡ 23 instant wins | £205 total value** On the prize page, tapping it jumps to the **⚡ Instant Wins** section: each prize is clickable and shows its winning ticket numbers – still to be won, or crossed out with the winner's name. Because the numbers are public, competitions with instant wins always give out tickets at random (pick-your-numbers is switched off). Homepage cards show a simpler green line, e.g. **⚡ 23 Instant Wins**.

## Selling tools
- **Countdowns** – prizes with an end date show a ticking Days | Hours | Mins | Secs countdown on their card and page (red in the last 24 hours). Prizes without an end date are unchanged.
- **Home strips** – *Almost sold out* (live prizes 75%+ sold) and *Ending soon* (prizes with an end date, soonest first). They only appear when something qualifies.
- **Welcome back** – logged-in customers see payments to make, credit to spend, their level progress, how many of their competitions are close to the draw, recent wins and leaderboard rank.
- **Odds** – the competition page works out the chance of winning for the tickets chosen (and those already held), allowing for prizes with several winners.
- **Bundles** – per competition, up to 3 "buy X get Y free" offers. Free tickets are allocated automatically, come off the total and count towards the per-person limit.
- **Promo codes** – Admin → Promo codes: % or £ off, optional cap, minimum spend, total uses, uses per customer, start/end dates, specific competitions, first-time players only. Codes are re-checked at checkout and each one's usage and discount given are shown.
- **Basket upgrades** – free-ticket badges, "add 2 more to get 1 free", level nudges ("this basket takes you to Silver"), leaderboard points earned, and a few almost-sold-out / ending-soon prizes to add with one tap.
- **Competition stats** – the edit page and draw studio for every competition show Revenue | Tickets sold | Who has the most (with the top 10). Staff without money access don't see revenue.

## Help, trust & contact pages
- **FAQ** (`#faq`, searchable), **Contact** (`#contact`) and **Complaints** (`#complaints`) – messages and complaints arrive in Admin → **Messages & complaints** with a reference; customers get an acknowledgement email and your replies are emailed to them. Complaints older than 2 days without a reply are flagged.
- **Create / edit competition** – laid out top to bottom: name → picture | description → prizes → *Tickets & price* → *Who can enter* (incl. app exclusive & homepage feature) → *Offers* (bundles, instant wins) → *Dates & visibility* → *Charity* → *How the winner is drawn*. One **Draw style** list covers both stream reveals (Google number, wheel, name reveal, Sheppey Drop, scratch card, Last Man Standing) and live games (duck race, Race Around Sheppey, Elite Banker, Higher or Lower). The old per-competition quick-add buttons field is gone – the prize page's quick-pick chips are worked out from the quick-add starting amount.
- **Cash or credit prizes** – in *How the winner is drawn*, **Pay the prize automatically into…** can be *nothing* (physical prizes), the winner's **cash balance** (withdrawable) or their **credit balance** (spend-only). The amount comes from each prize line, e.g. *£25 Credit*. It's paid the moment the reveal or race animation finishes, the winner email says where it went, and the prize page shows *Won as credit / cash*. Elite Banker and Higher or Lower always pay automatically (cash or credit). Undoing a draw takes it back from the same balance.
- **Instant-win games** – on the competition editor, *How players reveal them*: **Plinko** (drop one / drop all – ideal for 1p prizes), **Spin the Wheel** (blue & red ring, logo in the middle), **Scratchcards** (21 to a phone screen – scratch with a finger or *Scratch all*), **Slots** (each instant prize's own icon – emoji or uploaded image – is its winning symbol), **Smash the Piñata**, **Penalty Shoot-out** and **Bingo** (a ball blower calls 14 numbers – complete any line to win, with "one to go" near misses). Every game sits in a gold casino cabinet with chasing bulbs, coin-shower celebrations, a counting cash total for cash wins, a *BIG WIN* moment for the top prize and synthesised casino sound. Slots is a full cabinet – marquee, top-prize board, 3×3 reels, payline, pull-down lever, ticket/win meters and a pay table. Results are fixed when the competition is saved; the game only reveals them. With a game, a winning ticket is paid (cash or credit, set per prize) the moment it's played, or automatically after 24 hours if it isn't, with one round-up email for *play all*. Players get a "🎮 N plays ready" notification and play at **#play** (also linked from the homepage, the prize page and the Instant Wins section). Unrevealed wins don't show publicly until played.
- **Instant wins need card payments.** While the site is bank-transfer only (Settings → Card payments off, or DNA not set up), every competition with instant wins is *frozen*: cards and prize pages show "⚡ Instant wins open soon" and checkout refuses them. Once card payments are on, any basket containing an instant-win prize is **card-only**: no bank details, no bank saving, tickets held for 30 minutes, and no strike if the card checkout is abandoned. Flow: checkout → DNA hosted card page → DNA's webhook (`/api/pay/dna/callback`) confirms the order → plays are created straight away → the player lands on the game ("Confirming payment…" waits for the webhook). Until DNA's callback signature check (`dnaVerify` in server.js) is filled in, card payments show as *reported* and you confirm them in Orders. The demo uses a pretend card page.
- **Free tickets as a prize** – in the competition editor, *Pay the prize automatically into… → 🎫 Free tickets into another competition*: pick the competition and how many tickets. Great for duck and car races (e.g. *25 tickets – £1,000 Cash*). When the race or reveal finishes, each winner is entered automatically – a £0 confirmed order in their name, shown as *🎫 Prize tickets* in Orders – and emailed/notified. If the target competition has closed or sold out, the draw is flagged in admin so you can sort it by hand. Voiding a win removes the tickets again.
- **Launch / maintenance page** (admin → 🚧) – close the site behind a branded holding page: *Launch countdown*, *Under maintenance* or *Bringing new things* (e.g. switching from bank transfer to cards), with your own headline and message. Optional countdown that can open the site automatically. Customers can only register or log in, download the app and turn on notifications – everything else (buying, plays, comps) is blocked on the server. Everyone who registered or asked to be told gets an app notification and email the moment it opens. *Preview the holding page* and *View the real site while closed* give you and staff a 12-hour pass.
- **Free postal entry on/off** (Settings → Site & emails) – when off, every mention disappears (prize-page tab, homepage section, FAQs, footer, terms line and the postal section of the full terms) and the menu never shows it. Switch back on any time and everything returns as it was. ⚠️ A free route or a genuine skill question is what keeps paid prize competitions outside gambling law.
- **Jackpot** (admin → 💰 Jackpot, off by default) – a progressive pot. When an order is confirmed (bank transfer, card or postal), a set % of the money actually paid (default 0.75%, not credit spent) goes into the pot. Each round a secret drop point is picked at random, to the penny, between *Won't drop before* and *Must drop by*; when the pot reaches it, one confirmed ticket in a paid competition from that round wins it – so the amount is always random (e.g. £16.76). Free postal entries are entries too, keeping the free route open. Paid automatically as site credit or cash (your choice); postal winners are flagged to pay by hand. Players see a neon *DROPS ANY TIME* box with your block meter on the homepage, a *+£0.07 to the jackpot* line in the basket, a scrolling strip of recent jackpot winners (name, town, amount and time) inside the homepage jackpot box, a full-screen JACKPOT! moment when they win, and a #jackpot page with past drops. Each round's drop point is locked with a SHA-256 fingerprint published up front and revealed after the drop, so anyone can check it. You can top the pot up from admin.
- **Game Centre** (admin) – Standard, Christmas, Halloween and Birthday styles: colours, title, losing message, celebration emojis, slot filler icons, piñata and **decoration** (Casino gold; Christmas – Plinko becomes a Christmas tree with baubles, a star and presents, plus snow; Halloween – moon, bats and cobwebs; Party – confetti and bunting), with a live preview of every game. Pick which season is live; a competition can also be fixed to one style.
- **Homepage Instant Wins section** – every live instant-win prize, the games in use, and a "plays waiting" button for logged-in players.
- **My account** – name, level, then the tabs straight away, with the four balances in one compact row. The app card shows on My tickets a few times (with a × to close) and then stays out of the way.
- **Winners page** – an *⚡ Instant winners* strip (latest 20) under the totals, and the instant-wins counter counts real wins.
- **Admin dashboard** – *Ready to draw* lists sold-out / closed prizes with a **Draw now** button straight into the draw studio. **Orders** show the exact amount to match *to the penny* with the breakdown (promo, bank saving, unique pennies, credit/cash used). **Settings** is split into tabs: Payments, Players, Draws, Site & emails (one Save button saves all of them).
- **Quick add on cards** – every live paid prize card has a big ring stepper (− 5 TICKETS +, with any free bundle tickets shown inside the ring) and a ringed *Add · £x* button matching the Enter now style; app-exclusive prizes show an *App exclusive – get our app to enter* box and an *Enter via app* button outside the app (quick add works as normal inside the app, and the server only accepts app-exclusive entries from the app); once added it turns green (*✓ 10 in basket*) and changes to *Update* if the amount is changed. Each prize starts at roughly **£7.50** of tickets (Settings → Quick add): a 1p prize starts at 750 tickets, 49p at 15, £1.49 at 5, £9.99 at 1 – and a bundle amount (e.g. *buy 10 get 2 free*) is used when it's close. The prize page uses the same starting amount. Respects per-person limits and tickets left.
- **Sticky basket bar** – on the homepage and competitions pages, a bar above the bottom menu shows tickets and total with a Checkout button, plus a nudge when it helps (*+2 on £1,000 Cash = 1 free*, or *£4.30 more this month for Silver*).
- **Unpaid-order strikes** – when an order expires unpaid the customer gets a strike (app notification + email, shown in My tickets as e.g. *2 of 5 strikes*). At **5 strikes** new orders are paused for **7 days**; strikes drop off after 90 days. All adjustable in Settings → Unpaid-order strikes. Confirming or reopening an expired order removes its strike; on the customer's page you can clear strikes or lift a pause. The checkout page reminds people to pay before the timer runs out.
- **Bank transfer saving** – Settings → *Bank transfer saving* (default **1.25%**, 0 = off). It comes off whatever's left to pay by transfer (after credit/cash), and the basket, checkout page and order email explain it: *we don't pay card fees on bank transfers, so we pass that saving back to you*. It also makes transfer amounts less round (in a test of 60 typical baskets, 1.25% gave 51 odd-looking amounts vs 26 at 2%), so they're easier to match on your statement – *unique pennies* still sorts out any exact clashes. Card payments don't get it. Levels, cashback and leaderboard spend count what was actually paid.
- **Duck & car numbers** – on duck races and Race Around Sheppey the entry list shows each entrant's 🦆 duck / 🏎️ car number (the same as their ticket number) and, with more than one race, which race they're in.
- **Prize page layout** – instant wins section under the prize; the last 5 entries near the bottom with *View the full entry list*, which opens the whole list in a pop-up; one tidy *Provably fair* line at the very bottom (it becomes *✅ Draw certificate* once drawn).
- **Results** (`#results`) – every finished draw with winners, method, certificate and video link.
- **Player protection** (`#protection`) – 18+ and ID checks, free entry route, provable draws, spending limits/breaks, no credit cards, prize awarding, clear rules, complaints, plus links to GamCare/BeGambleAware. Tick “We’ve signed the DCMS Voluntary Code” in Settings only once you have.
- **Link previews** – `/c/<competition id>` shows that prize's picture, title and price when the link is posted on Facebook/WhatsApp, and opens the prize page. (There are no share buttons on the site.) Each page also sets its own browser title.
- **Winner stories** – add the winner's quote and a link to the live draw video on the competition's edit page.

## Keeping players coming back
- **Favourites** – 🤍 Save on the prize picture. My account → Favourites shows each saved prize with the tickets they hold, their odds, how close it is to selling out, and a full-width upsell showing their exact chance now and with one more ticket (e.g. 1.625% → 1.75%, +0.125%) with a +1 ticket button. Alerts when it's 90% sold, closing within 24 hours, or a scheduled prize launches.
- **Badges** – 24 badges in two levels of 12. Level 1 *Starter* (first entry, free draw, favourites, notifications, 3-day streak, live game, categories, a friend, ID, early bird, birthday…). Level 2 *Elite* unlocks after 8 Starter badges (10/25/50/100 competitions, wins, instant win, 7-day streak, 30 visits, 5 friends, all 4 live games, full house). None are for how much someone spends.
- **Birthday credit** – off until you switch it on in Settings → Birthdays & reminders (set the amount there). When on, customers can add their birthday in My details and get spend-only credit on the day.
- **Reminders** – unpaid order about to expire (push, or email if no app), basket left for 2 hours (push). Switch off in Settings. Customers on a break get none.

## Admin tools
- **Match bank statement** (Orders) – upload your bank's CSV; order references and amounts are matched, exact matches are pre-ticked, and you confirm them in one go. Lines already used are remembered.
- **Unique amounts** (Settings) – optionally take 1–9p off an order whose total clashes with another unpaid order, so every transfer amount is unique.
- **Scheduled launches** – set Visibility to *Scheduled launch* with a time. Instead of the prize photo it shows a "New competition – coming soon" picture with a countdown, then goes live automatically (optional app notification to everyone).
- **Exports** – *Entries CSV* on each competition's page; *Monthly summary* on the dashboard (orders, tickets, sales, discounts, credit/cash used, cashback, instant wins, withdrawals).

## Winners map
The Winners page ends with a map of Kent with a pin for every town that's had a winner (numbered when there's more than one). Tap a pin to see who won what. Town positions are in `public/kentmap.js`.

## Charity suggestions
The Charity page has a *Suggest a charity* form (name, town, charity, why) and shows the most-suggested charities. Admin → Charity groups suggestions by charity with votes and towns; add one to **Our charities** (shown publicly and offered when you add a charity to a prize), shortlist or decline it.

## Staff accounts
Admin → **Security & log → Staff accounts** (owner only). Add someone's email, pick their access, and give them the one-off temporary password – they must choose their own on first sign-in.
- 👑 **Owner** – everything, including staff accounts (there must always be at least one).
- 🛡️ **Admin** – everything except staff accounts.
- 🧑‍💼 **Employee** – competitions, draws, live mode, stream, chat, customers' contact details, app alerts and leaderboard points. **No money**: no revenue, balances, payouts, bank details, ID documents, cashback, settings, emails or activity log. Optional tick: *can check & confirm payments* (sees order amounts only).
- 👀 **Viewer** – can look around but not change anything, no money.
Rules are enforced on the server, not just hidden in the menu; anything blocked is written to the activity log. Switch an account off, change its access or give it a new password at any time.

## Cash balance & credit balance
Every customer has two balances:
- 💷 **Cash** – cash prizes they win. Withdrawable to their bank (after ID check).
- 💷 Cash can also be **spent on entries** – in the basket customers have a *Cash* switch next to *Credit*. Credit is used first, then cash, and any balance left is paid by bank transfer. If an order expires or is cancelled, both go back.
- 🎟️ **Credit** – cashback, rewards and anything you add as a goodwill gesture. **Spend-only**: it's used automatically at checkout (customers can untick "Use my credit"), and can never be withdrawn. If credit covers the whole basket the entries are confirmed straight away; if it covers part, they only transfer what's left. If an order expires or is cancelled, the credit goes back.
On a customer's admin page you can add or take away cash or credit (with a reason – it's logged). Admin → Leaderboard & levels shows the total credit customers are holding.
Only money you've approved counts towards levels/cashback, leaderboard spend points, friend bonuses and the Weekly Elite Player – entries paid with credit don't.

## Monthly levels & cashback
Admin → **Leaderboard & levels**. Customers get a level from their confirmed paid spend in each calendar month: 🥉 **Bronze** £100+ = 1% back, 🥈 **Silver** £200+ = 2%, 🥇 **Gold** £300+ = 3% (all editable, plus an optional 4th level). Cashback on the whole month's approved spend is added to their **credit balance** a few hours into the new month (after late bank transfers are confirmed), they're notified, and everyone starts again. Free and Elite Player entries don't count. Customers see their level, progress bar, cashback so far and history in **My account → My level**, plus a level badge at the top of their account.

## Refer-a-friend cash reward
Optional and **off by default** (the leaderboard's 25 points when a friend spends £5 is the main reward). Admin → Leaderboard → **Refer-a-friend reward**: set a cash amount to the inviter once their friend has spent £5. Each one waits for you to **Pay** or **Reject**; possible self-referrals (same address, postcode or surname) are flagged. Paid rewards go to the customer's balance (withdrawable). Each friend only pays out once, and only friends who join after it's switched on count.

## Winners page & winner photos
**Winners** in the menu shows three totals that count up – Prizes won, Value won and Instant wins (coming soon) – then every winner. Recent winners also scroll along the bottom of the homepage.
Once a prize is drawn, open it in Competitions → Edit and upload a **Winner photo** (the winner with their prize). It replaces the prize picture in Recent winners and on the Winners page.

## Paying within 12 hours
Unpaid orders are held for **12 hours** (change it in Settings). Customers see a live countdown – "Please pay for your entries now to avoid them being resold" – straight after checkout and in My tickets. When time runs out the tickets go back on sale.

## My account
- **My tickets** – orders still to pay (with countdown and bank details), then tickets grouped by competition: the first 10 show, with **View all** for the rest.
- **My wins** and **My details** – as before.
- **Withdrawals** – cash balance, history, and a withdraw button (minimum £1).
- **My payouts** – the customer's bank details, **encrypted (AES-256)** before they're saved. Only the last 4 digits are ever shown; admin can reveal them when paying out, and each reveal is logged.
- **My identity** – upload a photo of a passport, driving licence or ID card. It's encrypted and stored privately (never public). Withdrawals need a verified ID.
- **Safe play** – daily, weekly and monthly spend limits (lowering takes effect immediately, raising after 24 hours) and **Take a break** for 24 hours up to 5 years. While on a break they can still log in to see their account, but can't enter anything.

Admin → **Payouts & ID** lists withdrawals to pay (with the bank details button) and ID documents to check. After sending the money from your bank, press **Mark paid** – the customer is emailed and notified. **Return** puts the money back in their balance.

**Encryption key:** created automatically on first start as `data/data.key`. **Back it up somewhere safe, separately from your backups** – without it, saved bank details and ID photos can't be read. (Or set your own: `DATA_KEY` = 32 random bytes in base64.)

## Card payments (DNA Payments) – ready for later
**Launch setting: bank transfer only.** Card payments can't be switched on until DNA keys exist, so at launch the site is bank transfer only and instant-win prizes stay frozen ("open soon").

**Adding your keys (when you're ready):** Admin → Settings → Payments → *Card payments (DNA Payments)* (owners only). Paste your **Client ID**, **Terminal ID** and **Client secret**, choose *Test* or *Live*, press **Save keys**, then **Test connection** (it asks DNA for a token with your keys). The secret is encrypted on save and never shown again (only its last 4 characters). Copy the **callback address** shown there and give it to DNA. Then tick **Offer card payments at checkout** – that's the switch. Untick it (or *Remove keys*) to go back to bank transfer only. Every change is in the activity log. (Keys set as `DNA_CLIENT_ID` / `DNA_CLIENT_SECRET` / `DNA_TERMINAL_ID` environment variables on the host take priority, if you'd rather do it that way.)

**Paid first – always:**
- Draws, races, Last Man Standing, Elite Banker and Higher or Lower only ever use *confirmed (paid)* tickets, and they **won't start while any order for that prize is still awaiting payment** – confirm or cancel those orders first.
- Instant-win plays are only created from confirmed orders; nothing is revealed or paid before the payment is confirmed.
- Card results are confirmed only after DNA's signature check (HMAC-SHA256 of `id + amount + currency + invoiceId + errorCode + success` with your client secret, Base64, constant-time) **and** the order checks: right invoice, amount and currency match what's due, order still awaiting payment, DNA transaction ID not used before.
- **Declined / failed / abandoned:** a signed decline from DNA, the customer landing on the failure page, or 30 minutes with no payment → the order is cancelled, **its tickets go straight back on sale**, any credit or cash used is returned, and the customer gets a *Payment unsuccessful* screen, app notification and email (with *Try again*). If a genuine payment arrives later for a released order, it's honoured automatically while the tickets are still free; otherwise the order is flagged in Orders to refund.
- Test with DNA's test cards before switching the account to *Live*. Extra hardening DNA recommend: allow the callback only from DNA's IP addresses (ask their support).

## Security built in
- Admin login: scrypt-hashed passwords, optional two-factor codes (TOTP), lockout after 5 failed attempts and per-connection rate limits.
- Admin sessions: they expire after 2 hours idle, with "sign out everywhere".
- Admin activity: every action goes into an activity log.
- Strict browser security headers: Content-Security-Policy, HSTS, no framing, nosniff.
- Cross-site request protection on every change.
- HttpOnly cookies.
- Uploaded images are checked for type and size.
- The database file is private (`0600`) and backed up daily to `DATA_DIR/backups` (last 30 kept).

## Files
- `server.js`: web server, security, emails, uploads, storage
- `core.js`: all the business rules (orders, tickets, draws, analytics)
- `public/`: the website (`index.html`, `app.js`, `styles.css`) and admin (`admin.html`, `admin.js`, `admin.css`), the wheel (`wheel.js`) and the UK towns list (`towns.js`, which you can edit)

Prize competitions in the UK must offer a free entry route and follow the Gambling Commission's guidance on prize draws. Check your terms with someone qualified.
