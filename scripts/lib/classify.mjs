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

const RELEVANT = /(ransomware|data breach|breach(ed|es)?\b|hack(ed|er|ers|ing)?\b|cyber ?attack|cyber ?crime|phishing|malware|scam|deepfake|ddos|data leak|leaked|vulnerabilit|zero-day|spyware|botnet|fraud|infostealer|extortion|identity theft|stolen data|exploit)/i;

export const isCyberRelevant = (text) => RELEVANT.test(text || '');

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
