const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGeminiKey() {
  const apiKey = "AIzaSyCezYU2wRlZcQDV28tMY1XwiIYbv3s7Hhs";
  const modelName = "models/gemini-2.5-flash-image-preview"; // CORRECT MODEL NAME
  
  try {
    console.log(`Testing Gemini API key with correct model: ${modelName}`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent("Say 'API key is working!'");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Success! Response:", text);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("API_KEY_INVALID")) {
      console.error("The API key is invalid");
    } else if (error.message.includes("models/gemini-2.5-flash-image-preview")) {
      console.error("Model not found - might need different access");
    } else {
      console.error("Full error:", error);
    }
  }
}

testGeminiKey();