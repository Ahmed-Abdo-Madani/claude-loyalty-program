---
description: How to safely commit changes and sync between dev and main branches
---

# Workflow: Git Sync (Dev to Main)

This workflow ensures that all changes are committed to the `dev` branch, pushed to origin, merged into `main`, and pushed to origin, finally returning the user/agent back to the `dev` branch for continued work.

## AI Execution Instructions

When the user asks to "push all changes", "sync to main", or "commit and push", follow these steps carefully.

### 1. Verification
- Check the current branch with `git branch`.
- Check if there are uncommitted changes with `git status`.

### 2. Execution (PowerShell Recommendation)
If running on a Windows environment (like this one), use the provided helper script:

// turbo
```powershell
.\scripts\git-sync.ps1 -CommitMessage "your commit message here"
```

### 3. Manual Fallback
If the script fails or is unavailable, execute the following chain of commands sequentially:

```bash
# Ensure on dev
git checkout dev

# Stage and commit
git add .
git commit -m "feat: your descriptive message"

# Push dev
git push origin dev

# Sync with main
git checkout main
git pull origin main
git merge dev --no-edit
git push origin main

# Switch back
git checkout dev
```

## Best Practices
- **Commit Messages:** Always use descriptive, conventional commit messages (e.g., `feat:`, `fix:`, `chore:`).
- **Environment:** Be aware of the user's OS. On Windows, use `;` or separate commands. On Linux/macOS, use `&&`.
- **Safety:** Always return to the `dev` branch after the operation is complete to avoid accidental commits to `main`.
