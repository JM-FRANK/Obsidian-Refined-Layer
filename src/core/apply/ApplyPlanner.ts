import type { UserDecision, UserDecisionV2 } from "../review/UserDecision";
import type { ProposalSession, ProposalSessionV2 } from "../../runtime/ProposalSession";
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

  buildPlanV2(session: ProposalSessionV2, decision: UserDecisionV2): ApplyPlan {
    const operations: ApplyPlan["operations"] = [];
    const acceptedBlockIds = new Set(
      Object.entries(decision.acceptBlocks)
        .filter(([, accepted]) => accepted)
        .map(([id]) => id),
    );
    const configById = new Map(session.blockConfigSnapshot.aBlocks.map((block) => [block.id, block]));
    const acceptedBlocks = session.proposal.blocks
      .filter((block) => acceptedBlockIds.has(block.id))
      .map((block) => {
        const config = configById.get(block.id);
        return {
          id: block.id,
          heading: config?.heading ?? block.id,
          headingLevel: config?.headingLevel ?? 2,
          content: block.content,
        };
      });

    if (acceptedBlocks.length > 0) {
      operations.push({
        type: "replace-refined-blocks",
        targetPath: session.notePath,
        blocks: acceptedBlocks,
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

    const selectedTags = new Set(session.proposal.tagSuggestion?.selectedTags ?? []);
    const whitelist = new Set(session.blockConfigSnapshot.tagWhitelist);
    const tags = decision.acceptTags.add.filter((tag) => selectedTags.has(tag) && whitelist.has(tag));

    if (tags.length > 0) {
      operations.push({
        type: "append-tags",
        targetPath: session.notePath,
        tags: [...new Set(tags)],
      });
    }

    return {
      notePath: session.notePath,
      sessionId: session.id,
      operations,
    };
  }
}
