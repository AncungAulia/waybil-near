# Demo video brief

Owner: Nasta. Deadline: the finished video by **2026-11-14 12:00 UTC**, so it can go into the X
post and the submission before 23:59 UTC.

Target length **2:30 to 3:00**. English voice over and English subtitles. Everything on screen is
**international**: company names, people, addresses, phone numbers and routes. No Indonesian
data on screen.

The live app is https://app.waybil.xyz (testnet). Record there, not on localhost.

## 1. Cast and data

Create fresh accounts for the video. Never show a seed phrase, private key or recovery email on
screen.

| Role | Sign in | Account | Display data |
|---|---|---|---|
| Investor | NEAR wallet (Meteor, testnet) | `nordvik-capital.testnet` | Nordvik Capital |
| Shipper | NEAR wallet (Meteor, testnet) | `harborline-freight.testnet` | Harborline Freight, Rotterdam, Netherlands |
| Warehouse | Google | a Google account named **Scheldt Retail** | Scheldt Retail DC, Antwerp, Belgium |
| Driver | Google | a Google account named **Mateo Alvarez** | Mateo Alvarez, truck plate `RT-482-K`, phone +31 6 1234 5678 |
| Team | NEAR wallet | `risk.waybil.testnet`, `ops.waybil.testnet` | Two Chrome profiles, Team Risk and Team Ops |

If an account name is taken, add a short suffix (`harborline-freight-demo.testnet`). Create a
wallet account with Meteor, or with the CLI faucet if Meteor's sponsor is empty:

```
near account create-account sponsor-by-faucet-service harborline-freight.testnet autogenerate-new-keypair save-to-keychain network-config testnet create
```

Then import it into Meteor yourself. Keys never go into an issue, a PR, chat or the video.

**Team access.** Ancung adds one temporary key to `risk.waybil.testnet` and `ops.waybil.testnet`
and sends you its private key directly. Import it in Meteor ("Import with private key") once in
each team profile. Ancung removes the key after the video is done.

**Company application** (shipper): use the Harborline Freight papers in
[`docs/samples/`](../samples/README.md).

| Field | Value |
|---|---|
| Company name | `Harborline Freight` |
| Business registration number | `4401772093158` |
| Country, region, city | Netherlands, South Holland, Rotterdam |
| Address | Waalhaven Oostzijde 84, Port 2215, 3087 BM Rotterdam |
| Contact | Sofie van Dijk, Finance Manager, +31 10 555 0142, finance@harborline-freight.example |
| Trips per month | 60 |
| Spend per month | 22,000 USDC |
| Main routes | Rotterdam to Antwerp, Rotterdam to Duisburg |
| Papers | `harborline-freight-registration.pdf`, `harborline-freight-bank-statement.pdf` (tax ID optional) |

Expected result in admin: **Suggested starting limit 4,628.75 USDC**, three green checks, money out
August 21,400.00, September 23,150.50, October 24,880.75, average 23,143.75 USD.

**Places and the shipment**

| What | Value |
|---|---|
| Pickup point | Harborline Waalhaven Depot, Waalhaven Oostzijde 84, Rotterdam |
| Destination | Scheldt Retail DC, Noorderlaan 147, 2030 Antwerp, Belgium |
| Cargo | 40 pallets of flat-pack furniture |
| Bill | 1,200 USDC, due in 30 days |
| Driver | Mateo Alvarez |

## 2. Recording setup

- One **Chrome profile per role** (Investor, Shipper, Warehouse, Driver, Team Risk, Team Ops).
  The app keeps one session per browser profile.
- Meteor wallet extension in the Investor, Shipper and both Team profiles, set to **testnet**.
- USDC for tests comes from the app's own faucet button in the wallet menu (once an hour per
  account). NEAR for gas comes from the faucet linked in the footer.
- Window 1920×1080, browser zoom 100%, bookmarks bar hidden, other extensions' popups off,
  notifications off. Record with OBS at 1080p 60 fps, one clip per scene, and say the scene
  number at the start of each clip so editing is easy.
- Driver and Warehouse clips: Chrome DevTools device mode, iPhone 14 Pro (393×852). They are
  phone users in real life.
- Before recording, check https://api.waybil.xyz/health returns ok.
- Ask Ancung to confirm the backend has `DEMO_LOCATION_SIMULATION=on`, so the truck moves on the
  map after pickup. The screen then says "Demo · simulated location". Keep that label visible.

## 3. Record in this order

Recording order follows what the app needs, not the video order.

1. **Investor**: sign in, get USDC from the faucet, deposit 5,000 USDC into the pool. Show the
   pool balance and the "See the record on NearBlocks ↗" link.
2. **Shipper**: sign in, apply as Harborline Freight with the papers. Show "We're checking your
   company".
3. **Team**: as risk, open Shippers, show the Harborline card (amount and month bars),
   open View details (the three checks, money out each month, "Open the private check proof ↗"),
   then Decide and approve. As ops, approve in Approvals. Show the limit now active.
4. **Shipper**: see the new limit. Save the pickup point. Invite the warehouse with the Antwerp
   destination, and invite the driver. Copy each link.
5. **Warehouse**: open the invite, sign in with Google, accept.
6. **Driver**: open the invite, sign in with Google, accept, add name, phone and plate.
7. **Shipper**: create the shipment. Show the route preview from Rotterdam to Antwerp.
8. **Driver**: pick up. Show the moving truck on the map and the arrival code.
9. **Warehouse**: enter the arrival code and confirm all 40 pallets. Then show the driver's screen
   with the payout and the NearBlocks link. Open that NearBlocks page.
10. **Shipper**: pay the bill (get USDC from the faucet first). Show the paid bill.
11. **Investor**: show the pool after the repayment.
12. Optional extra take: a second shipment where the warehouse reports 2 damaged pallets with a
    photo, and the shipper settles "For the good units".

## 4. Storyboard and voice over

Write the narration in the same plain words as the app (see AGENTS.md "Writing UI copy").
Generate the voice with ElevenLabs, one file per scene, then edit to it.

| # | Time | Picture | Voice over |
|---|---|---|---|
| 0 | 0:00–0:20 | Motion graphic. A truck on a long road, an invoice with "Net 60" ticking, a fuel gauge dropping. Kinetic type. | "A truck owner delivers the goods today. The invoice gets paid in sixty days. Meanwhile fuel, tolls and wages are due this week." |
| 1 | 0:20–0:32 | Motion graphic. The road turns into the Waybil road mark, five role icons slide in. | "Waybil pays the driver the moment the warehouse confirms the goods arrived. A lending pool on NEAR covers the bill until the shipper pays." |
| 2 | 0:32–1:05 | Shipper applies with papers, then the team's admin card. Zoom on the amount, the three checks and the month table. Highlight "Private check". | "A new shipper sends its papers. Our credit assistant reads them in a private check on NEAR AI. It never sets the limit itself. The server checks the facts and suggests one. Two team members approve it, and the limit is recorded on NEAR." |
| 3 | 1:05–1:35 | Shipment form, route preview, driver picks up, truck moving on the map, arrival code. | "Harborline books a trip from Rotterdam to Antwerp. Mateo picks up the pallets. The shipper and the warehouse can follow the truck." |
| 4 | 1:35–2:00 | Warehouse types the arrival code and confirms. Cut to the driver's payout. Freeze and highlight the amount and "See the record on NearBlocks ↗". Show NearBlocks. | "At the warehouse, Mateo shows his arrival code. The warehouse confirms forty pallets, and Mateo is paid on the spot. Every step has a public record." |
| 5 | 2:00–2:20 | Shipper pays the bill. Investor's pool view after repayment. | "Thirty days later Harborline pays the bill. The pool gets its money back with a fee, and investors earn from real trade." |
| 6 | 2:20–2:35 | Quick montage: team approval screen, pause button, a limit meter. Optional damaged-goods report. | "Limits are enforced by the contract. Big changes need two of three team members, and nobody holds a key to change the code alone." |
| 7 | 2:35–2:50 | Logo animation. Then app.waybil.xyz, github.com/AncungAulia/waybil-near, @waybilxyz, "Built on NEAR". | "Waybil. Paid on arrival." |

Keep the problem scene short and visual. The judges care most about scenes 2 to 4.

## 5. Editing brief (paste this into Claude Code)

> Edit the demo video from the recorded clips in `<clips folder>`. Follow the app flow in this
> repo and the storyboard in `docs/plans/demo-video.md`. The narration script is in that file and
> the voice files (ElevenLabs) are in `<audio folder>`, one per scene.
>
> Keep the edit simple. Lay the voice over on the clips and add plain subtitles like a streaming
> film: white text in Instrument Sans on a black bar behind it, bottom centered, at most two lines.
>
> Cut, speed up, slow down or freeze frames to match the tempo of the voice over and the app flow.
> Remove or speed up anything not needed so the video stays short. Slow down or freeze when
> something must be stressed. When the script highlights a point (a component, a number, a line
> of text), zoom into it and draw a highlight box with a stroke around it in Signal Yellow
> `#FFD60A`. Freeze the frame first if the video moves too fast for the box to stay on the
> point.
>
> Make a simple motion graphic for scenes 0, 1 and 7, dynamic and kinetic, showing the problem
> this project solves. Use the assets in this repo and animate their vectors:
> `design/logo/*.svg` (symbol and lockup, also reversed), `fe/public/illustrations/*.svg`
> (routes, map, credit), and the shader ideas in `design/shaders/`. Colors: ink `#111111`, white,
> canvas `#F2F2F2`, Signal Yellow `#FFD60A`. Font Instrument Sans. End with a simple logo
> animation.
>
> Export 1920×1080, 30 or 60 fps, H.264 MP4, under 3 minutes. Also export a 1:1 or 16:9 cut under
> 2:20 for X if the full video is longer.

## 6. Done when

- [ ] All clips recorded with international data only.
- [ ] Voice over generated and the video edited to it, under 3 minutes.
- [ ] No keys, seed phrases, private emails or personal data on screen.
- [ ] Video uploaded where the team can reach it, link posted in the issue.
- [ ] Ancung removes the temporary team key.
- [ ] Ancung posts it on X from @waybilxyz, tagging @NEARProtocol with #NEARHackathon.
