import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(name)=>JSON.parse(fs.readFileSync(path.join(root,'content',name),'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(root,'content',name),JSON.stringify(value,null,2)+'\n');
const semantic=read('semantic-pages.json');
const navigation=read('navigation.json');
const normalize=(value='')=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sentence=(text='')=>String(text).replace(/\s+/g,' ').trim().replace(/[.;:]+$/,'');
const cleanFact=(text='')=>sentence(text).replace(/^(OBJETIVOS DO CAPÍTULO|RESUMO DO CAPÍTULO)\s*[:—-]?\s*/iu,'');
const resourceCatalog=[
  {title:'Guia de acolhimento à crise em saúde mental na RAPS',url:'https://biblioteca.saude.gov.br/TerminalWeb/Acervo/Detalhe/79252',note:'Guia do Ministério da Saúde, em português, para acolhimento, organização da resposta e cuidado centrado na pessoa em situações de crise.',language:'pt-BR'},
  {title:'Prevenção do suicídio: manual para profissionais das equipes de saúde mental',url:'https://bvsms.saude.gov.br/bvs/publicacoes/manual_editoracao.pdf',note:'Manual em português sobre conceitos, linguagem, avaliação e prevenção do comportamento suicida.',language:'pt-BR'},
  {title:'Boletim Epidemiológico: panorama dos suicídios e lesões autoprovocadas no Brasil',url:'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/boletins/epidemiologicos/edicoes/2024/boletim-epidemiologico-volume-55-no-04.pdf/view',note:'Boletim epidemiológico nacional, em português, para leitura crítica de indicadores e tendências.',language:'pt-BR'},
  {title:'Prevenção do suicídio: manual para profissionais da atenção primária',url:'https://bvsms.saude.gov.br/bvs/publicacoes/atencaobasica.pdf',note:'Manual em português para compreender crise, sinais de alerta, comunicação e encaminhamento.',language:'pt-BR'},
  {title:'Viver a Vida: guia de implementação para a prevenção do suicídio nos países',url:'https://www.paho.org/pt/documentos/viver-vida-guia-implementacao-para-prevencao-do-suicidio-nos-paises',note:'Guia oficial em português com estratégias baseadas em evidências para prevenção, proteção e seguimento.',language:'pt-BR'},
  {title:'Regulação Médica das Urgências',url:'https://www.gov.br/saude/pt-br/composicao/saes/samu-192/publicacoes/regulacao_medica_urgencias.pdf/view',note:'Manual brasileiro em português sobre regulação, acionamento, coordenação e resposta pré-hospitalar.',language:'pt-BR'},
  {title:'Atuação do Atendimento Pré-Hospitalar Móvel e da Central de Regulação das Urgências',url:'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/estudos-e-notas-informativas/2024/nota-informativa-n-o-9-2024-cgurg-dahu-saes-ms.pdf/view',note:'Documento técnico em português sobre funções, regulação e composição da resposta pré-hospitalar móvel.',language:'pt-BR'},
  {title:'Serviços de saúde mental para atenção à crise',url:'https://www.paho.org/pt/documentos/servicos-saude-mental-para-atencao-crise-promocao-abordagens-centradas-na-pessoa-e',note:'Guia em português sobre atenção à crise centrada na pessoa, direitos, segurança e redução de coerção.',language:'pt-BR'},
  {title:'Nota Técnica CFP nº 22/2024: atuação em emergências e desastres',url:'https://transparencia.cfp.org.br/legislacao/nota-tecnica-cfp-no-22-2024/',note:'Orientações em português sobre preparação, resposta, reconstrução, trabalho em equipe e cuidado psicossocial.',language:'pt-BR'},
  {title:'VIVA: instrutivo de notificação de violência interpessoal e autoprovocada',url:'https://bvsms.saude.gov.br/bvs/publicacoes/viva_instrutivo_violencia_interpessoal_autoprovocada_2ed.pdf',note:'Instrutivo brasileiro em português para coleta, registro e qualificação de informações sobre violência e lesões autoprovocadas.',language:'pt-BR'},
  {title:'Nova Agenda de Saúde Mental para as Américas: resumo executivo',url:'https://www.paho.org/pt/documentos/resumo-executivo-nova-agenda-saude-mental-para-americas-relatorio-da-comissao-alto-nivel',note:'Documento em português sobre integração de redes, direitos, intersetorialidade e fortalecimento de sistemas de saúde mental.',language:'pt-BR'},
  {title:'Serviços de suporte de pares em saúde mental',url:'https://www.paho.org/pt/documentos/servicos-suporte-pares-em-saude-mental-promocao-abordagens-centradas-na-pessoa-e',note:'Guia em português sobre apoio entre pares, escuta, autonomia, escolha e relações não coercitivas.',language:'pt-BR'},
  {title:'Nada sobre nós sem nós: escuta protetiva em saúde mental de adolescentes e jovens',url:'https://www.unicef.org/brazil/relatorios/nada-sobre-nos-sem-nos',note:'E-book em português sobre escuta acolhedora, vínculo, participação e proteção de adolescentes e jovens.',language:'pt-BR'},
  {title:'Comunicação e enfermagem em saúde mental: reflexões teóricas',url:'https://www.scielo.br/j/rlae/a/qd7htQwqMjyCtshwDcpDpnR/?lang=pt',note:'Artigo científico em português sobre comunicação terapêutica, relação intersubjetiva e flexibilidade profissional.',language:'pt-BR'},
  {title:'Saúde mental de adolescentes e jovens',url:'https://www.unicef.org/brazil/innocenti/brazil/media/16126/file/saude-mental-de-adolescentes-e-jovens.pdf',note:'Publicação em português sobre sofrimento emocional, fatores associados, redes de apoio e proteção de adolescentes e jovens.',language:'pt-BR'},
  {title:'Estratégias e possibilidades da entrevista motivacional na adolescência',url:'https://www.scielo.br/j/tce/a/KcKyD4LsPvPXzwfV6BZfvgM/',note:'Revisão científica com versão em português sobre entrevista motivacional, diálogo, autonomia e mudança.',language:'pt-BR'},
  {title:'Manual mhGAP de Intervenções',url:'https://www.paho.org/pt/node/65031',note:'Manual em português para avaliação e manejo de condições mentais, neurológicas e relacionadas ao uso de álcool e outras drogas.',language:'pt-BR'},
  {title:'Tentativas de suicídio e o acolhimento nos serviços de urgência',url:'https://www.scielo.br/j/cadsc/a/ZgWqyVy6hjVYchTXBWc4z9R/abstract/?lang=pt',note:'Artigo científico em português sobre acolhimento, postura profissional e experiência de pessoas atendidas após tentativa de suicídio.',language:'pt-BR'},
  {title:'Manejo de paciente agitado ou agressivo',url:'https://www.scielo.br/j/rbp/a/5sFSTKMhdRN6Vp7WkcbYBJg/?lang=pt',note:'Artigo científico em português sobre avaliação, diagnóstico diferencial, segurança e manejo de agitação psicomotora.',language:'pt-BR'},
  {title:'Emergências psiquiátricas',url:'https://www.scielo.br/j/rbp/a/TSFBrHtHZS859jXNy5HDXTq/?lang=pt',note:'Texto científico em português sobre raciocínio em emergência, risco de suicídio, agitação, violência e aspectos ético-legais.',language:'pt-BR'},
  {title:'Política Nacional de Atenção às Urgências',url:'https://bvsms.saude.gov.br/bvs/publicacoes/politica_nacional_atencao_urgencias.pdf',note:'Publicação brasileira em português sobre organização da rede de urgência, APH, segurança e integração assistencial.',language:'pt-BR'},
  {title:'Manual Consolidado da NR-35: trabalho em altura',url:'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2020/manual_consolidado_da_nr_35.pdf/view',note:'Manual em português sobre planejamento, prevenção de quedas e segurança em trabalho em altura.',language:'pt-BR'},
  {title:'Guia de Vigilância em Saúde: intoxicação exógena e violência autoprovocada',url:'https://bvsms.saude.gov.br/bvs/publicacoes/guia_vigilancia_saude_5ed_rev_atual.pdf',note:'Guia brasileiro em português para reconhecer intoxicação, gravidade, vigilância e eventos autoprovocados.',language:'pt-BR'},
  {title:'Atlas da Violência 2025',url:'https://www.ipea.gov.br/atlasviolencia/arquivos/artigos/5999-atlasdaviolencia2025.pdf',note:'Publicação científica e institucional em português para contextualizar violência, armas, vulnerabilidades e segurança pública.',language:'pt-BR'},
  {title:'SAMU 192: atendimento pré-hospitalar móvel',url:'https://www.gov.br/saude/pt-br/composicao/saes/samu-192',note:'Material oficial em português sobre resposta pré-hospitalar, estabilização, regulação, transporte e integração com a rede.',language:'pt-BR'},
  {title:'Linha de cuidado para crianças e adolescentes em situação de violências',url:'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-da-crianca/publicacoes/linha-de-cuidado-para-a-atencao-integral-a-saude-de-criancas-adolescentes-e-suas-familias-em-situacao-de-violencias-orientacao-para-gestores-e-profissionais-de-saude/view',note:'Publicação brasileira em português sobre proteção, acolhimento, comunicação e articulação de rede para crianças e adolescentes.',language:'pt-BR'},
  {title:'Guia Prático de Direitos de Acessibilidade',url:'https://www.gov.br/mdh/pt-br/navegue-por-temas/pessoa-com-deficiencia/publicacoes/guia-pratico-de-direitos-de-acessibilidade',note:'Guia em português sobre acessibilidade, direitos, comunicação e inclusão de pessoas com deficiência e mobilidade reduzida.',language:'pt-BR'},
  {title:'Situações agudas nos transtornos por uso de álcool',url:'https://linhasdecuidado.saude.gov.br/portal/transtornos-por-uso-de-alcool-no-adulto/situacoes-agudas/',note:'Linha de cuidado brasileira em português sobre intoxicação, situações agudas, risco, avaliação e encaminhamento.',language:'pt-BR'},
  {title:'Guia prático para atendimento a mulheres em situação de violência doméstica',url:'https://bvsms.saude.gov.br/bvs/publicacoes/guia_atendimento_mulheres_situacao_viol%C3%AAncia_aps.pdf',note:'Guia brasileiro em português sobre acolhimento, segurança, rede de proteção e cuidado a mulheres em situação de violência.',language:'pt-BR'},
  {title:'Nota Técnica nº 62/2022: notificações de violências interpessoais e autoprovocadas',url:'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/notas-tecnicas/2022/nota-tecnica-no-62-2022-cgdant-daent-svs-ms/view',note:'Documento em português sobre escopo, preenchimento e fluxo de registro e notificação no SINAN.',language:'pt-BR'},
  {title:'Prevenção do suicídio: manual para profissionais da mídia',url:'https://www.paho.org/pt/noticias/30-9-2025-manual-sobre-prevencao-do-suicidio-para-profissionais-da-midia-ganha-versao-em',note:'Versão em português com orientações para comunicação responsável, redução de dano e prevenção de efeito imitativo.',language:'pt-BR'},
  {title:'Primeiros socorros psicológicos: guia para trabalhadores de campo',url:'https://www.paho.org/pt/node/44399',note:'Guia em português sobre ajuda humana, prática e não invasiva, proteção, escuta, conexão e limites do apoio em crise.',language:'pt-BR'},
  {title:'Guia metodológico em saúde mental: Criando Redes',url:'https://www.unicef.org/brazil/innocenti/relatorios/criando-redes-guia-metodologico-em-saude-mental',note:'Guia em português para aplicar cuidado psicossocial, trabalho em rede, atividades práticas e reflexão sobre casos.',language:'pt-BR'},
  {title:'Estratégia para melhorar a saúde mental e a prevenção do suicídio nas Américas',url:'https://www.paho.org/pt/documentos/cd609-estrategia-para-melhorar-saude-mental-e-prevencao-do-suicidio-na-regiao-das',note:'Documento estratégico em português para síntese, articulação intersetorial, prevenção e fortalecimento de competências.',language:'pt-BR'}
];

const chapters=navigation.parts.flatMap(part=>part.chapters).sort((a,b)=>a.chapter-b.chapter);
if(chapters.length!==34) throw new Error(`Wave10 enrichment expected 34 chapters, got ${chapters.length}`);
if(resourceCatalog.length!==34) throw new Error(`Wave10 resource catalog expected 34 resources, got ${resourceCatalog.length}`);
const resourceUrls=new Set(resourceCatalog.map(item=>item.url));
const resourceTitles=new Set(resourceCatalog.map(item=>normalize(item.title)));
if(resourceUrls.size!==34) throw new Error('Wave10 resource catalog contains repeated URLs');
if(resourceTitles.size!==34) throw new Error('Wave10 resource catalog contains repeated titles');
for(const item of resourceCatalog){
  if(item.language!=='pt-BR') throw new Error(`Wave10 resource is not marked pt-BR: ${item.title}`);
  if(!/^https:\/\//u.test(item.url)) throw new Error(`Wave10 resource must use HTTPS: ${item.url}`);
  if(/gto\.bombeiros\.mg\.gov\.br/iu.test(item.url)) throw new Error(`Wave10 resource cannot point to GTO: ${item.url}`);
}

function chapterPages(chapter){return semantic.pages.filter(page=>page.chapter===chapter.chapter);}
function chapterFacts(chapter){
  const pages=chapterPages(chapter);
  const summary=[]; let inSummary=false;
  for(const page of pages){for(const block of page.blocks){
    if(block.kind==='summary'){inSummary=true;continue;}
    if(inSummary && ['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','review'].includes(block.kind)){inSummary=false;}
    if(inSummary && ['paragraph','list-item'].includes(block.kind)){
      const text=cleanFact(block.text); if(text.length>=38 && !summary.includes(text)) summary.push(text);
    }
  }}
  const body=pages.flatMap(page=>page.blocks).filter(block=>['paragraph','list-item'].includes(block.kind)).map(block=>cleanFact(block.text)).filter(text=>text.length>=38);
  return {summary,body:[...new Set(body)]};
}

const output=[];
for(const [index,chapter] of chapters.entries()){
  const facts=chapterFacts(chapter);
  const fact=facts.summary[0]||facts.body[0];
  const second=facts.summary[1]||facts.body.find(item=>item!==fact)||fact;
  if(!fact) throw new Error(`Chapter ${chapter.chapter} has no fact for enrichment`);
  const distractorPool=chapters.filter(other=>other.chapter!==chapter.chapter).flatMap(other=>{const f=chapterFacts(other);return f.summary.slice(0,1).concat(f.body.slice(0,1));}).filter(item=>item && !normalize(facts.body.join(' ')).includes(normalize(item))).slice(0,12);
  while(distractorPool.length<3) distractorPool.push(`Uma resposta de outro contexto não substitui a análise específica deste capítulo ${distractorPool.length+1}`);
  const choices=[{id:'A',label:fact,correct:true},{id:'B',label:distractorPool[0],correct:false},{id:'C',label:distractorPool[1],correct:false},{id:'D',label:distractorPool[2],correct:false}];
  const resource=resourceCatalog[index];
  output.push({
    chapter:chapter.chapter,title:chapter.title,openingPage:chapter.openingPage,endingPage:Math.max(...chapter.pageNumbers),
    microlearning:{id:`w10-c${chapter.chapter}-micro`,pageNumber:chapter.openingPage,title:'Decisão rápida',prompt:'Qual afirmação recupera melhor o ponto central deste capítulo?',choices,reveal:`Ponto-chave: ${fact}.`},
    transfer:{id:`w10-c${chapter.chapter}-transfer`,pageNumber:Math.max(...chapter.pageNumbers),title:'Aplicação e transferência',apply:`Na próxima simulação, transforme este ponto em uma ação observável: ${fact}.`,transfer:'Transfira a lógica para um cenário diferente do exemplo do capítulo. Preserve o princípio e ajuste a forma de agir ao risco, à pessoa e ao ambiente.',verify:`Ao final, verifique se sua decisão preservou segurança, vínculo, proporcionalidade e coordenação. Use como segundo critério: ${second}.`},
    resource:{id:`w10-c${chapter.chapter}-resource`,pageNumber:Math.max(...chapter.pageNumbers),type:'link',title:resource.title,url:resource.url,note:resource.note,language:resource.language}
  });
}

write('chapter-enrichment.json',{schemaVersion:2,wave:'10',source:'generated-at-build',doctrineChanged:false,resourcePolicy:{language:'pt-BR',unique:true,gtoExcluded:true,writtenMaterials:true},chapters:output});
console.log(`WAVE10_ENRICHMENT_BUILD_OK chapters=${output.length} microlearning=${output.length} transfer=${output.length} resources=${output.length} unique=${resourceUrls.size} language=pt-BR gto=excluded doctrine-changed=false`);