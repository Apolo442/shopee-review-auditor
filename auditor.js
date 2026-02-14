(function () {
  "use strict";

  // --- CONFIGURAÇÃO GLOBAL ---
  const capturedReviews = [];
  let isRunning = false;
  let stopSignal = false; // Flag para abortar a operação

  // --- 0. SANITIZAÇÃO (Mantida) ---
  function isUseful(text) {
    if (!text) return false;
    const textLower = text.toLowerCase().trim();
    const blacklist = [
      /^produto bom$/i,
      /^muito bom$/i,
      /^gostei$/i,
      /^recomendo$/i,
      /^chegou rápido$/i,
      /^ainda vou testar$/i,
      /^entrega rápida$/i,
      /^veio certinho$/i,
      /^ótimo produto$/i,
      /^bom pelo preço$/i,
      /^top$/i,
      /^ok$/i,
      /^amei$/i,
      /^perfeito$/i,
    ];
    if (blacklist.some((regex) => regex.test(textLower))) return false;
    if (text.length < 15) return false;
    if (/(.)\1{4,}/.test(textLower)) return false;
    return true;
  }

  // --- 1. INTERCEPTADOR DE REDE ---
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch(...args);
    if (args[0] && args[0].toString().includes("get_ratings")) {
      const clone = response.clone();
      clone
        .json()
        .then((data) => {
          if (data && data.data && data.data.ratings) {
            const novos = data.data.ratings.reduce((acc, r) => {
              const rawText = (r.comment || "").replace(/[\n\r]+/g, " ").trim();
              if (isUseful(rawText)) {
                acc.push({
                  stars: r.rating_star,
                  text: rawText,
                  date: new Date(r.ctime * 1000).toLocaleDateString(),
                });
              }
              return acc;
            }, []);

            if (isRunning && !stopSignal && novos.length > 0) {
              capturedReviews.push(...novos);
              const unique = capturedReviews.filter(
                (v, i, a) => a.findIndex((t) => t.text === v.text) === i,
              );
              capturedReviews.length = 0;
              capturedReviews.push(...unique);
            }
          }
        })
        .catch(() => {});
    }
    return response;
  };

  // --- 2. LÓGICA DE NAVEGAÇÃO ---
  async function startScraper() {
    if (isRunning) return;

    // Reset inicial
    isRunning = true;
    stopSignal = false;
    capturedReviews.length = 0;

    const btn = document.getElementById("shopee-audit-btn");
    const stopBtn = document.getElementById("shopee-stop-btn");

    // Atualiza UI
    if (btn) btn.style.backgroundColor = "#555";
    if (stopBtn) stopBtn.style.display = "block"; // Mostra o botão parar

    const targetTexts = [
      "Com Mídia",
      "1 Estrela",
      "2 Estrela",
      "3 Estrela",
      "4 Estrela",
      "5 Estrela",
    ];
    const allButtons = Array.from(
      document.querySelectorAll(
        ".product-rating-overview__filter, .shopee-filter-button",
      ),
    );

    const sortedFilters = [];
    targetTexts.forEach((text) => {
      const found = allButtons.find((b) => b.innerText.includes(text));
      if (found) sortedFilters.push({ element: found, name: text });
    });

    if (sortedFilters.length === 0) {
      alert("❌ Vá para a aba de Avaliações primeiro.");
      fullReset();
      return;
    }

    for (let item of sortedFilters) {
      if (stopSignal) break; // Aborta o loop

      updateBtn(`🕵️ Lendo: ${item.name}...`);
      item.element.click();
      await sleep(1500);

      let lastPageNum = -1;
      for (let i = 0; i < 10; i++) {
        if (stopSignal) break; // Aborta o loop interno

        const activeBtn = document.querySelector(
          ".shopee-button-solid--primary",
        );
        const currentPageNum = activeBtn ? parseInt(activeBtn.innerText) : 1;

        if (i > 0 && currentPageNum === lastPageNum) break;
        lastPageNum = currentPageNum;

        updateBtn(
          `📥 ${item.name} (Pg ${currentPageNum}) | ${capturedReviews.length} Reviews`,
        );

        const nextBtn = document.querySelector(".shopee-icon-button--right");
        if (
          !nextBtn ||
          nextBtn.disabled ||
          nextBtn.classList.contains("shopee-button-solid--disabled")
        )
          break;

        nextBtn.click();
        await sleep(1200);
      }
    }

    if (!stopSignal) {
      downloadAuditedJSON();
      alert(`✅ CONCLUÍDO! ${capturedReviews.length} reviews coletados.`);
    }

    fullReset();
  }

  // --- 3. FUNÇÃO DE PARADA (HARD RESET) ---
  function stopScraper() {
    if (!isRunning) return;
    stopSignal = true; // Sinaliza paragem
    updateBtn("🛑 Parando...");
    // O loop vai ler o 'stopSignal' e sair
    // O fullReset será chamado no final da função startScraper ou forçado aqui após timeout curto
    setTimeout(fullReset, 1000);
  }

  function fullReset() {
    isRunning = false;
    stopSignal = false;
    capturedReviews.length = 0;

    const btn = document.getElementById("shopee-audit-btn");
    const stopBtn = document.getElementById("shopee-stop-btn");

    if (btn) {
      btn.innerText = "🛡️ AUDITAR PRODUTO";
      btn.style.backgroundColor = "#ee4d2d";
    }
    if (stopBtn) {
      stopBtn.style.display = "none"; // Esconde botão parar
    }
  }

  // --- 4. EXPORTAÇÃO ---
  function downloadAuditedJSON() {
    if (capturedReviews.length === 0) return;

    const systemPrompt = `
CONTEXTO E REGRAS IMPERATIVAS (LEIA COM ATENÇÃO):
Você agora é um AUDITOR DE DADOS ESTATÍSTICOS. Sua função é analisar EXCLUSIVAMENTE o dataset fornecido abaixo.

REGRA 1 (ISOLAMENTO): É PROIBIDO usar seu conhecimento prévio sobre este produto ou marca. Se a informação não está no JSON abaixo, ela NÃO EXISTE.
REGRA 2 (ESTATÍSTICA): Não generalize. Um problema só é "recorrente" se aparecer em mais de 5% dos reviews negativos. Caso contrário, é um "caso isolado".
REGRA 3 (PROVAS): Ao citar um defeito ou qualidade, você deve informar a contagem aproximada.

TAREFA:
Gere um relatório técnico contendo:
1. "Veredito Baseado em Dados": O produto é confiável estatisticamente?
2. "Defeitos Crônicos" (Somente se aparecerem múltiplas vezes. Cite a frequência).
3. "Casos Isolados/Outliers" (Problemas citados por apenas 1 ou 2 pessoas).
4. "Pontos Fortes Validados" (Recursos que funcionaram para a maioria).

DADOS PARA ANÁLISE (${capturedReviews.length} reviews):
`;
    const finalObject = {
      INSTRUCAO_PARA_IA: systemPrompt,
      DATASET_REVIEWS: capturedReviews,
    };

    // 1. Pega o título do produto (H1) ou o título da aba se o H1 falhar
    let productTitle =
      document.querySelector("h1")?.innerText || document.title;

    // 2. Limpa caracteres proibidos em nomes de arquivos e espaços extras
    let cleanTitle = productTitle
      .replace(/[<>:"/\\|?*]/g, "")
      .trim()
      .substring(0, 100);

    // 3. Define o nome final
    const fileName = `${cleanTitle}.json`;
    const dataStr = JSON.stringify(finalObject, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function updateBtn(text) {
    const btn = document.getElementById("shopee-audit-btn");
    if (btn) btn.innerText = text;
  }

  // --- UI INTELIGENTE ---
  function initUI() {
    // 1. Verifica se é página de produto
    // A Shopee usa URLs tipo: shopee.com.br/Nome-do-Produto-i.12345.67890
    // Ou verifica se existe elemento de preço/carrinho específico
    const isProductPage =
      window.location.href.includes("-i.") ||
      document.querySelector(".page-product");

    const btn = document.getElementById("shopee-audit-btn");
    const stopBtn = document.getElementById("shopee-stop-btn");

    if (!isProductPage) {
      // Se não for produto, remove os botões se existirem
      if (btn) btn.remove();
      if (stopBtn) stopBtn.remove();
      return;
    }

    // Se for produto e o botão não existir, cria
    if (!btn) {
      // Container para alinhar os botões
      const container = document.createElement("div");
      container.id = "shopee-audit-container";
      container.style.cssText = `position: fixed; bottom: 30px; left: 30px; z-index: 9999999; display: flex; gap: 10px; align-items: center;`;

      // Botão Principal
      const mainBtn = document.createElement("button");
      mainBtn.id = "shopee-audit-btn";
      mainBtn.innerText = "🛡️ AUDITAR PRODUTO";
      mainBtn.style.cssText = `padding: 15px 20px; background: #ee4d2d; color: white; font-weight: bold; border: 2px solid white; border-radius: 8px; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.3); font-family: sans-serif; white-space: nowrap;`;
      mainBtn.onclick = startScraper;

      // Botão Parar (Invisível inicialmente)
      const stopButton = document.createElement("button");
      stopButton.id = "shopee-stop-btn";
      stopButton.innerText = "❌ PARAR";
      stopButton.style.cssText = `display: none; padding: 15px 15px; background: #dc3545; color: white; font-weight: bold; border: 2px solid white; border-radius: 8px; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.3); font-family: sans-serif;`;
      stopButton.onclick = stopScraper;

      container.appendChild(mainBtn);
      container.appendChild(stopButton);
      document.body.appendChild(container);
    }
  }

  // Roda a verificação de UI a cada segundo (para lidar com navegação SPA)
  setInterval(initUI, 1000);
})();
