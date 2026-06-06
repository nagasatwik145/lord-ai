## Plan: Remove OS Subtitle from Header

### Overview
Remove the 'OS' text from the top-left header branding on the command page.

### Change
In `src/components/lord/AppShell.tsx`, the shared `AppShell` header contains:

```
LORD
AI · OS
```

Update the subtitle line to remove 'OS'. Since `AppShell` wraps every page, this changes the branding globally — which is correct for a consistent HUD identity.

### Implementation
1. Edit `src/components/lord/AppShell.tsx`
2. Change `AI · OS` → `AI` (or remove the subtitle line entirely based on preference)

This is a single-line markup change with no downstream effects.