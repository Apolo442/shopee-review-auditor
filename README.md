![Banner](banner.png)

# 🛡️ Shopee Review Auditor (Chrome Extension)

![Status](https://img.shields.io/badge/Status-Stable-brightgreen)
![Tech](https://img.shields.io/badge/Stack-JavaScript%20%7C%20Manifest%20V3-orange)
![Focus](https://img.shields.io/badge/Focus-Reverse%20Engineering%20%26%20Data%20Mining-blue)

> **Uma ferramenta de auditoria estatística para E-commerce que intercepta tráfego de rede para gerar relatórios técnicos livres de viés cognitivo.**

## 🎯 O Problema

Ler reviews manualmente é ineficiente e enviesado. A maioria dos usuários avalia a entrega, não o produto. Além disso, a paginação assíncrona (SPA) da Shopee dificulta a extração de dados em massa para análise.

## 💡 A Solução

Esta extensão injeta um script no contexto principal da página (`world: MAIN`) para interceptar as chamadas `fetch` nativas. Ela captura os pacotes JSON brutos vindos da API da Shopee antes que sejam renderizados no DOM, permitindo:

1.  **Sanitização em Tempo Real:** Filtra comentários irrelevantes ("Chegou rápido", "Gostei") via regex.
2.  **Auditoria Estatística:** Garante que defeitos sejam considerados apenas se superarem 5% de recorrência (Regra de Pareto aplicada).
3.  **Prompt Engineering Automático:** O JSON final já inclui instruções de sistema para que LLMs (Gemini/GPT) ajam como auditores técnicos.

## 🛠️ Tecnologias & Engenharia

- **Manifest V3:** Arquitetura moderna de extensões Chrome.
- **API Interception:** Sobrescrita do protótipo `window.fetch` para captura de streams de dados ocultos.
- **DOM Injection:** Injeção de UI reativa que detecta mudanças de rota em Single Page Applications (SPA).
- **Data Sanitization:** Algoritmos de limpeza de texto para redução de ruído no dataset.

## 🚀 Como Instalar (Developer Mode)

1.  Clone este repositório.
2.  Abra o Chrome em `chrome://extensions/`.
3.  Ative o **Modo do desenvolvedor** (canto superior direito).
4.  Clique em **Carregar sem compactação** e selecione a pasta do projeto.
5.  Acesse qualquer produto na Shopee e o botão "🛡️ AUDITAR PRODUTO" aparecerá automaticamente.

## 📂 Estrutura do JSON Gerado

O arquivo final não é apenas uma lista, mas um objeto estruturado para IA:

```json
{
  "INSTRUCAO_PARA_IA": "Você agora é um AUDITOR... Regra: Não generalize casos isolados...",
  "DATASET_REVIEWS": [
    {
      "stars": 1,
      "text": "O projetor desliga sozinho após 20 min.",
      "date": "14/02/2026"
    }
    // ...
  ]
}
```

## 👨‍💻 Autor

Mateus Sampaio Engenharia de Software & Automação Portfólio | LinkedIn

Este projeto é apenas para fins educacionais e de portfólio.
