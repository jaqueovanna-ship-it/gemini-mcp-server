# Gemini MCP Server

Servidor MCP simples que expõe a geração de imagens do Gemini (Imagen) como
ferramenta para o Claude usar via **Conector personalizado**.

## O que ele faz

Recebe do Claude um prompt + proporção + quantidade de imagens, chama a API
do Gemini, e devolve a(s) imagem(ns) diretamente na conversa.

## 1. Configurar localmente

```bash
npm install
GEMINI_API_KEY=sua_chave_aqui npm start
```

Sua chave: https://ai.google.dev → "Get API key".

Teste rápido (com o servidor rodando):

```bash
curl http://localhost:3000/health
```

## 2. Hospedar (para ter uma URL pública)

Qualquer serviço que rode Node.js serve. Sugestões simples, sem cartão de
crédito para o plano free:

### Opção A — Render.com (mais simples para quem não é dev)
1. Suba esta pasta para um repositório no GitHub.
2. Em render.com → **New → Web Service** → conecte o repositório.
3. Build command: `npm install` — Start command: `npm start`.
4. Em **Environment**, adicione a variável `GEMINI_API_KEY` com sua chave.
5. Deploy. Sua URL final será algo como:
   `https://gemini-mcp-server.onrender.com/mcp`

### Opção B — Fly.io / Railway / Cloud Run
Mesma lógica: build com Node, variável de ambiente `GEMINI_API_KEY`,
porta lida de `process.env.PORT` (já configurado no código).

⚠️ Plano free do Render "dorme" depois de alguns minutos sem uso — a
primeira chamada depois de um tempo parado pode demorar ~30s para responder.
Para uso profissional constante, vale um plano pago ou Cloud Run (paga por uso).

## 3. Conectar no Claude

1. No Claude.ai (ou Claude Desktop), vá em **Configurações → Conectores**.
2. Clique em **Adicionar → Adicionar conector personalizado**.
3. Cole a URL do seu servidor + `/mcp` no final
   (ex: `https://gemini-mcp-server.onrender.com/mcp`).
4. Dê um nome, ex: "Gemini Imagens".
5. Numa conversa, clique no ícone de ferramentas e ative o conector.

Pronto — a partir daí, pedir "gere uma imagem com o Gemini de..." vai
disparar essa ferramenta automaticamente.

## Segurança

- Sua `GEMINI_API_KEY` fica só no servidor (variável de ambiente), nunca
  exposta ao Claude ou ao navegador.
- Se quiser restringir quem pode chamar seu servidor, adicione um token
  simples de autenticação no header e valide no `server.js` antes de
  processar a requisição.
