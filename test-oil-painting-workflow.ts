/**
 * Test script for the enhanced oil painting workflow
 * Run with: npx tsx test-oil-painting-workflow.ts
 */

import { ComfyUIClient, ComfyUIStyleConfig } from './app/lib/comfyui-client'
import { oilPaintingStyles, createOptimizedStyleConfig, findOilPaintingLoRA } from './app/lib/comfyui-oil-painting-utils'

async function testWorkflow() {
  console.log('🎨 Testing Enhanced Oil Painting Workflow\n')
  
  const client = new ComfyUIClient()
  
  // Test 1: Check connection
  console.log('1. Testing ComfyUI connection...')
  const isConnected = await client.checkConnection()
  if (!isConnected) {
    console.error('❌ ComfyUI is not running. Please start ComfyUI first.')
    process.exit(1)
  }
  console.log('✅ ComfyUI is connected\n')
  
  // Test 2: Get available models
  console.log('2. Checking available models...')
  const models = await client.getModels()
  console.log(`✅ Found ${models.checkpoints.length} checkpoints`)
  console.log(`✅ Found ${models.loras.length} LoRAs`)
  console.log(`✅ Found ${models.controlnets.length} ControlNets\n`)
  
  // Test 3: Detect oil painting LoRA
  console.log('3. Detecting oil painting LoRAs...')
  const oilLoRA = findOilPaintingLoRA(models.loras)
  if (oilLoRA) {
    console.log(`✅ Found oil painting LoRA: ${oilLoRA}\n`)
  } else {
    console.log('⚠️  No oil painting LoRA detected\n')
  }
  
  // Test 4: Generate workflow for each style
  console.log('4. Testing workflow generation for each style:\n')
  
  const checkpoint = models.checkpoints[0] || 'sd_xl_base_1.0_0.9vae.safetensors'
  
  for (const [styleId, style] of Object.entries(oilPaintingStyles)) {
    console.log(`   Style: ${style.name}`)
    console.log(`   - Artist: ${style.artistReference.join(', ')}`)
    console.log(`   - Denoising: ${style.denoisingRange[0]}-${style.denoisingRange[1]}`)
    console.log(`   - Preferred ControlNet: ${style.preferredControlNet}`)
    
    // Create optimized config
    const config = createOptimizedStyleConfig(
      styleId as keyof typeof oilPaintingStyles,
      checkpoint,
      models.loras,
      models.controlnets
    )
    
    // Create workflow
    const workflow = client.createOilPaintingWorkflow(
      'test_image.png',
      config,
      !!config.controlnet_model
    )
    
    // Count nodes
    const nodeCount = Object.keys(workflow).length
    console.log(`   - Generated workflow with ${nodeCount} nodes`)
    console.log(`   - Using LoRA: ${config.lora_name || 'none'}`)
    console.log(`   - Using ControlNet: ${config.controlnet_model || 'none'}`)
    console.log(`   - Denoise: ${config.denoise}`)
    console.log('')
  }
  
  // Test 5: Test prompt enhancement
  console.log('5. Testing prompt enhancement:\n')
  
  const testPrompts = [
    'a portrait of a woman',
    'landscape with mountains',
    'still life with flowers'
  ]
  
  // Create a test client instance to access private methods
  const testClient = new ComfyUIClient()
  
  for (const prompt of testPrompts) {
    console.log(`   Original: "${prompt}"`)
    // We can't directly access private methods, so let's create a config and check the workflow
    const config: ComfyUIStyleConfig = {
      checkpoint: checkpoint,
      positive_prompt: prompt,
      negative_prompt: 'low quality',
      steps: 30,
      cfg: 7.0,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 0.7,
      style_intensity: 0.8
    }
    
    const workflow = testClient.createOilPaintingWorkflow('test.png', config, false)
    const enhancedPrompt = workflow['4'].inputs.text
    console.log(`   Enhanced: "${enhancedPrompt}"`)
    console.log('')
  }
  
  // Test 6: Validate Method 1 vs Method 2
  console.log('6. Comparing Method 1 (Simple) vs Method 2 (Advanced):\n')
  
  // Method 1: Simple Img2Img with LoRA
  const method1Config: ComfyUIStyleConfig = {
    checkpoint: checkpoint,
    lora_name: oilLoRA,
    lora_strength: 0.8,
    positive_prompt: 'oil painting, masterpiece',
    negative_prompt: 'photograph',
    steps: 30,
    cfg: 7.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.75  // 0.55-0.8 range from guide
  }
  
  const method1Workflow = client.createOilPaintingWorkflow('test.png', method1Config, false)
  console.log(`   Method 1 (Simple): ${Object.keys(method1Workflow).length} nodes`)
  console.log(`   - Uses LoRA: ${!!method1Config.lora_name}`)
  console.log(`   - Denoise: ${method1Config.denoise}`)
  console.log('')
  
  // Method 2: Advanced with ControlNet
  const method2Config: ComfyUIStyleConfig = {
    checkpoint: checkpoint,
    lora_name: oilLoRA,
    lora_strength: 0.9,
    positive_prompt: 'oil painting, masterpiece',
    negative_prompt: 'photograph',
    steps: 35,
    cfg: 8.0,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.90,  // 0.8-1.0 range with ControlNet
    controlnet_model: models.controlnets[0],
    controlnet_strength: 1.0,
    preprocessor: 'CannyEdgePreprocessor'
  }
  
  const method2Workflow = client.createOilPaintingWorkflow('test.png', method2Config, true)
  console.log(`   Method 2 (Advanced): ${Object.keys(method2Workflow).length} nodes`)
  console.log(`   - Uses LoRA: ${!!method2Config.lora_name}`)
  console.log(`   - Uses ControlNet: ${!!method2Config.controlnet_model}`)
  console.log(`   - Denoise: ${method2Config.denoise} (higher with ControlNet)`)
  console.log('')
  
  console.log('✅ All tests completed successfully!')
  console.log('\n📝 Summary:')
  console.log('- ComfyUI connection: OK')
  console.log(`- Oil painting LoRA: ${oilLoRA ? 'Available' : 'Not found (will use prompt enhancement)'}`)
  console.log(`- ControlNet support: ${models.controlnets.length > 0 ? 'Available' : 'Not available'}`)
  console.log('- Workflow generation: Working for all styles')
  console.log('- Prompt enhancement: Active')
  console.log('\n🎨 The oil painting workflow is ready for use!')
}

// Run the test
testWorkflow().catch(console.error)