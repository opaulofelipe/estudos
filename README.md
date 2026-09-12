# Painel de Estudos

Dashboard estático em HTML, CSS e JavaScript, pronto para GitHub Pages.

## Arquivos que devem ficar juntos na raiz do site

- `index.html`
- `styles.css`
- `app.js`
- `Estudos.xlsx`
- `.nojekyll`

## Estrutura esperada da planilha

A aba pode se chamar `estudos` (preferencial) ou ter outro nome. O painel lê a primeira aba quando não encontra `estudos`.

Colunas reconhecidas:

- `Disciplina` — obrigatória
- `Aulas totais` — obrigatória
- `Dia` — recomendado
- `Instituição` — recomendado
- `ID` — opcional

O campo `ID` é opcional, mas pode ser útil se você pretende renomear disciplinas no futuro sem perder a associação do progresso. Se ele não existir, o painel cria um identificador a partir de Disciplina + Instituição.

## Como atualizar a planilha

1. Edite `Estudos.xlsx` mantendo as colunas principais.
2. No GitHub, substitua **o arquivo com o mesmo nome `Estudos.xlsx`**.
3. Aguarde a publicação do GitHub Pages.
4. No painel, toque em **Sincronizar**.

O progresso de aulas concluídas fica no `localStorage` do navegador e não é apagado durante a sincronização. Se uma disciplina for removida da planilha, ela deixa de aparecer, mas as marcações dela permanecem armazenadas no navegador; se a disciplina voltar com o mesmo ID (ou mesmo nome + instituição), o progresso reaparece.

## Importação local

O botão **Importar XLSX local** permite testar uma nova planilha diretamente no navegador, sem alterar o arquivo publicado no GitHub. Essa importação atualiza o catálogo salvo no navegador, mas não envia o XLSX ao repositório.

## Backup

Como o GitHub Pages é estático, o progresso não é sincronizado automaticamente entre aparelhos. Use **Exportar backup do progresso** para salvar um `.json` e **Restaurar backup** para recuperar as marcações em outro navegador ou dispositivo.

## Dependência

O painel usa SheetJS 0.20.3 para ler o XLSX diretamente no navegador. A biblioteca é carregada pelo CDN oficial do SheetJS.
