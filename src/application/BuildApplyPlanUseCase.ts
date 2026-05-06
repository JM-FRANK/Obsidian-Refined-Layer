import { ApplyPlanner } from "../core/apply/ApplyPlanner";
import type { ApplyPlan } from "../core/apply/ApplyPlan";
import { BodyAssembler } from "../core/apply/BodyAssembler";
import { BlockExtractor } from "../core/markdown/BlockExtractor";
import { PolicyGuard } from "../core/policy/PolicyGuard";
import { ProposalValidator } from "../core/proposal/ProposalValidator";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import type { UserDecision, UserDecisionV2 } from "../core/review/UserDecision";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import type { SessionCacheV2Store } from "../runtime/SessionCacheV2Store";
import type { NoteFilePort } from "./ports/NoteFilePort";

export type BuildApplyPlanResult =
  | {
      ok: true;
      plan: ApplyPlan;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export class BuildApplyPlanUseCase {
  private readonly planner = new ApplyPlanner();
  private readonly bodyAssembler = new BodyAssembler();
  private readonly policyGuard: PolicyGuard;
  private readonly proposalValidator: ProposalValidator;
  private readonly protectedRegionExtractor = new ProtectedRegionExtractor();
  private readonly blockExtractor = new BlockExtractor();
  private readonly profile: WorkflowProfile;

  constructor(
    profile: WorkflowProfile,
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteFilePort: NoteFilePort,
    private readonly sessionCacheV2?: SessionCacheV2Store,
  ) {
    this.profile = profile;
    this.policyGuard = new PolicyGuard(profile);
    this.proposalValidator = new ProposalValidator(profile);
  }

  async execute(sessionId: string, decision: UserDecision): Promise<BuildApplyPlanResult> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return {
        ok: false,
        code: "missing-session",
        message: `Proposal session ${sessionId} was not found.`,
      };
    }

    const guardedDecision = this.policyGuard.guardRequest(decision);
    const note = await this.noteFilePort.readNoteByPath(session.notePath);
    if (!note) {
      return {
        ok: false,
        code: "missing-note",
        message: `Target note ${session.notePath} was not found.`,
      };
    }

    let body: string | undefined;
    if (guardedDecision.acceptBody) {
      const editedSections = guardedDecision.editedRefinedSections ?? session.proposal.refinedSections;
      const protectedRegion = this.protectedRegionExtractor.extract(
        note.content,
        this.profile.protectedRegions.definitions[0],
      );
      if (!protectedRegion.ok) {
        return {
          ok: false,
          code: protectedRegion.error.code,
          message: protectedRegion.error.message,
        };
      }
      const validation = this.proposalValidator.validateEditedRefinedSections(editedSections, {
        protectedRegionText: protectedRegion.region.text,
      });
      if (!validation.ok) {
        return {
          ok: false,
          code: validation.errors[0].code,
          message: validation.errors[0].message,
        };
      }

      const assembled = this.bodyAssembler.assemble(
        session,
        this.profile.protectedRegions.definitions[0],
        note.content,
        validation.refinedSections,
      );
      if (!assembled.ok) {
        return {
          ok: false,
          code: assembled.error.code,
          message: assembled.error.message,
        };
      }
      body = assembled.body;
    }

    return {
      ok: true,
      plan: this.planner.buildPlan(session, guardedDecision, body),
    };
  }

  async executeV2(sessionId: string, decision: UserDecisionV2): Promise<BuildApplyPlanResult> {
    const session = await this.findSessionV2(sessionId);
    if (!session) {
      return {
        ok: false,
        code: "missing-session",
        message: `Proposal session ${sessionId} was not found.`,
      };
    }

    const note = await this.noteFilePort.readNoteByPath(session.notePath);
    if (!note) {
      return {
        ok: false,
        code: "missing-note",
        message: `Target note ${session.notePath} was not found.`,
      };
    }

    const bBlock = this.blockExtractor.extract(note.content, session.blockConfigSnapshot.bBlock);
    if (!bBlock.ok) {
      return {
        ok: false,
        code: bBlock.error.code,
        message: bBlock.error.message,
      };
    }

    const acceptedBlockIds = new Set(
      Object.entries(decision.acceptBlocks)
        .filter(([, accepted]) => accepted)
        .map(([id]) => id),
    );

    for (const block of session.proposal.blocks) {
      if (!acceptedBlockIds.has(block.id)) continue;
      if (block.content.includes(bBlock.block.text)) {
        return {
          ok: false,
          code: "accepted-block-contains-b-block",
          message: `Accepted block ${block.id} contains protected B block content.`,
        };
      }
    }

    return {
      ok: true,
      plan: this.planner.buildPlanV2(session, decision),
    };
  }

  private async findSessionV2(sessionId: string) {
    const sessions = await this.sessionCacheV2?.loadAll();
    return sessions?.find((session) => session.id === sessionId) ?? null;
  }
}
