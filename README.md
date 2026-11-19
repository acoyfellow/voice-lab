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

## Run it

```sh
npm install
npm run build     # writes docs/index.html, one self-contained page
npm run deploy    # optional: publish to Cloudflare Workers
```

`docs/` is ready for GitHub Pages (Settings → Pages → main branch, /docs).
