# E2E Testing Plan - PetCanvas Oil Painting App

## Test Coverage Overview

### 1. Critical User Flows
- **Upload → Convert → View Result**
- **Style Selection → Apply Style → Compare Results**
- **Gallery Browse → Select Example → Order**
- **Error Handling & Validation**

### 2. Test Categories

#### A. Homepage Tests
- [ ] Homepage loads correctly
- [ ] Navigation links work
- [ ] Hero slider displays and functions
- [ ] Gallery showcase displays
- [ ] CTA buttons navigate correctly

#### B. Upload Flow Tests
- [ ] Upload page accessible
- [ ] Image upload via file selector
- [ ] Drag and drop functionality
- [ ] Image preview displays
- [ ] Style selector shows all 3 styles with icons
- [ ] Generate button enables after image upload
- [ ] Validation messages for:
  - [ ] Invalid file formats
  - [ ] File size > 10MB
  - [ ] Non-pet images (warning)

#### C. Conversion Process Tests
- [ ] Loading animation displays during conversion
- [ ] Progress messages cycle
- [ ] Conversion completes successfully
- [ ] Result displays correctly
- [ ] Download button works
- [ ] Try another style option works
- [ ] Start over resets properly

#### D. Style Selection Tests
- [ ] All 3 styles display with correct icons:
  - [ ] Classic Portrait (Mona Lisa)
  - [ ] Thick & Textured (Van Gogh)
  - [ ] Soft & Dreamy (Monet)
- [ ] Style selection highlights active style
- [ ] Style details expand on selection
- [ ] Previously tried styles show checkmark

#### E. Gallery Tests
- [ ] Gallery page loads
- [ ] Example images display
- [ ] Clicking example shows details
- [ ] "Try this style" navigates to upload

#### F. Error Handling Tests
- [ ] 404 page displays for invalid routes
- [ ] API errors show user-friendly messages
- [ ] Network timeout handling
- [ ] Backend unavailable message

#### G. Responsive Design Tests
- [ ] Mobile layout (320px - 768px)
- [ ] Tablet layout (768px - 1024px)
- [ ] Desktop layout (1024px+)
- [ ] Touch interactions work on mobile

## Test Data Requirements

### Test Images
1. **Valid pet photo**: `test-dog.jpg` (< 10MB, clear pet portrait)
2. **Large file**: `large-image.jpg` (> 10MB)
3. **Invalid format**: `test.gif`
4. **Non-pet photo**: `landscape.jpg`
5. **Multiple pets**: `three-dogs.jpg`

## Automated E2E Test Implementation

### Test Structure
```
tests/
├── e2e/
│   ├── homepage.spec.ts
│   ├── upload-flow.spec.ts
│   ├── style-selection.spec.ts
│   ├── conversion.spec.ts
│   ├── gallery.spec.ts
│   ├── validation.spec.ts
│   └── responsive.spec.ts
├── fixtures/
│   └── test-images/
│       ├── valid-dog.jpg
│       ├── large-file.jpg
│       ├── invalid.gif
│       └── non-pet.jpg
└── helpers/
    ├── upload.helper.ts
    └── navigation.helper.ts
```

## Test Execution Plan

### Phase 1: Core Functionality (Priority 1)
1. Homepage loads
2. Upload image
3. Select style
4. Generate oil painting
5. View result

### Phase 2: Validation & Error Handling (Priority 2)
1. File validation
2. Size validation
3. Format validation
4. Error messages
5. Recovery flows

### Phase 3: UI/UX Features (Priority 3)
1. Style selector interactions
2. Gallery browsing
3. Responsive design
4. Animations and transitions

## Success Criteria
- All Priority 1 tests pass
- 90% of Priority 2 tests pass
- 80% of Priority 3 tests pass
- No critical bugs in user flow
- Page load times < 3 seconds
- Conversion process < 30 seconds

## Test Environment
- **Local Dev**: http://localhost:5174
- **Backend Required**: No (uses mocked responses for CI)
- **Test Runner**: Playwright
- **Browsers**: Chrome, Firefox, Safari, Mobile Safari

## CI/CD Integration
```yaml
# Run on every push and PR
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test
```

## Manual Testing Checklist

### Pre-Deployment
- [ ] Test with real pet photos
- [ ] Test all 3 styles
- [ ] Test on mobile device
- [ ] Test slow network (3G)
- [ ] Test with backend unavailable
- [ ] Test download functionality
- [ ] Test navigation flow

### Post-Deployment
- [ ] Verify all images load
- [ ] Test conversion with production backend
- [ ] Monitor error logs
- [ ] Check analytics tracking
- [ ] Verify SEO metadata