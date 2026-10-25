export const CATEGORIES = ['Ransomware', 'Data Breach', 'AI Scams', 'Deepfake', 'Fraud', 'Malware', 'Vulnerability'];
export const STATUSES = ['Ongoing', 'Contained', 'Arrests made', 'Warning issued', 'Investigating', 'Unconfirmed'];
export const STATUS_TONE = {
  Ongoing: 'red',
  Contained: 'green',
  'Arrests made': 'green',
  'Warning issued': 'amber',
  Investigating: 'blue',
  Unconfirmed: 'gray'
};

// A story is cyber-relevant when it has a strong cyber term, or a weaker word
// (fraud, scam, extortion, leak) together with an online/digital cue.
const STRONG = /(ransomware|data breach|security breach|breached\b|hack(ed|er|ers|ing)?\b|cyber ?attack|cyber ?crime|cyber ?security incident|phishing|malware|deepfake|ddos|data leak|vulnerabilit|zero-day|spyware|botnet|infostealer|identity theft|stolen data|exploit(ed|s|ation)?\b|credential theft|account takeover|sim swap|voice[- ]clon)/i;
const WEAK = /(fraud|scam|scammer|extortion|leaked|breach)/i;
const DIGITAL = /(online|digital|cyber|internet|\bUPI\b|\bOTP\b|phone call|text message|\bSMS\b|crypto|bitcoin|\bAI\b|artificial intelligence|app\b|website|social media|e-?mail|whatsapp|telegram|bank account|credit card|debit card|password|login|account|data|server|network|systems?)/i;

export const isCyberRelevant = (text) => {
  const t = text || '';
  if (STRONG.test(t)) return true;
  return WEAK.test(t) && DIGITAL.test(t);
};

export function classify(text) {
  const t = text || '';
  if (/deepfake/i.test(t)) return 'Deepfake';
  if ((/\bAI\b/.test(t) || /voice[- ]clon|chatbot|generative ai/i.test(t)) && /(scam|fraud|phishing|impersonat)/i.test(t)) return 'AI Scams';
  if (/ransomware|extortion/i.test(t)) return 'Ransomware';
  if (/data breach|breach(ed|es)?\b|data leak|leaked|exposed|stolen data/i.test(t)) return 'Data Breach';
  if (/malware|botnet|spyware|trojan|infostealer|backdoor/i.test(t)) return 'Malware';
  if (/vulnerabilit|zero-day|\bCVE-\d/i.test(t)) return 'Vulnerability';
  return 'Fraud';
}

export function guessStatus(text) {
  const t = text || '';
  if (/arrest|charged|extradit|sentenced|indicted/i.test(t)) return 'Arrests made';
  if (/contained|resolved|restored|patched|fixed|recovered/i.test(t)) return 'Contained';
  if (/investigat|probe|probing/i.test(t)) return 'Investigating';
  if (/warn|advisory|advises/i.test(t)) return 'Warning issued';
  if (/ongoing|offline|disrupt|outage/i.test(t)) return 'Ongoing';
  return 'Unconfirmed';
}

export function guessSeverity(text) {
  const t = text || '';
  let s = 2;
  if (/hospital|bank|government|ministry|airport|\bport\b|power grid|energy|school|military|election/i.test(t)) s++;
  if (/million|billion|thousands|massive|largest|nationwide/i.test(t)) s++;
  return Math.min(5, s);
}

// ---- story groups for the home page (Current / Solved / Unresolved) ----
export const SOLVED_STATUSES = new Set(['Arrests made', 'Contained']);
const RANK = { Unconfirmed: 0, 'Warning issued': 1, Investigating: 2, Ongoing: 3, Contained: 4, 'Arrests made': 5 };
export const statusRank = (st) => RANK[st] ?? 0;

export function groupOf(story, now = Date.now()) {
  if (SOLVED_STATUSES.has(story.status)) return 'solved';
  const last = new Date(story.updatedAt || story.publishedAt).getTime();
  return now - last < 48 * 36e5 ? 'current' : 'unresolved';
}

// A plain sentence from a later article that explains how it happened, if one says so.
export function extractHow(excerpt) {
  const cue = /(through|via|using|exploit|phishing|stolen credential|vulnerab|misconfigur|unpatched|compromised|weak password|malicious (link|email|attachment)|social engineering|insider)/i;
  const sentences = String(excerpt || '').split(/(?<=[.!?])\s+/);
  const hit = sentences.find((x) => x.length >= 30 && x.length <= 300 && cue.test(x));
  return hit || null;
}
