---
description: Git deployment process (Add, Commit, Push)
---

This workflow handles the standard deployment process to GitHub.

// turbo-all
1. Automated Push and Deploy
   - Provide a descriptive message for the commit via the MSG environment variable.
```bash
MSG="feat: implement interactive player controls and optimize video feed performance" npm run push
```

