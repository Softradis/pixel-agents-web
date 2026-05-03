# Branch protection for `main`

Recommended GitHub rule for this public MIT project:

- Target branch: `main`
- Require a pull request before merging: enabled
- Required approvals: 1
- Require review from Code Owners: enabled
- Code owner: use `.github/CODEOWNERS` with a public maintainer handle or GitHub team
- Do not allow bypassing the above settings unless explicitly needed by maintainers

This cannot be enforced by repository files alone. It must be enabled in GitHub repository settings:

`Settings → Branches → Branch protection rules → Add rule`

or via GitHub API/CLI by an account with repository admin permissions.
