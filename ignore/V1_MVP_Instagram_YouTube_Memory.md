# V1 MVP — Instagram + YouTube Memory

**North star:** Save once. Understand immediately. Remember forever.

## 1. Product vision
- Build a personal memory layer for Instagram and YouTube saves.
- Core promise: Save once. Understand immediately. Remember forever.
- The original Reel/video is always preserved; AI understanding is an additional layer, not a replacement.
- The product should feel like a personal diary/library of things the user chose to keep.

## 2. V1 scope — deliberately narrow
- Supported sources: Instagram and YouTube only.
- Do not expand V1 to TikTok, Facebook, X, Reddit, or the general web.
- Focus on mastering the save → understand → organize → search → revisit workflow for these two sources.

## 3. Two kinds of saved content
- Information saves: recipes, places, products, books, workouts, tutorials, travel recommendations, etc. These receive useful structured extraction.
- Memory/content saves: cute videos, memes, couple edits, anime edits, songs, funny clips, sentimental content, or anything saved simply to revisit/share later. These remain perfectly valid saves even when there is little structured information to extract.
- Do not force every save into a list or category.

## 4. Save flow
- Saving must be immediate. Secure/store the source first so the user's save is not dependent on AI.
- After the source is safely saved, create an asynchronous analysis job in the background.
- The user should be able to continue using the product while analysis runs.
- Do not make the user sit through an analysis screen before the save is confirmed.

## 5. Automatic understanding
- V1 analyzes saved content after capture rather than waiting for the user to open it.
- Once analysis finishes, the extracted understanding is stored with the saved item so it is immediately available when the user returns later.
- Analysis depth should depend on content: rich informational content gets deeper extraction; low-information content gets lightweight understanding.
- Example lightweight understanding: content type, broad subject/theme, identifiable song/title/creator when available.

## 6. Multimodal extraction — critical quality rule
- Do NOT blindly trust captions, descriptions, or hashtags.
- Captions/descriptions are evidence, not truth.
- Actual video/image content, spoken audio/transcript, and on-screen text should generally carry more weight than captions and hashtags.
- Example: an anime edit with a misleading Japan-themed caption must be identified as an anime/edit rather than incorrectly classified as Japan travel.
- Use evidence fusion and confidence internally to resolve conflicts.

## 7. No hallucinated extraction
- Never invent facts simply because they are plausible.
- Every important extracted field should be traceable to evidence from the source or clearly marked as externally enriched information.
- If a quantity, price, address, rating, opening time, etc. is not actually present, do not fabricate it.
- Where information is uncertain, show uncertainty rather than confidently making it up.

## 8. Context-specific extraction
- Do not show a generic wall of 'AI summary / tags / keywords' for everything.
- Render information according to what the content actually is.
- Recipe → ingredients, instructions, time/servings when supported.
- Place/travel → places, locations, activities, prices/links only when supported or explicitly enriched.
- Product → product identity, relevant details, price/link when supported.
- Book → title, author, relevant recommendation/context.
- Other content → appropriate lightweight understanding rather than forcing a rigid schema.

## 9. Two-pane content view
- When a saved item has useful extraction, show the original Reel/video alongside the extracted information.
- Left side: original source/content.
- Right side: structured understanding/extraction.
- The original source remains the authority and lets the user verify the extraction.
- Example: recipe Reel on the left; ingredients and steps on the right.

## 10. Search
- Search is a core feature, not an afterthought.
- Users should be able to search their entire saved library without remembering whether something came from Instagram or YouTube.
- Search should eventually operate over both the original saved item and the information extracted from it.
- Example content search: 'restaurants in Tokyo under 500' can find information contained inside saved videos.
- Example source search: 'that couple edit in the rain' should find the actual saved Reel.
- V1 UI can expose All / Instagram / YouTube filters while keeping one unified search experience.

## 11. User control
- AI organizes and enriches; the user remains in control.
- Allow the user to trigger understanding manually if needed.
- Allow correction/editing of incorrect extracted information.
- Allow re-analysis when extraction is poor.
- Allow deletion of an extraction without deleting the original save.
- Keep the original source independent from the AI layer.

## 12. Storage model — conceptual
- Saved item/source: platform, URL, creator, media, thumbnail, metadata, saved timestamp.
- Original content: preserved source/media needed for reliable revisit and re-processing where legally/technically appropriate.
- Understanding: content type, summary where useful, entities, places, products, recipes, books, etc.
- Evidence: transcript, OCR/on-screen text, visual observations, and source references used for extraction.
- User context: collections/tags/notes if we include them in V1.
- Treat AI understanding as part of the saved memory, not as a temporary response.

## 13. Failure philosophy
- Saving must succeed independently of AI.
- If analysis fails, the original saved item remains usable.
- If extraction is wrong, the user can correct/retry it.
- If our AI improves later, previously saved content should be re-processable.
- An item with no useful extraction is not a failed save.

## 14. UX philosophy
- Clean surface, complicated engine.
- Simple by default; give users control when they want it.
- Do not overwhelm users with folders, tags, dashboards, gamification, AI jargon, or unnecessary settings.
- AI should work quietly in the background instead of constantly announcing itself.
- The user should feel like they are maintaining a personal memory/library, not operating an AI data-management system.

## 15. What V1 explicitly does NOT try to be
- Not a generic AI chatbot.
- Not a competitor to ChatGPT's broad internet research ability.
- Not a social network.
- Not a universal bookmark manager for every website.
- Not a giant productivity dashboard.
- Not a mandatory folder/list management system.
- Not a system that replaces the original Reel/video with an AI summary.

## 16. Product differentiation / strategic focus
- Our initial niche is the Instagram + YouTube save/memory workflow.
- The goal is not to copy SaveToList or beat every adjacent app feature-for-feature.
- The strategic idea is to become exceptionally good at one narrow workflow: saving, understanding, remembering, and retrieving Instagram/YouTube content.
- Our advantage is persistent personal context: 'What did I save and what was inside it?' rather than simply 'What does this video say?'

## 17. Core V1 pipeline
- Instagram / YouTube → capture → secure source → immediate save confirmation → asynchronous multimodal analysis → evidence fusion → validation → structured understanding → store understanding → searchable library → revisit in two-pane view.
- Low-information content follows the same pipeline but may receive lightweight understanding instead of deep extraction.

## 18. V1 feature checklist
- Instagram connection/input.
- YouTube connection/input.
- Immediate save and source record.
- Background processing queue.
- Multimodal analysis: video/visuals + audio/transcript + OCR/text + metadata.
- Evidence-aware extraction with conflict handling.
- Structured, content-specific extraction.
- Persistent extraction stored with each saved item.
- Original Reel/video view.
- Two-pane original + extraction view.
- Unified search across Instagram and YouTube.
- Search across both source content and extracted information.
- All / Instagram / YouTube filtering.
- Manual 'Understand' / re-analysis control.
- Edit/correct extraction.
- Delete extraction while keeping the source.
- Failure/retry handling.
- Clean library/home view with recently saved items.

## V1 north-star statement
> The product remembers the things the user chose to keep; AI makes those memories understandable and searchable without getting in the user's way.