# Voice lab

Seven ways an AI coding agent can talk to you while it works, run on the same recorded coding task and scored side by side.

Partway through each run, "you" ask what it's doing and then ask for a change. Each design copes differently. The lab scores every design on:

- **Words heard**: how much you have to listen to
- **Longest silence**: how long you're left wondering
- **Wait for a reply**: how long your question waits
- **Unproven claims**: things it said were done before the worker proved them

## The designs

| Design | How it talks |
|---|---|
| Today (one model) | Silent until done, then reads the whole answer |
| Verbalizer | A small model turns the work into short spoken updates |
| Talker + reasoner | A fast talker answers from the worker's notes, speaks at milestones |
| Background worker | Like talker + reasoner, but news waits for a pause |
| One voice, 3 agents | One voice for three agents; questions and failures at once, the rest in batches |
| Think while listening | Starts on your question before you finish |
| Tandem | A quick "one sec" draft, then the real answer |

Under **Extras** you can type to it yourself, watch the worker log it reads from, and switch on a "sloppy" voice to see an unproven "deployed" get flagged.

It's a simulation: the task is recorded and the voices are scripted. Read-aloud uses your browser's built-in speech. Nothing is sent anywhere.

## Research behind it

Each design is modeled on published work, or in two cases on our own practice. Every reference below was checked against arXiv, Crossref or GitHub on 2026-11-19. Paper descriptions are short summaries, not full reviews.

### Where each design comes from

| Design | Based on | What we took from it |
|---|---|---|
| Today (one model) | Typical voice-agent setups today | The baseline: one model does the work and the talking |
| Verbalizer | **Think, Verbalize, then Speak** (ReVerT). Woo et al., 2025. [arXiv 2509.16028](https://arxiv.org/abs/2509.16028) | A separate step turns the reasoner's output into short, speakable lines |
| Talker + reasoner | **Agents Thinking Fast and Slow: A Talker-Reasoner Architecture**. Christakopoulou et al., Google DeepMind, 2024. [arXiv 2410.08328](https://arxiv.org/abs/2410.08328) | A fast talker answers from a shared belief state that a slow reasoner keeps updated |
| Background worker | **Realtime-Venus: A full-duplex interaction system with asynchronous delegation**. Ant Group, 2026. [arXiv 2609.13814](https://arxiv.org/abs/2609.13814) and **Multimodal Duplex Interaction Agent** (Gander). 2026. [arXiv 2609.08977](https://arxiv.org/abs/2609.08977) | Talk continues in the foreground while tasks run in the background and report back |
| One voice, 3 agents | Our own practice: one lead agent speaks for several worker agents, and workers never talk to the person directly | No paper found. This is the style we use day to day. |
| Think while listening | **SHANKS: Simultaneous Hearing and Thinking for Spoken Language Models**. Chiang et al., 2025. [arXiv 2510.06917](https://arxiv.org/abs/2510.06917) | Start reasoning on the user's words before they finish speaking |
| Tandem | **KAME: Tandem Architecture for Enhancing Knowledge in Real-Time Speech-to-Speech Conversational AI**. Kuroki et al., 2025. [arXiv 2510.02327](https://arxiv.org/abs/2510.02327) | A fast front end answers at once, and a stronger back-end model feeds in a better answer |

### Other related papers

- **Heartbeat Thinking: Speculative Reasoning and Tool Execution While Listening in Realtime Voice Agents**. Zhang et al., 2026. [arXiv 2610.26233](https://arxiv.org/abs/2610.26233). Closest to "think while listening" for agents that use tools.
- **Can Speech LLMs Think while Listening?** Shih et al., 2025. [arXiv 2510.07497](https://arxiv.org/abs/2510.07497)
- **The Silent Thought: Modeling Internal Cognition in Full-Duplex Spoken Dialogue Models via Latent Reasoning**. Wu et al., 2026. [arXiv 2603.17837](https://arxiv.org/abs/2603.17837)
- **VoxMind: An End-to-End Agentic Spoken Dialogue System**. Liang et al., 2026. [arXiv 2604.15710](https://arxiv.org/abs/2604.15710)
- **DuplexOmni: Real-Time Listening, Seeing, Thinking, and Speaking for Full-Duplex Interaction**. Huang et al., 2026. [arXiv 2606.09186](https://arxiv.org/abs/2606.09186)

### The human baseline

- **About 200 ms between turns.** Stivers et al. compared 10 languages and found the typical gap between speakers is short and similar across languages. *Universals and cultural variation in turn-taking in conversation*, PNAS, 2009. [doi:10.1073/pnas.0903616106](https://doi.org/10.1073/pnas.0903616106)
- **Planning starts before the other person stops.** Even a one-word reply takes far longer than 200 ms to plan, so people plan while still listening. Levinson & Torreira, *Timing in turn-taking and its implications for processing models of language*, Frontiers in Psychology, 2015. [doi:10.3389/fpsyg.2015.00731](https://doi.org/10.3389/fpsyg.2015.00731)

That is why "Wait for a reply" matters most, and why only the designs that start early get anywhere near human timing.

### Code to build real versions with

- [pipecat-ai/pipecat](https://github.com/pipecat-ai/pipecat): open-source framework for voice and realtime agents
- [livekit/agents](https://github.com/livekit/agents): framework for realtime voice agents
- [openai/openai-agents-js](https://github.com/openai/openai-agents-js) and [openai/openai-agents-python](https://github.com/openai/openai-agents-python): multi-agent workflows with voice agents and handoffs
- [kyutai-labs/moshi](https://github.com/kyutai-labs/moshi): full-duplex speech-text model, so both sides can talk at once

This lab simulates the designs and does not use any of these frameworks.

## Run it

```sh
npm install
npm run build     # writes docs/index.html, one self-contained page
npm run deploy    # optional: publish to Cloudflare Workers
```

`docs/` is ready for GitHub Pages (Settings → Pages → main branch, /docs).
