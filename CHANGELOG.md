# Changelog

## 2026.09.13-wave1

- Consolidada a branch `web-book-v1` como linha de recuperação.
- Registrados GitHub, Vercel e pontos de restauração.
- Criados `/api/book` e `/api/health` versionados.
- Retirado o corpus Base64/GZIP do caminho ativo do navegador.
- Criada fatia vertical com 15 páginas, capa e capítulo 1.
- Mantidos arquivos legados sem exclusão.
- Fixado o runtime em Node.js `24.x` para evitar atualização automática de versão principal.
- Tornada explícita a verificação de integridade com `window.crypto.subtle`.
- Publicado preview isolado no projeto Vercel canônico; produção permaneceu intacta.
