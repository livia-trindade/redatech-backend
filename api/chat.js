// redatech-backend/api/chat.js
export default async function handler(req, res) {
  // Configuração de CORS (permitir todas as origens)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Responder imediatamente a requisições OPTIONS (pré-flight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Aceitar apenas POST
  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Validar corpo da requisição
  if (!req.body?.messages) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(400).json({ error: "Formato inválido: 'messages' é obrigatório" });
  }

  console.log("[LOG] Recebendo requisição para DeepSeek:", {
    model: req.body.model || "deepseek/deepseek-r1:free",
    messages: req.body.messages.map(m => ({ role: m.role, content: m.content.slice(0, 50) + "..." }))
  });

  try {
    // Configuração específica para DeepSeek no OpenRouter
    const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://redatech-backend.vercel.app/api/chat", // Substitua pelo seu domínio
        "X-Title": "Redatech Correção"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free", // Modelo fixo para garantir compatibilidade
        messages: req.body.messages,
        temperature: 0.5,
        max_tokens: 2000 // Adequado para correções longas
      })
    });

    // Tratamento de erros do OpenRouter
    if (!resposta.ok) {
      const erro = await resposta.json();
      console.error("[ERRO] Resposta do OpenRouter:", {
        status: resposta.status,
        erro: erro
      });
      throw new Error(erro.error?.message || "Erro no serviço de correção");
    }

    const dados = await resposta.json();
    console.log("[LOG] Resposta bem-sucedida. Tokens usados:", dados.usage?.total_tokens);

    // Retorno formatado para o frontend
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      choices: [{
        message: {
          content: dados.choices?.[0]?.message?.content || "Sem resposta"
        }
      }]
    });

  } catch (error) {
    console.error("[ERRO CRÍTICO]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ 
      error: "Falha na correção",
      detalhes: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}