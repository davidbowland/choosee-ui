// This app is unlisted by design — friends-and-family only, not meant to be publicly discoverable.
// No sitemap is published, and robots.txt disallows crawling entirely.
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
    policies: [{ userAgent: '*', disallow: '/' }],
  },
}
