const base=(process.env.BASE_URL??'').replace(/\/$/,'');
if(!base) throw new Error('AUDIT_6_FAIL BASE_URL ausente');
const checks=[];
const add=(name,condition)=>checks.push({name,condition:Boolean(condition)});
const get=async path=>{const response=await fetch(`${base}${path}`,{redirect:'follow'});return {response,body:Buffer.from(await response.arrayBuffer())};};

const health=await get('/api/health');
let healthJson={};
try{healthJson=JSON.parse(health.body.toString('utf8'));}catch{}
add('Health endpoint confirma release 223/34',health.response.status===200&&healthJson.pages===223&&healthJson.chapters===34);

const home=await get('/');
const html=home.body.toString('utf8');
add('Reader responde com capa, navegação e sem estruturas removidas',home.response.status===200&&/data-testid="approved-cover"/u.test(html)&&/data-page-count="223"/u.test(html)&&!/Revisão cumulativa|Caso de transferência/iu.test(html));

const csp=home.response.headers.get('content-security-policy')??'';
add('Headers de segurança estão ativos',csp.includes("frame-ancestors 'none'")&&(home.response.headers.get('referrer-policy')??'').length>0&&(home.response.headers.get('permissions-policy')??'').length>0&&home.response.headers.get('x-frame-options')==='DENY');

const pdf=await get('/api/manual');
const epub=await get('/api/epub');
add('Downloads PDF e EPUB respondem com contratos editoriais',pdf.response.status===200&&/application\/pdf/iu.test(pdf.response.headers.get('content-type')??'')&&pdf.response.headers.get('x-cats-editorial-edition')==='publication-grade-book-2026'&&pdf.response.headers.get('x-cats-accessibility')==='PDF-UA-1'&&epub.response.status===200&&/application\/epub\+zip/iu.test(epub.response.headers.get('content-type')??'')&&epub.body.length>100000&&epub.body.subarray(0,2).toString('latin1')==='PK');

const binary=pdf.body.toString('latin1');
add('PDF possui estrutura acessível, idioma, outlines, links e fontes incorporadas',pdf.body.length>100000&&binary.startsWith('%PDF-1.7')&&binary.includes('/StructTreeRoot')&&binary.includes('/MarkInfo')&&/\/Lang\s*\(pt-BR\)/u.test(binary)&&binary.includes('/Outlines')&&binary.includes('/Subtype /Link')&&binary.includes('/FontFile2')&&binary.includes('/ToUnicode'));

add('Metadados SEO/canonical estão publicados',/<link[^>]+rel="canonical"/iu.test(html)&&/property="og:title"/iu.test(html)&&/name="twitter:card"/iu.test(html)&&/application\/ld\+json/iu.test(html)&&/Manual do Participante CATS/iu.test(html));

if(checks.length!==6) throw new Error(`AUDIT_6_INTERNAL count=${checks.length}`);
const failed=checks.filter(check=>!check.condition);
if(failed.length) throw new Error(`AUDIT_6_FAIL ${failed.map((check,index)=>`${index+1}:${check.name}`).join(' | ')}`);
console.log('AUDIT_PUBLICATION_6_PASS controls=6/6 pages=223 chapters=34 runtime=ok pdf=PDF-UA web-security=ok seo=ok');
