# Code Development Guidelines (rules.md) - OpenCode

This document contains mandatory guidelines to keep our codebase clean, maintainable, and error-free. Every contributor is required to adhere to these rules before and during the development process.

---

## 🚨 CRITICAL: Pre-Development Steps

Before you write your first line of code, you **must** complete the following two steps:

### 1. Create a New Branch
Never commit code directly to the main branch (`main`/`master`).
*   **Branch Format:** `change-type/feature-name`
*   **Examples:** 
    *   `feature/add-login` (for new features)
    *   `bugfix/fix-broken-api` (for bug fixes)
    *   `refactor/clean-calc-function` (for code quality improvements)

### 2. Answer These Crucial Questions
Ask yourself (or discuss with the team) before you start typing code:
1.  **Do I fully understand the problem or feature that needs to be worked on?**
2.  **What is the best data structure and logical flow for this implementation?**
3.  **Does this change have the potential to break existing functionalities (breaking changes)?**
4.  **How will I test this code to ensure it actually works and is secure?**

---

## 🧹 Code Cleanliness (Professional Coding Standard)

Apply the following professional programming principles to ensure your code remains highly readable for other engineers:

*   **DRY Principle (Don't Repeat Yourself):** Do not write duplicate code. Extract repetitive logic into reusable functions or components.
*   **KISS Principle (Keep It Simple, Stupid):** Write straightforward logic that goes directly to the point. Avoid over-engineering or making code unnecessarily complex.
*   **Meaningful Names:** Use variable and function names that clearly describe their purpose (e.g., `isUserLoggedIn` is better than `status`). Consistently use English for all naming conventions.
*   **Single Responsibility:** A single function or module should do only one thing well. If a function grows too long, split it into smaller sub-functions.
*   **Remove Dead Code:** Do not leave commented-out code or unused variables in the repository.

---

## 🛡️ Error Minimization & Syntax Verification

To ensure your code is free of critical errors before submitting a Pull Request, perform this mandatory verification:

### Mandatory Local Verification
Use the native Node.js command to check the validity of your code's syntax without running it:

```bash
node --check filename.js
```

> **Note:** Ensure the command above yields no errors or warnings before pushing your changes to the remote repository.

---

## 🚀 Quick Workflow Cheat-Sheet

1.  `git checkout main && git pull origin main` (Ensure your local code is up to date).
2.  `git checkout -b feature/new-feature-name` (Create a new branch).
3.  Think through and answer the **4 Crucial Questions** listed above.
4.  Write your code adhering to professional cleanliness standards.
5.  Run `node --check <file>` for syntax verification.
6.  `git add . && git commit -m "feat: clear description of changes"`.
7.  `git push origin feature/new-feature-name` and open a Pull Request.x
