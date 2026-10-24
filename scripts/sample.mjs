// Sample stories shown until the live news feed is connected (all made up).
import { regionOf } from './lib/regions.mjs';
import { STATUS_TONE } from './lib/classify.mjs';

export function makeSample(now = Date.now()) {
  const at = (h) => new Date(now - h * 36e5).toISOString();
  // [hoursAgo, category, country, headline, what, how, status, statusText, severity, sourceCount, advice]
  const rows = [
    [2, 'Ransomware', 'Germany', 'Hospital network hit by ransomware, appointments postponed', 'Hospitals in one regional network lost access to patient records and appointment booking. Planned visits were postponed.', 'Attackers used a stolen staff login, moved through the network and locked key servers with ransomware.', 'Ongoing', 'Systems are being restored from backups. No ransom payment confirmed.', 4, 3, ['Patients: check the hospital\'s official page for updates.', 'Be careful with calls or messages asking for payment or personal details.', 'Never share passwords or one-time codes with anyone who contacts you first.']],
    [3, 'Data Breach', 'India', 'Online retailer exposes customer names and phone numbers', 'Customer details were found on a database that anyone could open.', 'A cloud storage setting was left public, with no password.', 'Contained', 'Database locked. Affected users are being informed.', 3, 2, ['Expect scam calls or texts that mention your recent orders.', 'Change the password you use on the retailer\'s site.']],
    [5, 'AI Scams', 'United States', 'Voice-clone calls target families, pretending to be relatives', 'Callers use cloned voices of relatives to ask for urgent money.', 'Scammers copy a voice from a short social media clip using an AI tool.', 'Warning issued', 'Police have issued a public warning. No arrests yet.', 3, 2, ['Agree a family code word and ask for it on urgent money calls.', 'Hang up and call the relative back on their usual number.']],
    [6, 'Deepfake', 'United Kingdom', 'Fake video call tricks finance staff into a large transfer', 'An employee sent company money after a video call with fake managers.', 'The managers on screen were deepfakes built from public videos.', 'Investigating', 'Police are investigating. The money has not been recovered.', 4, 2, []],
    [8, 'Ransomware', 'Australia', 'Port operator pauses some operations after cyberattack', 'Cargo handling slowed while systems were taken offline.', 'Not yet reported.', 'Unconfirmed', 'Not yet reported. The operator says it is investigating.', 4, 1, []],
    [11, 'Data Breach', 'Brazil', 'Tax portal accounts accessed with reused passwords', 'Criminals logged in to citizen accounts and changed bank details.', 'They tried passwords leaked from older, unrelated websites.', 'Arrests made', 'Suspects arrested. The portal now asks for extra verification.', 3, 2, ['Use a different password for every important account.']],
    [14, 'AI Scams', 'Japan', 'Fake AI trading app drains savings of hundreds of users', 'An app promised AI profits, then blocked withdrawals.', 'It showed made-up profits to push people to deposit more.', 'Investigating', 'Regulators are investigating. App removed from stores.', 3, 1, ['Be wary of any app that promises guaranteed returns.']],
    [18, 'Fraud', 'Nigeria', 'Police dismantle online fraud ring across several countries', 'A phishing and romance scam network was shut down in a joint operation.', 'Members used fake bank pages and stolen identities to move money.', 'Arrests made', 'Several arrests. Stolen funds are being traced.', 3, 2, []],
    [26, 'Ransomware', 'Canada', 'School district systems locked at the start of term', 'School systems went offline for days.', 'A phishing email led to a staff account being taken over.', 'Ongoing', 'Systems being rebuilt. Scam-email warning issued to parents.', 3, 1, ['Parents: ignore emails asking you to pay or log in "to restore access".']],
    [240, 'Deepfake', 'Singapore', 'Fake executive video used to approve payments', 'A company paid out after receiving a video message from a fake senior manager.', 'The video was generated with AI from public footage.', 'Investigating', 'Case under review by authorities.', 3, 1, []],
    [480, 'Data Breach', 'South Africa', 'Insurance firm confirms customer data stolen', 'The firm said attackers copied customer records.', 'Not yet reported.', 'Contained', 'The firm says the intrusion has been closed.', 3, 1, []],
    [900, 'Malware', 'South Korea', 'Fake banking apps found stealing login details', 'Security researchers found apps that copied bank logins.', 'The apps were shared outside official stores through text-message links.', 'Warning issued', 'Banks have told customers to install apps only from official stores.', 3, 1, ['Install apps only from official stores.']]
  ];
  const stories = rows.map(([h, category, country, headline, what, how, status, statusText, severity, n, advice], i) => {
    const sources = Array.from({ length: n }, (_, k) => ({ name: ['Sample News Wire', 'Sample Tech Daily', 'Sample Security Review'][k], url: 'https://example.com/sample-' + (i + 1) + '-' + (k + 1) }));
    const updates = [
      { at: at(h + 1), text: 'First reports of the incident appear.', source: sources[0].name },
      { at: at(h), text: statusText, source: sources[n - 1].name }
    ];
    if (i === 0) {
      updates.splice(1, 0,
        { at: at(h + 0.5), text: 'The hospital network confirms a cyberattack and takes remaining systems offline as a precaution.', source: sources[0].name },
        { at: at(h + 0.25), text: 'Planned appointments are postponed; emergency cases are redirected to nearby hospitals.', source: sources[1].name });
    }
    return {
      id: 'sample-' + (i + 1),
      title: headline,
      headline, category, country, region: regionOf(country), what, how, status,
      tone: STATUS_TONE[status], statusText, severity, advice,
      publishedAt: at(h), updatedAt: at(h),
      sourceName: sources[0].name, sourceUrl: sources[0].url, sources, updates,
      breaking: i === 0, ai: false
    };
  });
  return { updatedAt: new Date(now - 4 * 6e4).toISOString(), sample: true, stories, seen: [] };
}
