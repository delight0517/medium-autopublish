# Installing the `medium-autopublish` skill

Claude Code loads skills from two locations:

- **User-level** — `~/.claude/skills/<skill-name>/` — available in every project.
- **Project-level** — `<project>/.claude/skills/<skill-name>/` — that project only.

A skill is a directory with a `SKILL.md` containing YAML frontmatter (`name`,
`description`). Claude Code discovers it automatically — no registration step.

## User-level (recommended)

```bash
git clone https://github.com/delight0517/medium-autopublish \
  ~/.claude/skills/medium-autopublish
git -C ~/.claude/skills/medium-autopublish pull   # update later
```

## Project-level

```bash
cd <your-project>
git clone https://github.com/delight0517/medium-autopublish \
  .claude/skills/medium-autopublish
```

## Git submodule (version-pinned, updatable)

```bash
git submodule add https://github.com/delight0517/medium-autopublish \
  .claude/skills/medium-autopublish
git commit -m "Add medium-autopublish skill as submodule"
```

Teammates run `git submodule update --init` after cloning.

## Verify

1. Start a Claude Code session.
2. Ask `what skills are available?` — the skill should be listed by name.
3. Or trigger it directly with one of its trigger phrases.

If undetected, check the path is exactly
`.../.claude/skills/medium-autopublish/SKILL.md` and the frontmatter block is intact
(starts and ends with `---`).

## 한국어

`~/.claude/skills/<이름>/` 또는 `<프로젝트>/.claude/skills/<이름>/`에 `SKILL.md`가
있는 디렉토리를 두면 Claude Code가 자동 인식합니다. 별도 등록 과정 없음.
확인: 세션에서 "사용 가능한 스킬 알려줘" 또는 트리거 문구로 호출.
