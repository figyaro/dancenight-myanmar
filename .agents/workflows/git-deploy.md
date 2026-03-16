---
description: Git deployment process (Add, Commit, Push)
---

This workflow handles the standard deployment process to GitHub.

// turbo-all
1. Stage all changes
```bash
git add .
```

2. Commit changes with a descriptive message
   - If the user provided a specific message, use it.
   - Otherwise, use a message summarizing the recent work.
```bash
git commit -m "feat: refine post inspection with impressions, file size, and author details"
```

3. Push to the main branch
```bash
git push origin main
```
