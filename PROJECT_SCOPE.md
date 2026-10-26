# StateShift — Project Scope

## Problem

Network and infrastructure failures can interrupt services. Troubleshooting often requires engineers to inspect system state, identify the source of a failure, choose a corrective action, and verify that the system has recovered.

StateShift explores how a tool-using AI agent can perform this investigation and recovery workflow inside a controlled network simulator.

## Proposed Solution

StateShift is a simulated infrastructure troubleshooting agent powered by Meta Muse Spark. It investigates a network failure using structured tools, proposes a repair, executes an allowed change in the simulator, and independently verifies the result.

The system is designed around a core principle: **an agent must not claim success until the system state confirms it.**

## Intended User

Software and infrastructure engineers who need to understand how an AI agent can assist with diagnosing and recovering from infrastructure failures.

The hackathon implementation will demonstrate this capability in a safe, simulated environment—not in a live production network.

## Core User Flow

1. A user selects a network scenario with a service failure.
2. StateShift inspects the network using available tools.
3. Muse Spark identifies a likely cause based on observed state.
4. The agent proposes and executes a permitted repair.
5. The simulator runs an independent connectivity test.
6. StateShift reports whether recovery succeeded and shows the evidence.

## Core Features

- Small deterministic network simulator.
- A set of reproducible failure scenarios.
- Muse Spark tool calling for network investigation.
- Constrained repair actions.
- Independent post-repair verification.
- Visible tool-call and action history.
- Basic evaluation across multiple scenarios.

## Meta AI Integration

Muse Spark will be the reasoning and tool-selection component of the agent. The application will execute the model's requested tools and return their results.

Meta AI integration will be demonstrated through the actual investigation and repair workflow, not merely through a generated explanation.

SAM 3.1 or other Meta models may be explored only if they provide a meaningful capability that improves the product.

## Technical Approach

- TypeScript / Node.js for the agent and simulator.
- Meta Model API for Muse Spark.
- Structured network state and deterministic simulator logic.
- Constrained tool execution.
- Connectivity tests as the source of truth for recovery.
- A web interface to visualize network state and agent actions.

## Evaluation

The project will be tested against fixed failure scenarios. Key measurements include:

- Successful recovery rate.
- Number of tool calls and repair actions.
- Failed repairs and regressions.
- Whether the agent reports success only after verification.

## Out of Scope

- Repairing real production networks.
- Unrestricted shell or infrastructure access.
- A general-purpose network administration chatbot.
- Large-scale cloud deployment.
- A complex simulator that distracts from the agent workflow.
- Adding models or features solely to increase the number of integrations.

## Definition of Done

A user can select a broken simulated network, observe Muse Spark investigate it through tools, see a constrained repair execute, and receive a verified outcome with an understandable action trace.
