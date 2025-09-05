const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGeminiKey() {
  const apiKey = "AIzaSyB0QRFg7tayl1jW9oDkUfFST5K7hSx2EzM";
  
  try {
    console.log("Testing Gemini API key...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Say 'API key is working!'");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Success! Response:", text);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("API_KEY_INVALID")) {
      console.error("The API key is invalid or doesn't have access to Gemini API");
    }
  }
}

testGeminiKey();