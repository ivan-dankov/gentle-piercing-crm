# March 2026 Booking Import — Review Table

## Parsing rules

- Number alone → **service** (looked up by `base_price`)
- `Number (SKU)` → **product** with that SKU, sold at that price
- `20` / "Спрей" → **spray** product @ 20
- Items without SKU → added to booking `notes`, included in `total_paid`
- All bookings dated **2026-03-27** except #39–40 → **2026-04-01**

---

## Bookings


| #   | Services     | Products                                                                                | Total | ⚠️ Review                                                                            |
| --- | ------------ | --------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| 1   | 150          | SKU 191 @ 180, Spray @ 20                                                               | 350   |                                                                                      |
| 2   | 280          | SKU 896-3 @ 180 (Bfly голубые два, Pair), SKU 33 (Single, qty 1), SKU 37 (Single, qty 1) | 620   | ✅ price(33) + price(37) = 160 (catalog prices, no override needed)                  |
| 3   | 90           | SKU 112 @ 90 **(S?)**                                                                   | 180   |                                                                                      |
| 4   | 150          | SKU 187с @ 150                                                                          | 300   |                                                                                      |
| 5   | 450          | SKU 32 @ 160 **(P?)**, Spray @ 20                                                       | 630   | "Серьги 32" — no explicit price, assumed 160                                         |
| 6   | 150          | SKU 112 @ 180 **(P?)**                                                                  | 330   |                                                                                      |
| 7   | 150          | SKU 54 @ 160 **(P?)**                                                                   | 310   |                                                                                      |
| 8   | 150          | SKU 57с @ 160                                                                           | 310   |                                                                                      |
| 9   | 90 + 260     | SKU 10 @ 85 **(S?)**, SKU 54 @ 160 **(P?)**, Spray @ 20                                 | 615   | выезд                                                                                |
| 10  | 150          | —                                                                                       | 150   | нос                                                                                  |
| 11  | 150          | SKU 32 @ 160 **(P?)**                                                                   | 310   |                                                                                      |
| 12  | 150          | SKU 1230с @ 170, Spray @ 20                                                             | 340   |                                                                                      |
| 13  | 90 × 2       | SKU 54 @ 85 **(S?)**, SKU 32 @ 85 **(S?)**, Spray × 2 @ 15, name "Бижутерия" @ 80 (override) | 460   | ✅ "Бижутерия" is a real product, looked up by name, price overridden to 80          |
| 14  | 150          | SKU 32 @ 160 **(P?)**                                                                   | 310   |                                                                                      |
| 15  | 150          | SKU 896-3 @ 180                                                                         | 330   |                                                                                      |
| 16  | 150          | SKU 25с1 @ 160                                                                          | 310   |                                                                                      |
| 17  | 100 + 150    | SKU unicorn @ 170, Spray @ 20                                                           | 440   | прокол носа                                                                          |
| 18  | 150          | SKU 32 @ 160 **(P?)**, Spray @ 20                                                       | 330   |                                                                                      |
| 19  | 150 + 150 + 90 | SKU 14 @ 70 **(S?)**, SKU 181 @ 180, SKU k1229 @ 170, Spray × 2 @ 20                 | 850   | ✅ merged #19+#20; 150=kid, 150=2 ears, 90=1 ear; 2 sprays=40                        |
| 20  | ~~merged~~   | ~~merged into #19~~                                                                     | —     | ✅ same booking as #19                                                                |
| 21  | 150          | SKU к1223с @ 170, Spray @ 20, name "Бижутерия" @ 70 (override)                         | 410   | ✅                                                                                   |
| 22  | 150          | SKU 896-3 @ 180, Spray @ 20                                                             | 350   |                                                                                      |
| 23  | 150          | SKU 14 @ 120 **(P?)**                                                                   | 270   |                                                                                      |
| 24  | 150 × 2      | SKU 187с @ 150, SKU 14 @ 120 **(P?)**, name "Бижутерия" @ 60 (override)                | 630   | ✅                                                                                   |
| 25  | 90           | SKU 159 @ 85 **(S?)**, Spray @ 15                                                       | 190   | лосьон 15                                                                            |
| 26  | 150          | SKU 112 @ 90 **(S?)**, SKU 53 @ 80 **(S?)**                                             | 320   |                                                                                      |
| 27  | 150          | SKU 848s-2 @ 180                                                                        | 330   |                                                                                      |
| 28  | 150 + 30     | SKU 54 @ 80 **(S?)**, SKU 53 @ 80 **(S?)**, Spray @ 20, name "Бижутерия" @ 80 (override) | 440   | ✅ даунсайз; "160 (54,53)" split as 80+80                                            |
| 29  | 150          | SKU 187с @ 150, Spray @ 20                                                              | 320   |                                                                                      |
| 30  | 210          | SKU 14 × 2 @ 70 **(S? × 2)**, SKU 10 @ 70, Spray @ 20                                   | 440   | три прокола                                                                          |
| 31  | 60           | name "Бижутерия" @ 70 (override)                                                        | 130   | ✅ даунсайз                                                                          |
| 32  | 250          | SKU 598с @ 180, Spray @ 20                                                              | 450   | выезд                                                                                |
| 33  | 150          | SKU 896-3 @ 180, Spray @ 20, name "Бижутерия Али" @ 70 (override)                      | 420   | ✅                                                                                   |
| 34  | 150          | SKU 112 @ 180 **(P?)**                                                                  | 330   |                                                                                      |
| 35  | 100          | SKU 176с @ 180, Spray @ 20                                                              | 300   | восстановление каналов                                                               |
| 36  | 150          | SKU 25с1 @ 160, Spray @ 20                                                              | 330   |                                                                                      |
| 37  | 150          | SKU 60 @ 80 **(S?)**, SKU 37c @ 80 **(S?)**, Spray @ 20                                 | 330   |                                                                                      |
| 38  | 30           | SKU 174с @ 180, name "Бижутерия" @ 70 (override)                                       | 280   | ✅ замена без прокола                                                                |
| 39  | 260          | SKU 39 @ 160                                                                            | 420   | выезд — 2026-04-01                                                                   |
| 40  | 150 + 90     | SKU 173 @ 160, Spray @ 20                                                               | 420   | ✅ выезд = 150 (piercing) + 90 (travel); 150+90+160+20=420 — 2026-04-01              |


**Total revenue: 14,315 PLN** across 40 bookings

---

## SKU pair / single ambiguity

Same SKU appears at two price points — needs correct product variant on import.


| SKU   | Lower price | Likely | Higher price | Likely | Bookings                            |
| ----- | ----------- | ------ | ------------ | ------ | ----------------------------------- |
| 896-3 | —           | —      | 180          | Pair   | ✅ "Bfly голубые два" — #2, 15, 22, 33 |
| 112   | 90          | Single | 180          | Pair   | #3, 26 (S) / #6, 34 (P)             |
| 54    | 80–85       | Single | 160          | Pair   | #13, 28 (S) / #7, 9 (P)             |
| 32    | 85          | Single | 160          | Pair   | #13 (S) / #5, 11, 14, 18 (P)        |
| 14    | 70          | Single | 120          | Pair   | #20, 30 (S) / #23, 24 (P)           |
| 53    | 80          | Single | —            | —      | #26, 28                             |
| 10    | 70–85       | Single | —            | —      | #9 (85), #30 (70) — price diff only |


> The migration will look up products by `SKU` + closest `sale_price` match so it picks the right variant automatically.

---

## Items with no SKU (included in `total_paid`, not linked to a product)


| Booking | Item             | Amount |
| ------- | ---------------- | ------ |
| 13      | ~~бижутерия~~        | ~~80~~ | ✅ → "Бижутерия" @ 80 (override)      |
| 21      | ~~бижу~~             | ~~70~~ | ✅ → "Бижутерия" @ 70 (override)      |
| 24      | ~~бижутерия италия~~ | ~~60~~ | ✅ → "Бижутерия" @ 60 (override)      |
| 28      | ~~серьги даунсайз~~  | ~~80~~ | ✅ → "Бижутерия" @ 80 (override)      |
| 31      | ~~серьга титан~~     | ~~70~~ | ✅ → "Бижутерия" @ 70 (override)      |
| 33      | ~~серьги Китай~~     | ~~70~~ | ✅ → "Бижутерия Али" @ 70 (override)  |
| 38      | ~~сережки бижу~~     | ~~70~~ | ✅ → "Бижутерия" @ 70 (override)      |


---

## Things to confirm before running

- [x] Booking **#2** — SKU `33` (Single) + SKU `37` (Single), qty 1 each; "Bfly голубые два" = note only
- Booking **#5** — "Серьги 32": confirm price is 160 (pair), otherwise adjust total
- [x] Booking **#40** — выезд = Svc 150 (piercing) + Svc 90 (travel); total 420 ✅
- All **S? / P?** flags above — confirm which product variant (single vs pair) applies
- Booking **#10** — price 70 vs 85 for SKU `10` (bookings #9 and #30): same product at different prices?

