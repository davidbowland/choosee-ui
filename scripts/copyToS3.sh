#!/usr/bin/env bash

# Stop immediately on error
set -e

S3_BUCKET="$1"
if [[ -z "$1" ]]; then
  S3_BUCKET=choosee-ui-test
fi

# Optional: CloudFront distribution to invalidate. deploy.sh reads it from the stack outputs.
DISTRIBUTION_ID="$2"

### Deploy code by copying build output to S3

cd out
# Cache "forever" (one year).
#
# sw.js is excluded deliberately, and this is the one exclusion that cannot be dropped. Everything
# else here is content-hashed, so an immutable cache is safe: a new build produces a new URL. The
# service worker's URL never changes, so an immutable copy pins every returning browser to whatever
# worker it already fetched — including a broken one. That is unfixable remotely: the kill-switch
# procedure in scripts/sw-killswitch.js works by deploying a replacement at this same URL, and a
# browser that never revalidates never sees it.
aws s3 sync . "s3://$S3_BUCKET/" --exclude "*.html" --exclude "*.json" --exclude "*.xml" --exclude "sw.js" \
  --metadata-directive REPLACE --cache-control "public, max-age=31536000, immutable" --acl public-read
# Do not cache
aws s3 sync . "s3://$S3_BUCKET/" --include "*.html" --include "*.json" --include "*.xml" --include "sw.js" \
  --metadata-directive REPLACE --cache-control "public, no-cache" --acl public-read
# Cleanup unused files
aws s3 sync . "s3://$S3_BUCKET/" --delete

### Invalidate the edge copies that are not content-addressed
#
# `no-cache` makes the edge revalidate rather than serve blind, but an object already sitting at a
# CloudFront POP with older headers would keep being served until it expired. Invalidating is what
# makes a service-worker fix take effect on the next update check rather than eventually.
if [[ -n "$DISTRIBUTION_ID" ]]; then
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
    --paths "/sw.js" "/offline.html" "/manifest.json" "/index.html" \
    || echo "WARNING: invalidation failed; run it manually before trusting a sw.js change"
else
  echo "WARNING: no distribution ID given — skipping invalidation. A sw.js change may not reach browsers."
fi
