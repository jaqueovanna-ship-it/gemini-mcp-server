/**
 * Servidor MCP — Gemini Image Generator
 * Expõe a geração de imagens do Gemini (Imagen) como ferramenta MCP
 * para ser usada pelo Claude via "Conector personalizado".
 *
 * Rodar localmente:
 *   GEMINI_API_KEY=sua_chave node server.js
 *
 * Depois de hospedar (Render, Fly.io, Cloud Run, etc.), a URL do
 * servidor (ex: https://seu-app.onrender.com/mcp) é o que você cola
 * em Claude > Configurações > Conectores > Adicionar conector personalizado.
 */

import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!GEMINI_API_KEY) {
  console.error("ERRO: defina a variável de ambiente GEMINI_API_KEY antes de iniciar.");
  process.exit(1);
}

// ---------------------------------------------------------------
// 1. Define o servidor MCP e a ferramenta de geração de imagem
// ---------------------------------------------------------------
function buildServer() {
  const server = new McpServer({
    name: "gemini-image-generator",
    version: "1.0.0",
  });

  server.registerTool(
    "gerar_imagem_gemini",
    {
      title: "Gerar imagem com Gemini",
      description:
        "Gera uma imagem fotorrealista a partir de um prompt em inglês, usando a API de imagem do Gemini (Imagen). " +
        "Ideal para renders arquitetônicos, visualizações de interiores e material de portfólio.",
      inputSchema: {
        prompt: z
          .string()
          .describe("Prompt em inglês, detalhado, descrevendo a imagem desejada."),
        aspectRatio: z
          .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
          .default("4:3")
          .describe("Proporção da imagem final."),
        numberOfImages: z
          .number()
          .int()
          .min(1)
          .max(4)
          .default(1)
          .describe("Quantidade de imagens a gerar (1 a 4)."),
      },
    },
    async ({ prompt, aspectRatio, numberOfImages }) => {
      const imagens = await gerarImagemGemini({ prompt, aspectRatio, numberOfImages });

      // MCP tools podem retornar conteúdo de imagem inline (base64)
      return {
        content: imagens.map((base64) => ({
          type: "image",
          data: base64,
          mimeType: "image/png",
        })),
      };
    }
  );

  return server;
}

// ---------------------------------------------------------------
// 2. Chamada real à API do Gemini (Imagen)
// ---------------------------------------------------------------
async function gerarImagemGemini({ prompt, aspectRatio, numberOfImages }) {
  const model = "imagen-4.0-generate-001"; // ajuste conforme o modelo disponível na sua conta
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: numberOfImages,
        aspectRatio,
      },
    }),
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Gemini API retornou erro ${response.status}: ${erro}`);
  }

  const data = await response.json();
  // Cada predição vem com bytesBase64Encoded
  return (data.predictions || []).map((p) => p.bytesBase64Encoded);
}

// ---------------------------------------------------------------
// 3. Expõe o servidor MCP via HTTP (para conector remoto no Claude)
// ---------------------------------------------------------------
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: cada request é independente
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Servidor MCP do Gemini rodando na porta ${PORT}`);
  console.log(`Endpoint MCP: http://localhost:${PORT}/mcp`);
});
