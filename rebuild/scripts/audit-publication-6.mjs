const base=(process.env.BASE_URL??'').replace(/\/$/,'');
if(!base) throw new Error('AUDIT_6_FAIL BASE_URL ausente');
const checks=[];
const add=(name,condition)=>checks.push({name,condition:Boolean(condition)});
const get=async path=>{const response=await fetch(`${base}${path}`,{redirect:'follow'});return {response,body:Buffer.from(await response.arrayBuffer())};};

const health=await get('/api/health');
add('Health endpoint responde 200',health.response.status===200);
const home=await get('/');
const html=home.body.toString('utf8');
add('Reader responde e não publica estruturas removidas',home.response.status===200&&!/Revisão cumulativa|Caso de transferência|ApplicationTransferCard/iu.test(html));
add('Reader publica a marca CATS e o download do manual',/Manual do Participante CATS/u.test(html)&&/Baixar PDF/u.test(html));
const pdf=await get('/api/manual');
add('PDF responde com contrato editorial ITE44',pdf.response.status===200&&/application\/pdf/iu.test(pdf.response.headers.get('content-type')??'')&&pdf.response.headers.get('x-cats-editorial-edition')==='publication-grade-ite44-2026');
const binary=pdf.body.toString('latin1');
add('PDF é substancial, válido e multipágina',pdf.body.length>100000&&binary.startsWith('%PDF-1.4')&&((binary.match(/\/Type \/Page\b/g)||[]).length>100));
add('PDF contém justificação e não contém assinatura visual antiga',((binary.match(/ Tw /g)||[]).length>100)&&!/publication-grade-2026/u.test(pdf.response.headers.get('x-cats-editorial-edition')??''));

if(checks.length!==6) throw new Error(`AUDIT_6_INTERNAL count=${checks.length}`);
const failed=checks.filter(check=>!check.condition);
if(failed.length) throw new Error(`AUDIT_6_FAIL ${failed.map((check,index)=>`${index+1}:${check.name}`).join(' | ')}`);
console.log('AUDIT_PUBLICATION_6_PASS controls=6/6 runtime=ok pdf=ite44 reader=clean');
