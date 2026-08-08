# CivicForge 2.0 Product Specification / 产品说明

## Mission / 产品使命

CivicForge helps a working civil-service candidate turn reading and writing into reusable essay ability. It is not a question bank. Its core loop is:

CivicForge 帮助在职备考者把阅读与作答转化为可复用的申论能力。它不是题库，核心闭环是：

```text
训练 -> 反馈与修改 -> 提取知识卡 -> 主动复习 -> 在下一次作答中调用
Practice -> Feedback and revision -> Knowledge cards -> Recall -> Reuse
```

## Primary Workspaces / 一级工作区

1. **今天 Today**：根据到期复习、未完成训练、待复盘作答和资料收件箱组织 15/30/60 分钟计划。
2. **训练 Practice**：完成阅读材料、提纲、正式作答、复盘修改四阶段训练，并保留初稿、修改稿和反馈。
3. **素材 Library**：管理资料收件箱、可追溯知识卡和旧版成品素材；知识卡需通过质量验证。
4. **复习 Review**：提供要点回忆、表达复述、案例调用、位置调用、微型作答五种模式。
5. **进度 Progress**：展示训练完成、真实调用、弱项复习、主题覆盖与历史改写记录，并可回到具体任务。

## Quality Rules / 素材质量规则

A usable knowledge card requires a clear title, complete content, topic, applicable question type, and traceable source. Rule-generated or future AI-generated content starts as unverified and cannot enter review automatically.

可使用知识卡必须具备明确标题、完整正文、主题、适用题型和可追溯来源。规则或未来 AI 生成内容默认未验证，不能自动进入复习。

Quality is reinforced by real usage: inserting a verified card into an answer creates a usage record linked to the exact attempt.

质量还要由真实调用验证：将已验证卡片插入作答时，会记录对应练习、用途和时间。

## Desktop Principles / 桌面端原则

- Keyboard-friendly, low-input, one primary scroll area, and usable at a 720px window width.
- Calm light/dark visual system with reduced-motion support.
- Local data by default; external model and MCP providers remain optional future extensions.
- Windows widget shows only the next task, daily card, and quick capture instead of loading the full library.

## Out Of Scope / 明确不做

- Account system, cloud sync, collaboration, plugin marketplace.
- Self-built large question bank, wrong-answer system, or full exam simulation.
- Automatic publication of model-generated material without human verification.
- Obsidian-style graph as a primary workflow; related knowledge is shown contextually on each card.
