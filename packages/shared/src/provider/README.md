# provider/ — reserved for plan 03

The agent provider contract (PLAN.md §6.1): input = workspace, prompts, attachments, model,
limits, tool profile; output = result JSON, raw log, usage, cost, stop reason. The first
implementation is `claude-code` in apps/agent-runner.
