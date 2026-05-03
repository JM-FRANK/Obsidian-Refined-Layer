import { ApplyPlanner } from "../core/apply/ApplyPlanner";
import type { ApplyPlan } from "../core/apply/ApplyPlan";
import { BodyAssembler } from "../core/apply/BodyAssembler";
import { PolicyGuard } from "../core/policy/PolicyGuard";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import type { UserDecision } from "../core/review/UserDecision";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
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

  constructor(
    profile: WorkflowProfile,
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteFilePort: NoteFilePort,
  ) {
    this.policyGuard = new PolicyGuard(profile);
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
      const assembled = this.bodyAssembler.assemble(session, note.content);
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
}
