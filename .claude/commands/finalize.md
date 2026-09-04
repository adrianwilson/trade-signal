# Finalize Spec

Transform a completed spec from a build plan into a design anchor document. Follow the `Instructions` to finalize the `Spec`.

## Instructions

- Read the completed spec file and the implemented code it describes.
- IMPORTANT: The spec has been fully implemented. Your job is to transform it from a build plan into living documentation.
- Strip all execution details: step-by-step tasks, implementation phases, testing strategy sections.
- Keep and refine: description, design decisions, architecture, acceptance criteria, validation commands.
- Add a "Design Decisions" section that captures the key choices made during implementation by reading the actual code and git history.
- Add an "Architecture" section that describes how the feature integrates with the rest of the system.
- Update the "Acceptance Criteria" to reflect what was actually built (not what was planned).
- Update the "Validation Commands" to reflect how to verify the feature still works.
- Keep the document concise. This is a reference, not a narrative.
- Use your reasoning model: THINK HARD about what future developers need to know about this feature.
- Overwrite the original spec file with the finalized version.

## Finalized Spec Format

```md
# <Feature/Bug/Chore/Refactor>: <name>

## Description

<what it does, why it exists, and what user problem it solves>

## Design Decisions

<key choices made during implementation and the reasoning behind them. Include alternatives that were considered and why they were rejected.>

## Architecture

<how this feature integrates with the system. Name the files, modules, and patterns involved. Include a brief description of the data flow if applicable.>

## Key Files

<list the primary files that make up this feature with a one-line description of each>

## Acceptance Criteria

<updated to reflect what was actually built, not what was originally planned>

## Validation Commands

<commands to verify this feature still works correctly>

## Notes

<any caveats, known limitations, or future considerations>
```

## Spec

$ARGUMENTS
