# Independent arithmetic for the frozen SEG-003 rows

Source: bf6793b03233958a813e75e754b7e6d34b0abb0d. These are the judge's independently checked calculations from the pinned fixture facts and visible documented method. They are not a second test, new corpus or mutation execution. Actual native results are asserted by the one registered journey recorded in RECEIPT.json.

At 2031-10-05T23:59:59.900Z the fixture records five buyers and fourteen qualifying orders. Each gross order is 10,000 minor units. Iris has five USD orders and one 2,000-minor partial refund, yielding 48,000 net USD minor units. Luis has one USD order. Maya has one JPY and one USD order. Noah has two USD orders. Opal has four USD orders. The two extra Luis orders are excluded: one is fully refunded and one is unpaid. Including either would alter his last purchase and frequency; the unpaid order would also alter his net value. The native response is compared against the five independent rows, so exclusions have observable effects.

For a value x among n observations, p = (number below x + (number equal to x - 1) / 2) / (n - 1). A singleton uses p = 0.5. The score is one plus the number of 0.2, 0.4, 0.6 and 0.8 boundaries reached; recency reverses the band. This uses pairwise counts rather than the production sorted-run implementation. Monetary ranks are calculated among buyers of that currency, with no conversion.

| Buyer | UTC recency and R | Orders and F | Currency net minor and M | Stage |
| --- | --- | --- | --- | --- |
| Iris | 5 days; 5 | 5; 5 | USD 48000; 5 | champion |
| Luis | 29 days; 3 | 1; 1 | USD 10000; 1 | new |
| Maya | 5 days; 5 | 2; 2 | JPY 10000; 3 and USD 10000; 1 | active |
| Noah | 120 days; 2 | 2; 2 | USD 20000; 3 | at-risk |
| Opal | 210 days; 1 | 4; 4 | USD 40000; 4 | lapsed |

The ascending recency population is 5, 5, 29, 120, 210: percentiles 0.125, 0.125, 0.5, 0.75 and 1 yield reversed scores 5, 5, 3, 2 and 1. Ascending order counts 1, 2, 2, 4, 5 yield frequency scores 1, 2, 2, 4 and 5. Ascending USD totals 10000, 10000, 20000, 40000, 48000 yield scores 1, 1, 3, 4 and 5. Maya is the sole JPY buyer, so her JPY score is 3. These reproduce all tied cases without splitting an equal value by contact identity.

Stage precedence is lapsed at 180 days, at-risk at 90 days, new for one order and first purchase less than 30 UTC days ago, champion when R and F are both at least 4, otherwise active. The initial distribution is one in each stage. At 2031-10-06T00:00:00.100Z, only 200 milliseconds later with identical purchases, recencies are 6, 30, 6, 121 and 211. All ranks and currency totals remain unchanged. Luis becomes active at 30 days; the distribution becomes new 0, active 2, at-risk 1, lapsed 1 and champion 1. The native authenticated aggregate, five contact routes, operator table and Luis profile are re-read and asserted after midnight. The test-only server Date seam is restored in finally; browser clock changes do not supply this proof.

The source's Methods and thresholds disclosure includes population, midrank quintiles and tie behavior, separate currency populations, on-read daily recomputation, stage thresholds and no-order handling. The journey opens it and checks that midrank text is visible. Exact individual wording and every threshold lack separate assertions; those are INSPECTED source/readback details and a future-touch assertion-sensitivity note under the DONE rule, not an extra rubric row or product FIX.
