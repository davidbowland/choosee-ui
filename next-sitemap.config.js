// This app is unlisted by design — friends-and-family only, not meant to be publicly discoverable.
// No sitemap is published, and every page carries <meta name="robots" content="noindex, nofollow">
// from src/pages/_document.tsx.
//
// robots.txt deliberately ALLOWS crawling. Disallowing it would be counterproductive: a crawler has
// to fetch a page to see its noindex, so a blocked URL stays eligible for indexing from inbound
// links — and session links are exactly the URLs that get pasted into places crawlers read. Allowing
// the fetch is what lets noindex actually remove the URL.
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://choosee.dbowland.com',
  // next export copies public/ into out/ during `next build`, before this postbuild step runs,
  // so writing here (instead of the default ./public) is required for robots.txt to actually ship.
  outDir: './out',
  generateIndexSitemap: false,
  generateRobotsTxt: true,
  exclude: ['/*'],
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
  },
}
