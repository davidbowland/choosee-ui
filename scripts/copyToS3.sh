#!/usr/bin/env bash

# Stop immediately on error
set -e

S3_BUCKET="$1"
if [[ -z "$1" ]]; then
  S3_BUCKET=choosee-ui-test
fi

# CloudFront distribution to invalidate, resolved by the caller (deploy.sh or the pipeline),
# which is the layer that already knows this repo's stack name and region. Optional: an empty
# value skips the invalidation with a warning rather than failing the deploy.
DISTRIBUTION_ID="$2"


### Deploy code by copying build output to S3

cd out
# Cache "forever" (one year), which is only ever safe for a content-hashed URL:
# everything under _next/ carries a build hash in its filename, so changed bytes
# mean a changed URL and nothing ever has to be evicted.
#
# This is an allowlist rather than a list of excluded extensions, because the
# failure directions are not symmetric. A path wrongly marked immutable cannot be
# corrected for a year — `immutable` tells the browser not to revalidate at all,
# not on a reload, not when the origin has been right for weeks. A path wrongly
# left out of the allowlist merely loses caching it can be given back at any time.
# An extension blocklist fails the dangerous way every time someone adds a file
# type nobody listed; robots.txt was exactly that, and it would have shipped
# pinned for a year the first time it was generated.
aws s3 sync . "s3://$S3_BUCKET/" --exclude "*" --include "_next/*" \
  --metadata-directive REPLACE --cache-control "public, max-age=31536000, immutable" --acl public-read
# Do not cache: every stable URL whose bytes change — page HTML, robots.txt, the
# sitemaps, the brand assets, the service worker.
#
# This is `cp --recursive` and not `sync` because `sync` skips a file whose size
# and timestamp already match, and a skipped object keeps whatever Cache-Control
# it was last written with. A header fix would never reach a file that had not
# otherwise changed.
aws s3 cp . "s3://$S3_BUCKET/" --recursive --exclude "_next/*" \
  --cache-control "public, no-cache" --acl public-read
# Cleanup unused files
aws s3 sync . "s3://$S3_BUCKET/" --delete

### Invalidate the edge copy of the service worker

# Exactly one path is invalidated, and the shortness of that list is the decision, not an oversight.
#
# Nothing else needs it. Every stable URL now ships `no-cache`, and the distribution's managed
# CachingOptimized policy has a MinTTL of 1s, so a POP revalidates with the origin on effectively
# every request — a changed page, robots.txt or brand asset propagates on its own. Invalidating
# those every deploy would also mask a future cache-header regression rather than surface it, and
# would evict the content-hashed assets under _next/ that by construction never go stale.
#
# sw.js is the exception on consequence, not on mechanism. It is equally redundant in theory. But a
# stale service worker is not cosmetic: it keeps serving old HTML and assets out of Cache Storage
# indefinitely, it breaks push, and the only remote fix is deploying a replacement at this same URL
# (scripts/sw-killswitch.js) — which a browser pinned to a stale copy never fetches. One path per
# deploy against a 1000/month free quota is a cheap premium on the one file whose failure mode
# needs a kill switch.
#
# The backlog is a separate, one-time job rather than a per-deploy one: objects cached at a POP
# under the old `max-age=31536000, immutable` headers keep being served until the year is up,
# because that POP never asks. Clear them once per distribution with:
#   aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
# No invalidation reaches a browser that already holds an `immutable` copy — `immutable` means it
# will not revalidate at all. Only a changed URL fixes that, and it ages out on its own.
if [[ -n "$DISTRIBUTION_ID" ]]; then
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/sw.js" \
    || echo "WARNING: invalidation failed; run it manually before trusting a sw.js change"
else
  echo "WARNING: no distribution ID given — skipping invalidation. A sw.js change may not reach browsers."
fi
