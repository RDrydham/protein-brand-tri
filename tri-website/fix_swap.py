#!/usr/bin/env python3
"""
Fix the corrupted index.html by:
1. Restoring the ld-certs area
2. Swapping fusion and eco sections cleanly

Current corrupted structure:
  [BEFORE_LD_CERTS] good content up to ld-certs div start
  [BROKEN_INJECTION] fusion injected inside ld-cert div (bad - remove this)
  [TICKER1] first ticker
  [TRUST1] first trust
  [ECO_BROKEN] eco with garbled </section> at 126965, real eco ends at 129851
  [EXTRA_STUFF] extra eco stages from 126965+10 to 129851 (leftover)
  [TICKER2] duplicate ticker (129851-130800ish)
  [TRUST2] duplicate trust (130800-132909)
  [FUSION_GOOD] good fusion section (132987-136156)
  [REST] products onwards

Desired structure:
  [BEFORE_LD_CERTS] 
  [LD_CERTS_FIXED] from bak
  [FUSION_GOOD]
  [TICKER]
  [TRUST]
  [ECO_GOOD] clean eco 
  [REST]
"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('index.html.mobile-bak', 'r', encoding='utf-8') as f:
    bak = f.read()

# =========================================================
# STEP 1: Extract key pieces from CURRENT corrupted file
# =========================================================

# A) Content before the ld-certs div (which is where the corruption started)
ld_certs_start = html.index('<div class="ld-certs">')
part_before = html[:ld_certs_start]

# B) The correct ld-certs from BAK file
ld_certs_bak_start = bak.index('<div class="ld-certs">')
# Find its end: after the ld-status div, the closing </div></div> closes the lab-dashboard
# In bak: ld-certs closes, then ld-status, then </div> (closes lab-dash inner), then </div> (closes lab-dash)
ld_certs_bak_end = bak.index('<!-- ', ld_certs_bak_start)  # Find the next comment after ld-certs area
ld_certs_content = bak[ld_certs_bak_start:ld_certs_bak_end]
print(f"ld-certs content extracted ({len(ld_certs_content)} chars):")
print(repr(ld_certs_content[:200]))

# C) The GOOD fusion section (second one in current file at 132987)
fusion_good_start = html.index('<section id="fusion">', 120000)  # Skip the broken first one
fusion_good_end = html.index('</section>', fusion_good_start) + len('</section>')
fusion_section = html[fusion_good_start:fusion_good_end]
print(f"\nFusion section extracted ({len(fusion_section)} chars)")
print(fusion_section[:100])

# D) The TICKER and TRUST sections - get from bak (clean versions)
ticker_start = bak.index('<!-- ═══ TICKER')
trust_start = bak.index('<!-- ═══ TRUST')
trust_end = bak.index('</section>', trust_start) + len('</section>')
ticker_trust_content = bak[ticker_start:trust_end]
print(f"\nTicker+Trust extracted ({len(ticker_trust_content)} chars)")

# E) The clean ECO section from bak
eco_start_bak = bak.index('<!-- ═══════════════════════════════════════════════\n     TRI ECOSYSTEM')
eco_end_bak = bak.index('</section>', eco_start_bak)
# Find the REAL eco end - it has multiple closing divs
# eco section closes with </div>\n  </div>\n</section>
# search for that specific pattern
eco_real_end = bak.rindex('</section>', eco_start_bak, bak.index('<!-- ═══ TICKER', eco_start_bak)) + len('</section>')
eco_section = bak[eco_start_bak:eco_real_end]
print(f"\nEco section extracted from bak ({len(eco_section)} chars)")
print(eco_section[:100])

# F) Everything after the good fusion section (products onwards)
rest_start = fusion_good_end
rest_content = html[rest_start:]
print(f"\nRest content ({len(rest_content)} chars)")
print(rest_content[:100])

# =========================================================
# STEP 2: Also get the purchase-overlay and hero sections from bak
# (they were between ld-certs-end and eco in original bak)
# =========================================================
# In bak: after ld-certs area comes: purchase-overlay, hero, hero-m, eco, ticker, trust, fusion, products
# We need: after ld-certs: purchase-overlay, hero, hero-m, (NEW ORDER: fusion, ticker, trust, eco), products

# Get everything from after ld-certs to just before the eco section in bak
after_ld_in_bak = bak[ld_certs_bak_end:]

# Find eco in bak
eco_in_after = after_ld_in_bak.index('<!-- ═══════════════════════════════════════════════\n     TRI ECOSYSTEM')
part_between_ld_and_eco = after_ld_in_bak[:eco_in_after]
print(f"\nPart between ld-certs and eco in bak ({len(part_between_ld_and_eco)} chars)")
print(part_between_ld_and_eco[:200])

# =========================================================
# STEP 3: Reconstruct the file
# =========================================================
new_html = (
    part_before +
    ld_certs_content +
    part_between_ld_and_eco +
    "<!-- ═══ FUSION PACK — CONCEPT 4: TRI FUSION ANIMATION ═══ -->\n" +
    fusion_section + "\n\n" +
    ticker_trust_content + "\n\n" +
    eco_section + "\n\n" +
    rest_content
)

print(f"\nNew HTML length: {len(new_html)}")
print("Writing output...")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Done! Verifying...")

# Quick verify
with open('index.html', 'r', encoding='utf-8') as f:
    result = f.read()

fusion_count = result.count('id="fusion"')
eco_count = result.count('id="tri-ecosystem"')
fusion_pos = result.index('id="fusion"')
eco_pos = result.index('id="tri-ecosystem"')

print(f"fusion count: {fusion_count}, eco count: {eco_count}")
print(f"fusion at: {fusion_pos}, eco at: {eco_pos}")
print(f"fusion comes BEFORE eco: {fusion_pos < eco_pos}")
