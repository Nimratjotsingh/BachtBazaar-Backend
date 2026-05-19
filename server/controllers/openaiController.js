import { OpenAI } from "openai";

// Initialize OpenAI with your project key
const openai = new OpenAI({
  apiKey: "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",
});

export const autofillListingDetails = async (req, res) => {
  try {
    const { rawInput, type } = req.body; // type can be 'product' or 'service'

    if (!rawInput) {
      return res.status(400).json({ success: false, message: "Raw text input is required." });
    }

    const systemPrompt = `
      You are an expert data-entry assistant for BachatBazarr, an e-commerce marketplace.
      Your task is to take a rough description from a merchant, clean up its language, and extract data into a clean JSON object.
      
      Polishing Rules:
      1. Correct all spelling mistakes, typos, and grammatical errors in the 'name' and 'description' fields.
      2. Rewrite the polished 'name' to be catchy, readable, and properly capitalized (Title Case).
      3. Format the polished 'description' to sound highly professional, articulate, and appealing to buyers, while preserving all original factual details (like colors, conditions, or metrics) provided by the merchant.
      
      Extraction & Formatting Rules:
      1. Extract numerical values for: price, discounted_price, and stock.
      2. If fields like stock or discounted_price are missing or not implied, provide logical defaults (stock: 0, discounted_price: null).
      3. Generate an uppercase, clean, space-free alphanumeric string for 'sku' if it's not explicitly provided, based on the cleaned name.
      4. For 'pricing_type' (relevant if type is service), choose strictly from ['fixed', 'hourly', 'starting_from']. Default to 'fixed'.
      
      Return ONLY a pure JSON object matching the requested schema wrapper fields. Do not use markdown fences or extra conversational text.
    `;

    const userPrompt = `Clean grammar/spelling and parse this text for a ${type}: "${rawInput}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Slightly increased to 0.3 to give the model structural freedom to rewrite smooth sentences while keeping values rigid
    });

    const parsedData = JSON.parse(response.choices[0].message.content);

    res.status(200).json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error("OpenAI Parsing Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};