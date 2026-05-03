# Branch protection for `main`

Recommended GitHub rule for this public MIT project:

- Target branch: `main`
- Require a pull request before merging: enabled
- Required approvals: 1
- Require review from Code Owners: enabled
- Code owner: `asistente@softradis.com` via `.github/CODEOWNERS`
- Do not allow bypassing the above settings unless explicitly needed by maintainers

This cannot be enforced by repository files alone. It must be enabled in GitHub repository settings:

`Settings → Branches → Branch protection rules → Add rule`

or via GitHub API/CLI by an account/token with repository admin permissions.
