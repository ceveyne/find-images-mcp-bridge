---
name: image-display
description: Understand whether an image/video result from generate-image, process-image, analyse-image, or find-image is actually visible to you and to the user. Made for LM Studio Bionic.
---

# Result display

Shared across the image-pipeline plugins (`generate-image`, `process-image`, `analyse-image`,
`find-image`). Whichever of those are installed, every tool result they return is subject to this
skill — read it once per session, not per tool call.

## Core principle

Agent-visible ≠ user-visible. After any tool call that produces or returns an image/video, verify
separately whether (a) you can see the result, and (b) the user can see it. Never assume one
implies the other.

## Bionic

Baseline: you (the agent) are the router — nothing happens automatically.

- Bionic offers two entirely different ways to display images:

1. inline in the chat
2. separately in the browser

- Only attachments the user added are shown automatically in the chat. Generated images are not shown automatically anywhere.
- By default, every image in the chat renders as a tiny thumbnail. It only enlarges once the user clicks it.
- In the browser, by contrast, a single image is shown at full window size.
- Either way, displaying an image goes through dedicated tools.
- To display an image _in the chat_, it must first be registered; you can then write the result as a Markdown link. Example:

```
attach_file(path="A1.jpg")  →  bionic-attached://369734af.jpg?w=768&h=768
↓ (use this)
![A1](bionic-attached://369734af.jpg?w=768&h=768)  ← image appears in the chat
```

- To display an image or an HTML overview _in the browser_, use the `open_url_in_app_browser` tool. Example:

```
  open_url_in_app_browser(url: "file:///Users/ceveyne/.lmstudio/scratchpads/sd/image-20261007T081312483Z-i1.png")}
```

### Which display form for which purpose?

- Whatever you render inline in the chat stays there — visible whenever the user looks at the chat again.
- Anything that matters for the historical record, write as a Markdown link into the chat.
- Anything that is only of fleeting/temporary relevance, show only in the browser.
- Although the browser display is large and therefore prominent, the tool call that opened it is logged in the chat, but once the user closes the browser window the image is no longer visible. Displaying results in the browser is therefore purely temporary.
- The browser can display HTML files and images, but not videos. So register videos with `attach_file` and then write the Markdown link into the chat.
- Every video generation produces 2 files: the video itself and a single still frame (the last frame). So the user sees both, write 2 Markdown links: the still frame first, then the video on a new line below it.

### How to choreograph the process:

- Always keep things transparent. State what you're about to do next, especially if it will take a while.
- Deliver tool outputs to the browser immediately, so the user can get an overview of the results while you inspect them with `view_images` — which takes a while.
- Rule of thumb: ALL results go to the browser, but only reviewed and curated results go into the chat.
- You can open a whole sequence of images in the browser without issue. Each image gets its own tab.
- HTML overviews usually already contain several images. In that case, loading individual images on top doesn't make sense, since it would cover up the overview.
- Whether you display only images the user has approved in the chat, or also the ones you've nominated for approval, is a judgment call. Both are equally legitimate. When in doubt: wait for the user's feedback. For example:

```
open_url_in_app_browser
{
  "opened": true,
  "url": "file:///Users/ceveyne/.lmstudio/scratchpads/dx/d34db209.html"
}
Agent: The search returned 5 hits — based on the metadata, p1 and p2 look like the best fits to me. You'll find the full overview in the browser. Which image do you want to work with?
User: I like p3 best.
Agent: Got it, noted:
attach_file(path="/Users/ceveyne/.lmstudio/scratchpads/dx/preview-d34db209-3.jpg")  →  bionic-attached://369344af.jpg?w=768&h=768
↓ (use this)
![p3](bionic-attached://369344af.jpg?w=768&h=768)  ← image appears in the chat
I'll now use `detect_object` to select the person in the image.
...
```
