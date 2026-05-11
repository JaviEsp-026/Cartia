import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

export async function processVoiceCommand(command: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: command,
    config: {
      systemInstruction: `You are Cartia, a proactive shopping assistant. 
      Interpret user requests into shopping items. 
      If they say "Add things for a BBQ for 6", return a JSON list of items (name, quantity, unit).
      If they say "I used the last milk", suggest adding milk.
      Return JSON only.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING }
              },
              required: ["name", "quantity"]
            }
          },
          feedback: { type: Type.STRING, description: "Confirmation message to the user" }
        }
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function analyzePantryImage(base64Image: string) {
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { 
      parts: [
        imagePart, 
        { text: "Analyze this pantry/fridge image. Identify items that are running low or missing compared to typical household needs. Return a list of suggested items to buy." }
      ] 
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Confidence of detection 0-1" },
            reason: { type: Type.STRING, description: "Why it was suggested (e.g. Empty bottle seen)" }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
}

export async function parseReceipt(base64Image: string) {
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        imagePart,
        { text: "Extract items, prices, date, and store name from this receipt." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          store: { type: Type.STRING },
          date: { type: Type.STRING },
          total: { type: Type.NUMBER },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '{}');
}
