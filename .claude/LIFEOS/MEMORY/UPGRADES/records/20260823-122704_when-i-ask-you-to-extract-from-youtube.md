---
id: 20260823-122704_when-i-ask-you-to-extract-from-youtube
slug: when-i-ask-you-to-extract-from-youtube
status: recommended
source: directive
created: 2026-08-23T12:27:04.549Z
expires: 2026-09-22T12:27:04.549Z
confidence: 0.9
target_surface: unknown
session_id: 45054c06-e647-42ff-9503-176edd848091
ledger_id: 
evidence:
  - "session:45054c06-e647-42ff-9503-176edd848091"
---

## Claim

when I ask you to extract from youtube, please use this format from now on: {
    "schemaVersion": "0.1.0",
    "name": "YouTube (Open Transcript)_2",
    "behavior": "create",
    "noteContentFormat": "\n\n![{{title}}]({{schema:@VideoObject:@id}})\n\n{{schema:@VideoObject:description|callout:(\"summary\",\"Description\",true)}}\n\n{{\"Given the YouTube video information and transcript. Analyze and generate the following:\\n## Summary\\n\\nBriefly summarize the video.\\n\\n## Key Takeaways\\n\\nList the key takeaways in the video.\\n\\n## Mindmap\\n\\nGenerate mindmap of the video with simple mermaid syntax, do not use icon.\\n\\n## Notable Quotes\\n\\nIdentify list of notable quotes from the transcript. Use following format to make a link for each quote so that it's easy to revisit:\\n\\n- [timesamp: transcript](https://www.youtube.com/watch?v=<video_id>&t=<timestamp_in_seconds>s)\"}}\n

## Current State

Stated by the principal in-session; not yet encoded in infrastructure.

## Recommendation

(not yet drafted)

## Notes

- 2026-08-23T12:27:04.549Z — created (source: directive)
