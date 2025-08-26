---
title: Introduction
description: Learn about AI Triage Assistant and its capabilities
---

# AI Triage Assistant

AI Triage Assistant is a sophisticated GitHub Action that provides intelligent issue and pull request triage
capabilities with explicit mode-based operation. It combines AI-powered label application using large language models
with comprehensive engagement scoring for project prioritization.

## What is AI Triage Assistant?

AI Triage Assistant is designed to help repository maintainers efficiently manage large volumes of issues and pull
requests by:

- **Automatically applying labels** based on issue content using AI analysis
- **Calculating engagement scores** to identify high-priority issues based on community activity
- **Providing focused sub-actions** with clean interfaces for specific functionality
- **Integrating with GitHub Projects v2** for automated workflow management

## Key Capabilities

### Multi-Mode Operation

The action operates through a unified entry point with mode selection:

- **Issue Triage Mode** (`apply-labels`) - Traditional AI-powered label application and commenting
- **Engagement Scoring Mode** (`engagement-score`) - Mathematical scoring based on community activity

### AI-Powered Analysis

- Uses GitHub Models API or Azure AI services for intelligent content analysis
- Supports multiple AI models including GPT-4o
- Configurable prompt templates for different labeling scenarios
- Batch processing capabilities for efficient label application

### Engagement Analytics

- Mathematical scoring algorithm based on configurable weights
- Historic analysis with 7-day lookback for trend identification
- GraphQL-based data retrieval for comprehensive issue information
- Integration with GitHub Projects for automated score updates

## Architecture

The action is built with:

- **TypeScript** with strict typing and ES modules
- **GraphQL** integration for efficient GitHub API operations
- **Modular design** with domain-specific modules
- **Comprehensive testing** with 200+ test cases
- **Security-focused** input validation and sanitization

## Getting Started

Ready to start using AI Triage Assistant? Check out the [Quick Start guide](../quick-start/) for step-by-step setup
instructions.
