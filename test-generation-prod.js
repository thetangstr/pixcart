// Test the production generation endpoint
async function testGeneration() {
  const testImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
  
  try {
    console.log("Testing production /api/generate endpoint...");
    
    const response = await fetch("https://oil-painting-app.vercel.app/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageData: testImage,
        style: "renaissance"
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ SUCCESS! Generation working");
      console.log("Response preview:", {
        success: data.success,
        hasDescription: !!data.preview?.description,
        descriptionLength: data.preview?.description?.length,
        style: data.preview?.style,
        usage: data.usage
      });
    } else {
      console.log("❌ Error:", response.status, data.error);
      console.log("Error code:", data.code);
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

testGeneration();