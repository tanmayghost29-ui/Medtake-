import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "25mb" }));

// Server-side Gemini API Vision OCR Proxy
app.post("/api/parse-prescription", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze this medicine strip, bottle label, or doctor's prescription.
Extract the medication details in strict JSON format:
{
  "name": "Medication Name",
  "dose": 1,
  "time": "08:00",
  "meal_timing": "After food",
  "frequency": "Daily",
  "notes": "Extracted dosage instructions"
}`;

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: cleanBase64 } }
          ]
        }
      ]
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return res.json({ success: true, prescription: parsedData });
  } catch (error: any) {
    console.error("Prescription parsing error:", error);
    return res.status(500).json({ error: error.message || "Failed to parse prescription" });
  }
});

// Vite Middleware mounting for Dev & Static serving for Production
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true }
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (_req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MedTake server running at http://localhost:${PORT}`);
});