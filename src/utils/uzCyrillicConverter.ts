/**
 * Uzbek Latin → Cyrillic converter
 * Preserves technical terms, code identifiers, and acronyms.
 */

const TECH_TERMS = new Set([
  'React','TypeScript','JavaScript','Vite','Tailwind','CSS','HTML',
  'PostgreSQL','PostgREST','GoTrue','PgBouncer','WebSocket',
  'TanStack','Query','Router','Recharts','jsPDF','Zod',
  'Framer','Motion','Vitest','Deno','Runtime',
  'API','JWT','JSON','PDF','OCR','AI','RBAC','RLS','CORS',
  'SDK','HTTP','HTTPS','SPA','HMR','CRUD','FHIR','HL7',
  'PWA','SMS','EKG','UI','SQL','FK','AMR','DB','CDN',
  'SELECT','INSERT','UPDATE','DELETE',
  'SECURITY','DEFINER',
  'TransplantCare','Lovable','Cloud','Google','OpenAI','Gemini','GPT',
  'Telegram','base64','KDIGO','BANFF','S3',
  'admin','doctor','patient','support',
  'Function','Functions','Trigger','Storage',
  'Single','Page','Application','Hot','Module','Replacement',
  'Row','Level','Based','Access','Control',
  'Utility','first','Key','Value','File','System',
  'Server','Client','Normal','Warning','Critical',
  'Feature','Plugin','Config','Setup',
  'Request','Response','Status','Code',
  'Event','Handler','Listener','Callback',
  'Table','Column','Index','Schema','Migration',
  'Procedure','Authorization','header',
]);

const MULTI: [string, string][] = [
  ["O'","Ў"],["o'","ў"],
  ["G'","Ғ"],["g'","ғ"],
  ["SH","Ш"],["Sh","Ш"],["sh","ш"],
  ["CH","Ч"],["Ch","Ч"],["ch","ч"],
  ["YO","Ё"],["Yo","Ё"],["yo","ё"],
  ["YU","Ю"],["Yu","Ю"],["yu","ю"],
  ["YA","Я"],["Ya","Я"],["ya","я"],
];

const SINGLE: Record<string, string> = {
  'A':'А','a':'а','B':'Б','b':'б','D':'Д','d':'д','E':'Е','e':'е',
  'F':'Ф','f':'ф','G':'Г','g':'г','H':'Ҳ','h':'ҳ','I':'И','i':'и',
  'J':'Ж','j':'ж','K':'К','k':'к','L':'Л','l':'л','M':'М','m':'м',
  'N':'Н','n':'н','O':'О','o':'о','P':'П','p':'п','Q':'Қ','q':'қ',
  'R':'Р','r':'р','S':'С','s':'с','T':'Т','t':'т','U':'У','u':'у',
  'V':'В','v':'в','X':'Х','x':'х','Y':'Й','y':'й','Z':'З','z':'з',
};

function shouldPreserve(word: string): boolean {
  if (TECH_TERMS.has(word)) return true;
  if (/[\d_.]/.test(word)) return true;
  // camelCase / PascalCase with internal capitals
  if (/[a-z][A-Z]/.test(word)) return true;
  return false;
}

function convertWord(word: string): string {
  let r = word;
  for (const [lat, cyr] of MULTI) r = r.split(lat).join(cyr);
  // Remaining apostrophes → ъ (hard sign)
  r = r.replace(/'/g, 'ъ');
  return r.split('').map(ch => SINGLE[ch] || ch).join('');
}

export function uzLatToCyr(text: string): string {
  return text.replace(/[A-Za-z][A-Za-z0-9'_.]*/g, (token) => {
    if (shouldPreserve(token)) return token;
    return convertWord(token);
  });
}
