import type { UserDecision } from "../review/UserDecision";
import type { ProposalSession } from "../../runtime/ProposalSession";
import type { ApplyPlan } from "./ApplyPlan";

export class ApplyPlanner {
  buildPlan(session: ProposalSession, decision: UserDecision, body?: string): ApplyPlan {
    const operations: ApplyPlan["operations"] = [];

    if (decision.acceptBody && body) {
      operations.push({
        type: "replace-refined-body",
        targetPath: session.notePath,
        body,
      });
    }

    const frontmatterChanges = {
      ...(decision.acceptFrontmatter.status && session.proposal.frontmatterSuggestion?.status
        ? { status: session.proposal.frontmatterSuggestion.status }
        : {}),
      ...(decision.acceptFrontmatter.source && session.proposal.frontmatterSuggestion?.source
        ? { source: session.proposal.frontmatterSuggestion.source }
        : {}),
      ...(decision.acceptFrontmatter.context && session.proposal.frontmatterSuggestion?.context
        ? { context: session.proposal.frontmatterSuggestion.context }
        : {}),
    };

    if (Object.keys(frontmatterChanges).length > 0) {
      operations.push({
        type: "update-frontmatter",
        targetPath: session.notePath,
        changes: frontmatterChanges,
      });
    }

    const add = (decision.acceptTags.add ?? []).filter((tag) => session.proposal.tagSuggestion?.add?.includes(tag));
    const remove = (decision.acceptTags.remove ?? []).filter((tag) => session.proposal.tagSuggestion?.remove?.includes(tag));

    if (add.length > 0 || remove.length > 0) {
      operations.push({
        type: "update-tags",
        targetPath: session.notePath,
        add,
        remove,
      });
    }

    return {
      notePath: session.notePath,
      sessionId: session.id,
      operations,
    };
  }
}
