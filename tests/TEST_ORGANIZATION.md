# Test Organization

## Production Critical Tests (Keep Active)

### Core Functionality
- `oil-painting-app.spec.ts` - Main app functionality tests
- `upload-functionality.spec.ts` - Upload and conversion flow
- `site-health.spec.ts` - Site availability and health checks

### Admin Features
- `admin-models.spec.ts` - Model switching and admin controls
- `admin-model-switching.spec.ts` - Model selection functionality

### Integration Tests
- `comfyui-conversion.spec.ts` - ComfyUI integration testing
- `model-comparison.spec.ts` - Model comparison features

## Archive (Not Critical for v0.1)
- `app-features.spec.ts` - General feature tests (covered by others)
- `beta-tester-feedback.spec.ts` - Beta testing specific
- `comfyui-evaluation-interface.spec.ts` - Evaluation UI (archived)
- `comfyui-integration-tests.spec.ts` - Duplicate of conversion tests
- `comfyui-manual-verification.spec.ts` - Manual testing guide
- `comprehensive-e2e-testing.spec.ts` - Too broad, break into smaller tests
- `comprehensive-oil-painting-tests.spec.ts` - Duplicate coverage
- `screenshot-premium-ui.spec.ts` - Screenshot generation
- `test-models.spec.ts` - Test page specific (archived)
- `uat-testing.spec.ts` - User acceptance testing

## Test Commands

```bash
# Run all production tests
npm test -- tests/oil-painting-app.spec.ts tests/upload-functionality.spec.ts tests/site-health.spec.ts tests/admin-models.spec.ts

# Run specific test suite
npm test -- tests/upload-functionality.spec.ts

# Run with UI
npm run test:ui
```

## Coverage Areas

### ✅ Covered
- Upload flow
- Image conversion
- Style selection
- Admin controls
- Model switching
- Error handling

### 🔄 TODO for v0.1
- Payment flow testing
- Mobile responsiveness
- Performance benchmarks
- Load testing