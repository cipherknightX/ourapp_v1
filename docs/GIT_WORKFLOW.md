# OurApp Git & Collaboration Workflow

> **Purpose:** Keep `main` stable while multiple humans and AI agents work safely in the same repository.

---

## 1. The Team Model

OurApp uses one GitHub repository with multiple runtime applications:

```text
                    GitHub repository
                         │
              ┌──────────┴──────────┐
              │                     │
            main              feature branches
          (stable)                  │
                           ┌────────┼────────┐
                           ▼        ▼        ▼
                         auth   instagram   search
                           │        │        │
                           └────────┼────────┘
                                    ▼
                              Pull Request
                                    │
                           review + CI checks
                                    │
                                    ▼
                                  main
```

### Rules

- `main` is the stable integration branch.
- Do **not** develop directly on `main`.
- Every feature/fix/docs change gets its own branch.
- Pull Requests are the integration point.
- At least one other person reviews meaningful work before it enters `main`.
- AI agents work on branches, not directly on `main`.
- Do not have multiple agents independently modifying the same files at the same time unless deliberately coordinated.

---

# 2. Repository Owner: Initial Git Setup

After extracting the starter ZIP:

```powershell
cd "C:\path\to\ourapp_v1"
```

Verify:

```powershell
dir
```

You should see:

```text
backend
docs
frontend
supabase
.env.example
.gitignore
docker-compose.yml
README.md
```

Initialize Git:

```powershell
git init
git branch -M main
```

First commit:

```powershell
git add .
git commit -m "chore: initialize OurApp V1 repository"
```

Connect GitHub:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/ourapp.git
```

Verify:

```powershell
git remote -v
```

Push:

```powershell
git push -u origin main
```

---

# 3. Add Your Friend as a Collaborator

The repository owner should add the friend as a collaborator.

On GitHub:

```text
Repository
  → Settings
  → Collaborators / Access
  → Add people
  → enter friend's GitHub username
  → choose appropriate repository access
```

For a trusted teammate who needs to develop and create Pull Requests, give the minimum write-level access that allows the required workflow.

Do not give unnecessary administrative access.

---

# 4. Protect `main`

GitHub currently supports branch protection rules and rulesets for enforcing Pull Requests, reviews, status checks, and other requirements. The exact UI can change over time.

GitHub's current path for a classic branch protection rule is:

```text
Repository
  → Settings
  → Code and automation
  → Branches
  → Branch protection rules
  → Add rule
```

GitHub documents this workflow here:

https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule

## Rule

Set:

```text
Branch name pattern:
main
```

Enable:

### Required

- [x] Require a pull request before merging
- [x] Require approvals
- [x] Required approvals: 1
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require conversation resolution before merging
- [x] Block force pushes / do not allow force pushes
- [x] Do not allow branch deletion
- [x] Do not allow bypassing the above settings, if appropriate for the repository/team

### Do not enable yet

Do not require status checks **until CI actually exists**.

Otherwise you can accidentally create a rule requiring a check that the repository does not yet provide.

Once GitHub Actions CI exists, add the relevant checks to the protection rule.

GitHub's documentation confirms that required status checks must successfully pass before a protected branch can be merged.

---

# 5. Recommended `main` Policy

The desired state is:

```text
main
 │
 ├── direct push              ❌
 ├── force push               ❌
 ├── delete branch            ❌
 ├── merge without PR         ❌
 ├── merge without review     ❌
 ├── unresolved PR comments   ❌
 └── failed CI                ❌  ← enable after CI exists
```

And:

```text
feature branch
      │
      ▼
   Pull Request
      │
      ├── automated checks
      │
      ├── human review
      │
      └── fixes if needed
              │
              ▼
            merge
              │
              ▼
            main
```

---

# 6. Your Friend: Clone the Repository

Your friend does **not** download the ZIP again.

After being added as a collaborator:

```powershell
git clone https://github.com/YOUR_USERNAME/ourapp.git
cd ourapp
```

Verify:

```powershell
git remote -v
git branch
```

They should see the repository and `main`.

---

# 7. Before Starting Any Task

Always update the local `main` first:

```powershell
git switch main
git pull origin main
```

Then create a task branch.

Example:

```powershell
git switch -c feature/auth-foundation
```

Other examples:

```powershell
git switch -c feature/instagram-connection
git switch -c feature/saved-items
git switch -c feature/search
git switch -c fix/webhook-idempotency
git switch -c docs/update-flow
```

---

# 8. Branch Naming

Use:

```text
feature/<short-description>
fix/<short-description>
refactor/<short-description>
docs/<short-description>
test/<short-description>
chore/<short-description>
```

Examples:

```text
feature/auth-foundation
feature/instagram-webhook
feature/saved-item-library
feature/search
fix/duplicate-webhook
fix/authorization-bypass
refactor/instagram-adapter
test/processing-pipeline
docs/update-architecture
chore/ci-setup
```

Avoid:

```text
mybranch
test
new
stuff
final
final2
working
jeevan-branch
friend-branch
```

---

# 9. Work Only on Your Branch

Check:

```powershell
git branch --show-current
```

Before coding, it should say something like:

```text
feature/auth-foundation
```

Never assume you are on the correct branch.

---

# 10. Commit Small, Logical Changes

Check changes:

```powershell
git status
git diff
```

Stage:

```powershell
git add .
```

Commit:

```powershell
git commit -m "feat: add authentication foundation"
```

Good commit prefixes:

```text
feat:
fix:
refactor:
test:
docs:
chore:
```

Examples:

```text
feat: add protected API routes
fix: prevent cross-user saved item access
test: cover authentication ownership
docs: update auth flow
chore: configure backend linting
```

Avoid:

```text
update
changes
done
stuff
fixed
final
```

---

# 11. Push the Branch

First push:

```powershell
git push -u origin feature/auth-foundation
```

After that:

```powershell
git push
```

---

# 12. Create a Pull Request

On GitHub:

```text
feature/auth-foundation
        │
        ▼
Create Pull Request
        │
        ▼
base: main
compare: feature/auth-foundation
```

The PR should explain:

```markdown
## What changed

- ...

## Why

- ...

## Tests

- ...

## Security considerations

- ...

## Documentation

- ...

## Known limitations

- ...
```

Use the same information expected by `docs/instructions.md`.

---

# 13. Review Workflow

The reviewer should check:

### Correctness

- Does it actually solve the task?
- Does it work with existing code?
- Are edge cases handled?

### Architecture

- Does it respect `architecture.md`?
- Is provider-specific logic isolated?
- Did it introduce unnecessary abstractions?

### Contracts

- Were API/database/job contracts changed?
- Were all consumers updated?
- Was `contracts.md` updated?

### Security

- Can another user access this data?
- Is input validated?
- Are secrets protected?
- Is authorization server-side?
- Does RLS still work?
- Could this introduce SSRF/injection/XSS?

### Data

- Does ownership remain correct?
- Are migrations included?
- Are transactions/constraints appropriate?

### AI/media

- Is AI output validated?
- Is raw media still temporary?
- Are retries bounded?
- Is cleanup handled?

### Tests

- Are relevant tests present?
- Do existing tests still pass?

### Documentation

- Should `flow.md` change?
- Should `decisions.md` change?
- Should `security.md` change?
- Should `architecture.md` change?

---

# 14. After Review Changes

A reviewer may request changes.

The author stays on the same feature branch.

```powershell
# make changes

git add .
git commit -m "fix: address review feedback"
git push
```

The existing Pull Request automatically updates.

Do not create a second PR for ordinary review fixes.

---

# 15. Merge

Once:

```text
PR approved
    +
required CI checks pass
    +
conversations resolved
    +
no merge conflicts
```

the PR can be merged into `main`.

For this small project, prefer **Squash and merge** for most feature branches so `main` stays easy to understand.

After merging, delete the remote feature branch when GitHub offers to do so.

---

# 16. After Your PR Is Merged

Everyone should update their local `main`:

```powershell
git switch main
git pull origin main
```

Delete the old local feature branch:

```powershell
git branch -d feature/auth-foundation
```

If the remote branch still exists and you intentionally want to delete it:

```powershell
git push origin --delete feature/auth-foundation
```

Then start the next task from the newest `main`.

---

# 17. Keeping a Long-Running Branch Updated

If a feature takes several days:

```powershell
git switch main
git pull origin main

git switch feature/my-feature
git merge main
```

Resolve conflicts if needed, test again, then:

```powershell
git push
```

Do not blindly resolve conflicts by choosing "ours" or "theirs".

Understand both changes first.

---

# 18. Multiple People Working Simultaneously

Example:

```text
                    main
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
     Jeevan       Friend      Agent
          │          │          │
    feature/auth  feature/ui  feature/webhook
          │          │          │
          └──────────┼──────────┘
                     ▼
                  PR review
                     │
                     ▼
                    main
```

Each person should own a reasonably isolated task.

### Good division

```text
Jeevan:
feature/auth-foundation

Friend:
feature/frontend-shell

AI agent:
feature/backend-health-check
```

### Risky division

```text
Jeevan:
backend/app/services/saved_item.py

Friend:
backend/app/services/saved_item.py

Agent:
backend/app/services/saved_item.py
```

Three contributors changing the same file simultaneously creates unnecessary merge conflicts.

---

# 19. AI Agent Workflow

AI agents follow the exact same Git discipline.

Before giving an agent a task:

```text
1. Ensure working tree is clean.
2. Create a dedicated branch.
3. Give the agent a narrow task.
4. Tell it to read docs/instructions.md first.
5. Tell it which files/area it may change.
6. Review its diff.
7. Run tests.
8. Commit.
9. Push.
10. Review PR.
11. Merge only when satisfied.
```

Example:

```powershell
git switch main
git pull origin main
git switch -c feature/auth-foundation
```

Then instruct the agent:

```text
Read:
- docs/guardrail.md
- docs/instructions.md
- docs/architecture.md
- docs/contracts.md
- docs/database.md
- docs/security.md
- docs/testing.md
- docs/techstack.md

Implement ONLY the authentication foundation.

Do not implement Instagram.
Do not modify unrelated features.
Do not change the architecture.
Follow existing contracts.
Run the relevant tests.
Report changed files, tests, security considerations, and documentation updates.
```

---

# 20. AI Agent Safety Rule

Never give an autonomous agent unrestricted permission to:

```text
push directly to main
force push
rewrite repository history
delete branches
change branch protection
rotate production secrets
change production infrastructure
```

Agents should normally work through a branch + PR.

---

# 21. Emergency Fix

If production/main has a serious issue:

```powershell
git switch main
git pull origin main
git switch -c fix/critical-issue
```

Fix → test → commit → push → PR.

Do not disable protection simply because the fix is urgent unless there is a genuine emergency and the team consciously accepts the risk.

---

# 22. Never Do These

### Never commit secrets

```text
.env
API keys
passwords
tokens
service-role keys
webhook secrets
```

Check:

```powershell
git status
git diff --cached
```

before committing.

### Never force-push shared branches

Avoid:

```powershell
git push --force
```

especially on `main`.

### Never develop directly on main

Bad:

```text
main → edit → commit → push
```

Good:

```text
main → feature branch → PR → review → main
```

### Never use Git as a replacement for communication

If two people are changing the same architecture/data flow, coordinate before coding.

---

# 23. Quick Daily Workflow

## Starting work

```powershell
git switch main
git pull origin main
git switch -c feature/my-task
```

## During work

```powershell
git status
git diff
```

Commit logical chunks:

```powershell
git add .
git commit -m "feat: ..."
```

Push:

```powershell
git push -u origin feature/my-task
```

## Finishing

```text
Run tests
    ↓
Review diff
    ↓
Update docs
    ↓
Push
    ↓
Open PR
    ↓
Review
    ↓
Merge
    ↓
Delete branch
```

## Next task

```powershell
git switch main
git pull origin main
git switch -c feature/next-task
```

---

# 24. Golden Rule

```text
main = stable truth

branches = experiments/work

PRs = integration + review

docs = architectural memory

tests = executable expectations

Git history = record of what happened
```

When in doubt:

> **Pull first. Branch first. Change narrowly. Test. Review. Merge.**
