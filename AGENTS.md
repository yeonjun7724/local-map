# 프로젝트 작업 규칙

- 사용자는 작업을 마칠 때마다 검증 후 커밋하고 GitHub에 푸시하도록 상시 승인했다.
- 작업 완료 시 변경 사항을 확인하고 필요한 검사를 수행한 뒤, 해당 작업을 커밋하고 현재 브랜치를 원격 저장소에 푸시한다. 매번 승인을 다시 요청하지 않는다.
- 이 승인은 `raw/AGENT.md`의 일반적인 `git push` 사전 승인 규칙에 우선한다. 강제 푸시나 기존 커밋 이력 재작성은 포함하지 않는다.
- 검사·커밋·푸시가 실패하면 원인을 해결하고, 해결할 수 없으면 실제 상태와 원인을 보고한다. 완료 보고에 커밋 해시와 푸시 결과를 포함한다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
