import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDHY4_6lfcyW1QsNC69U7V9I4uU1E52SIM");

export async function classifySector(title: string, description: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Based on the following startup title and description, classify its industry sector into ONE of these categories: EdTech, HealthTech, FinTech, AgriTech, DeepTech, CleanTech, E-commerce, SaaS, or Other. Return ONLY the category name.
  
  Title: ${title}
  Description: ${description}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    return "Other";
  }
}
