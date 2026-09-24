# result/ — reserved for plan 03

Agent result JSON schemas per report kind (`bug-result@1`, `idea-result@1`): what the analysis
agent must return, validated on the backend before the markdown is rendered. Versioned; a run
records the schema version it was validated against (`AgentRun.resultSchemaVersion`).
