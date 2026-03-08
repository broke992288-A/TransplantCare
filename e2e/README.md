# E2E Tests (Playwright)

Browser-based end-to-end tests for the full application workflow.

## Prerequisites

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Running Tests

```bash
# Start the dev server first
npm run dev

# In another terminal, run Playwright tests
npx playwright test

# Run with visible browser
npx playwright test --headed

# Run a specific test file
npx playwright test e2e/full-workflow.spec.ts
```

## Test Scenarios

| # | Scenario | File |
|---|----------|------|
| 1 | Full workflow: signup → login → patient → lab → risk → alert → dashboard | `full-workflow.spec.ts` |

## Environment Variables

Create a `.env.test` file (not committed):

```
E2E_BASE_URL=http://localhost:8080
E2E_TEST_EMAIL=test-e2e@example.com
E2E_TEST_PASSWORD=TestPass123!
```

## CI Integration

Add to your CI pipeline:

```yaml
- name: Run E2E tests
  run: |
    npm run dev &
    sleep 5
    npx playwright test
```
