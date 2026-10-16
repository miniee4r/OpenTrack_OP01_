---
trigger: always_on
description: Always use the last30days skill when researching topics, people, tools, news, and current trends.
---

# Always Use last30days Skill

For any user request involving researching a topic, library, framework, tool, person, company, news, sentiment, or recent changes:
1. Always load and follow the instructions in the `last30days` skill (`skills/last30days/SKILL.md`).
2. Run the research engine using the Python script (e.g. `python "$HOME/.agents/skills/last30days/scripts/last30days.py \"<topic>\""` or the local workspace skill scripts `skills/last30days/scripts/last30days.py`).
3. Ground answers in recent real-world sentiment, engagement, and facts from Reddit, Hacker News, Polymarket, GitHub, YouTube, X, and the web.
