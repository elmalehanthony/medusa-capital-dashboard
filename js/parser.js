// parser.js — send BMO file to Claude API, get structured JSON back

const Parser = {

  EXTRACTION_PROMPT: `You are a financial data extraction assistant for Medusa Capital, an investment club using BMO Ligne d'action (account #230-32415).

Extract all data from this BMO document and return a single valid JSON object with this exact structure:

{
  "source_type": "pdf_statement" or "xlsx_dashboard",
  "snapshot": {
    "date": "YYYY-MM-DD",
    "total_cad": number,
    "cad_holdings": number,
    "usd_holdings_usd": number,
    "fx_rate": number,
    "net_invested_ytd": number,
    "net_invested_inception": number,
    "market_change_ytd": number,
    "market_change_inception": number
  },
  "positions": [
    {
      "date": "YYYY-MM-DD",
      "ticker": "string",
      "name": "string",
      "shares": number,
      "cost_per_share": number,
      "total_cost": number,
      "current_price": number,
      "current_value": number,
      "currency": "CAD" or "USD",
      "current_value_cad": number,
      "sector": "string",
      "return_inception": number,
      "return_last_month": number or null,
      "return_last_year": number or null,
      "pf_weight": number or null,
      "first_acquired": "YYYY-MM-DD" or null
    }
  ],
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "type": "buy|sell|deposit|withdrawal|fx|fee|dividend|interest",
      "ticker": "string" or null,
      "description": "string",
      "quantity": number or null,
      "unit_price": number or null,
      "commission": number,
      "amount": number,
      "currency": "CAD" or "USD"
    }
  ],
  "income": [
    {
      "date": "YYYY-MM-DD",
      "type": "dividend|interest|distribution",
      "ticker": "string",
      "description": "string",
      "amount": number,
      "currency": "CAD" or "USD",
      "ytd_total": number or null
    }
  ]
}

IMPORTANT RULES:
- The document is in French. "Valeur de cloture" = closing value, "Depot" = deposit, "Retrait" = withdrawal, "Dividende" = dividend, "Achat" = buy, "Vente" = sell, "Frais" = fee, "Change de monnaie" = fx conversion.
- For PDFs: extract from ALL pages including the transaction log pages.
- For XLSX: each sheet tab named YYYYMMDD is a month-end snapshot. Extract all sheets.
- Tickers ending in :CA are CAD-denominated. All others are USD.
- current_value_cad = current_value * fx_rate for USD positions, or current_value for CAD positions.
- return_inception = (current_value - total_cost) / total_cost as a decimal.
- pf_weight = current_value_cad / total_portfolio_cad as a decimal.
- Return ONLY valid JSON. No markdown, no explanation, no code fences.`,

  async parseFile(file) {
    const apiKey = Keys.getAnthropic();
    if (!apiKey) throw new Error('No Anthropic API key set. Enter it in the Keys section above.');

    const ext = file.name.split('.').pop().toLowerCase();
    let messageContent;

    if (ext === 'pdf') {
      const base64 = await this._fileToBase64(file);
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 }
        },
        { type: 'text', text: this.EXTRACTION_PROMPT }
      ];
    } else if (ext === 'xlsx') {
      const base64 = await this._fileToBase64(file);
      messageContent = [
        { type: 'text', text: `Filename: ${file.name}\n\n` + this.EXTRACTION_PROMPT },
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            data: base64
          }
        }
      ];
    } else {
      throw new Error(`Unsupported file type: .${ext} — use PDF or XLSX.`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CONFIG.claude.model,
        max_tokens: CONFIG.claude.maxTokens,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Claude API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.content.find(b => b.type === 'text')?.text || '';

    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      throw new Error('Failed to parse Claude response as JSON. Raw: ' + text.slice(0, 300));
    }
  },

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }
};
