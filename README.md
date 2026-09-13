# Manual do Participante CATS — Clean Rebuild

Wave 1 da reconstrução da edição digital interativa.

## Objetivo
Validar uma base técnica independente da arquitetura anterior antes da migração integral das 249 páginas.

## Critérios da Wave 1
- Next.js + React + TypeScript
- 10 páginas de MVP
- navegação anterior/próxima
- sumário
- busca local
- progresso persistido no navegador
- texto justificado
- TTS com preferência por voz Antônio quando disponível
- fallback pt-BR
- endpoint `/api/health`
- sem jsDelivr e sem dependência operacional do deployment antigo

## Regra de governança
Este branch é um clean room técnico. Não alterar a produção antiga a partir daqui. A migração integral do corpus só começa após build, health-check e smoke/E2E aprovados.
