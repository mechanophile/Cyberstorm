// Tiny RSS / Atom reader with no dependencies. Handles the feeds we need
// (RSS 2.0, Atom, Google News RSS). Not a general XML parser.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function stripHtml(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i');
  const m = re.exec(block);
  if (!m) return '';
  const raw = m[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(raw);
  return cdata ? cdata[1].trim() : decodeEntities(raw);
}

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  let best = '';
  for (const attrs of links) {
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (!href) continue;
    if (!rel || rel[1] === 'alternate') return decodeEntities(href[1]);
    if (!best && rel[1] !== 'self' && rel[1] !== 'enclosure') best = decodeEntities(href[1]);
  }
  return best;
}

// Returns [{ title, link, date, excerpt, publisher }]
export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return blocks.map((b) => {
    let link = tag(b, 'link');
    if (!link || link.startsWith('<')) link = atomLink(b);
    const excerptHtml = tag(b, 'content:encoded') || tag(b, 'description') || tag(b, 'summary') || tag(b, 'content');
    return {
      title: stripHtml(tag(b, 'title')),
      link: link.trim(),
      date: tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'),
      excerpt: stripHtml(excerptHtml),
      publisher: stripHtml(tag(b, 'source'))
    };
  });
}
