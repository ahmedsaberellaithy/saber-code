# Architecture Decision Records (ADRs)

This directory contains all architecture decisions made during the development of Saber Code CLI.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences.

## Index

### ADR-001: Implementation Summary
**File**: [001-implementation-summary.md](./001-implementation-summary.md)  
**Date**: January 2026  
**Status**: ✅ Complete

**Summary**: Complete implementation of the new architecture following the initial plan. Covers all core components, tools, CLI commands, and testing infrastructure.

**Key Decisions**:
- Modular architecture with clear separation (CLI → Core → Tools)
- Agent-based tool orchestration
- Plan-then-execute workflow
- Token-aware context management
- Comprehensive testing strategy (167 tests)

---

### ADR-002: Test Cleanup
**File**: [002-test-cleanup.md](./002-test-cleanup.md)  
**Date**: January 2026  
**Status**: ✅ Complete

**Summary**: Cleanup and organization of the test suite, archiving deprecated tests, and establishing clear test execution commands.

**Key Decisions**:
- Archive old architecture tests to `test/archived/deprecated-tests/`
- Remove redundant integration tests
- Separate test commands: `test`, `test:unit`, `test:e2e`, `test:all`
- Main test command runs component + unit tests (fast, reliable)
- All 167 tests passing (100%)

---

### ADR-003: Project Status
**File**: [003-project-status.md](./003-project-status.md)  
**Date**: January 2026  
**Status**: ✅ Complete

**Summary**: Detailed status report of the complete project implementation, tracking all components, features, and remaining work.

**Key Decisions**:
- All 17 planned components implemented
- Comprehensive test coverage achieved
- Documentation organized and complete
- Ready for production use

---

### ADR-004: Setup Complete
**File**: [004-setup-complete.md](./004-setup-complete.md)  
**Date**: January 2026  
**Status**: ✅ Complete

**Summary**: Final configuration and setup completion, including model research, environment configuration, and TDD implementation.

**Key Decisions**:
- Selected `qwen2.5-coder:32b-instruct` as default model
- Environment-based configuration via `.env`
- Full TDD business test coverage
- Comprehensive documentation created

---

### ADR-005: Status Summary
**File**: [005-status.md](./005-status.md)  
**Date**: January 2026  
**Status**: ✅ Complete

**Summary**: High-level overview of project completion status.

**Key Decisions**:
- Project 100% complete
- All core features implemented
- All tests passing
- Production-ready

---

### ADR-006: Test Status
**File**: [006-test-status.md](./006-test-status.md)  
**Date**: January 2026  
**Status**: ✅ Complete

**Summary**: Comprehensive test coverage analysis and status report.

**Key Decisions**:
- 180 total tests (10 component + 147 unit + 10 E2E + 13 TDD)
- 100% pass rate
- Deprecated tests properly archived
- Business-oriented test scenarios

---

## How to Read ADRs

1. **Start with the newest**: ADRs are numbered chronologically
2. **Context**: Each ADR explains WHY a decision was made
3. **Consequences**: Both positive and negative outcomes documented
4. **Status**: Shows if decision is active, superseded, or deprecated

## ADR Template

When adding new ADRs, use this structure:

```markdown
# ADR-XXX: [Title]

**Date**: [YYYY-MM-DD]  
**Status**: [Proposed | Accepted | Deprecated | Superseded]  
**Deciders**: [Who made this decision]

## Context

What is the issue we're facing?

## Decision

What did we decide to do?

## Consequences

### Positive
- What are the benefits?

### Negative
- What are the drawbacks?

## Alternatives Considered

What other options did we consider?

## References

- Links to related documents
- Related ADRs
```

---

## Timeline

```
2026-01 → Project Rebuild
       → ADR-001: Implementation Summary
       → ADR-002: Test Cleanup  
       → ADR-003: Project Status
       → ADR-004: Setup Complete
       → ADR-005: Status Summary
       → ADR-006: Test Status
```

---

## Related Documentation

- **Guides**: [../guides/README.md](../guides/README.md) - How-to guides
- **Research**: [../research/MODEL_COMPARISON.md](../research/MODEL_COMPARISON.md) - Model selection
- **Flow Diagrams**: [../PROJECT_FLOW.md](../PROJECT_FLOW.md) - Architecture diagrams

---

**Total ADRs**: 6  
**Status**: All Complete ✅
