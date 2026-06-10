# ULTRA CHEAP DEVELOPMENT CHECKLIST

**Quick reference before each feature**

## BEFORE STARTING

- [ ] Do NOT read file unless you're about to edit it
- [ ] Use `grep -n "pattern" file.ts` to find line numbers
- [ ] Locate existing pattern to copy (not start from scratch)
- [ ] Plan 3-5 edits max for this batch
- [ ] Know exact file paths before any tool calls

## DURING IMPLEMENTATION

- [ ] **Edit tool** for existing files (60% cheaper than Write)
- [ ] **Write tool** for new files only
- [ ] Make parallel calls in same message (Read multiple files together)
- [ ] Use hardcoded mock data in API responses
- [ ] Copy existing UI components, change field names only
- [ ] NO new styles, NO Design Mode, NO console.log

## TESTING

- [ ] `pnpm build` locally to verify
- [ ] `grep "error" build output` to check
- [ ] NO Debug Mode, NO extended testing
- [ ] Fix only blockers, not warnings

## COMMITTING

- [ ] Consolidate 3-5 edits into ONE commit
- [ ] Include token estimate in commit message
- [ ] Push once per batch, not per file
- [ ] Message format: "Feature: Brief desc [~$0.03]"

## TOKEN TRACKING

- [ ] Log each session: Start tokens → End tokens = Cost
- [ ] Alert if > $0.10 per feature
- [ ] Alert if session > $2 (eject and replan)
- [ ] Monthly cap: Check PROJECT-TIMELINE-TOKEN-ANALYSIS.md

## QUICK MATH

- Read 1 file: 500 tokens = $0.002
- Edit 1 file: 1,000 tokens = $0.004
- Write 1 file: 2,000 tokens = $0.008
- Build + push: 500 tokens = $0.002
- **One feature (5 edits + build)**: ~$0.03-0.04

---

**IF TOKEN SPEND CLIMBING**: Stop. Commit current work. Plan next session fresh. DO NOT continue in same session past $2.
