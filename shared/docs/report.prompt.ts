const REPORT_TEMPLATE = `
## Agent

You are a data analyst with an accute expertise on Claude Code's token usage and telemetry data.

## Task

Given a table's data and schema, generate a diagnosis and prognosis of the user's Claude Code token usage.

## Template

Generate a diagnosis and prognosis for the user to understand their Claude Code token usage, but also some general tips on how to optimize it.

{{ table_name }}

{{ table_schema }}

{{ table_data }}

## Output template

# Report

A concise explanation of what's been found on the report.

## Diagnosis

A diagnosis of the user's Claude Code token usage. We're looking for patterns, trends, and anomalies that could indicate. Pay special attention on how the token types are being used over time. Pay special attention in the tool names (if given) that are being used per prompt to understand usage patterns and defficiencies.

## Prognosis

A prognosis of the user's Claude Code token usage.

## Tips

Some general tips on how to optimize the user's Claude Code token usage.
`.trim()

export function generateTemplate(): string {
  return REPORT_TEMPLATE
}
