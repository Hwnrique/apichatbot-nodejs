import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const client = new GoogleGenAI({
  apikey: process.env.GEMINI_API_KEY,
});

const app = express();
const port = Number(process.env.PORT) || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "front-end")));

async function descreverImagem(message) {
  const response = await fetch(
    "https://occ-0-2794-2219.1.nflxso.net/dnm/api/v6/E8vDc_W8CLv7-yMQu8KMEC7Rrr8/AAAABVSP_05dYA6iuLcCQBuLjOUCND1R3J1lZIunzUJSzEe5UJDwjNfzTFD99Mwfl8Mtsl5Gzp9ZsHx4wKB7VO3M_YzxshfcApaxajFn.jpg?r=4a3",
  );

  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const result = await client.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: buffer.toString("base64"),
        },
      },
      { text: message },
    ],
  });

  return result.text;
}

app.post("/api/chat", async (req, res) => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) {
    return res
      .status(400)
      .json({ error: "Escreva uma mensagem antes de enviar." });
  }

  try {
    const reply = await descreverImagem(message);
    if (typeof reply !== "string" || !reply.trim()) {
      return res
        .status(502)
        .json({
          error: "O modelo não retornou uma resposta. Tente novamente.",
        });
    }
    return res.json({ reply });
  } catch (error) {
    console.error("Erro ao processar mensagem:", error.message);
    return res
      .status(502)
      .json({
        error: "Não foi possível obter uma resposta agora. Tente novamente.",
      });
  }
});

app.listen(port, () =>
  console.log(`Chatbot disponível em http://localhost:${port}`),
);
