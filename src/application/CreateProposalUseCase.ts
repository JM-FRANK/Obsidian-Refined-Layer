import type { LlmProvider } from "../adapters/llm/LlmProvider";
import { parseFrontmatter } from "../core/profile/FrontmatterParser";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import { ProposalValidator } from "../core/proposal/ProposalValidator";
import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { ProposalSession } from "../runtime/ProposalSession";
import { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import { toSafeErrorMessage } from "../runtime/redaction";
import { TokenUsageReporter } from "../runtime/TokenUsageReporter";
import type { ActiveNoteRepository } from "./CheckEligibilityUseCase";
import { CheckEligibilityUseCase, type CheckEligibilityResult } from "./CheckEligibilityUseCase";

export type CreateProposalResult =
  | {
      kind: "eligibility-failed";
      eligibility: CheckEligibilityResult;
    }
  | {
      kind: "provider-failed";
      message: string;
    }
  | {
      kind: "validation-failed";
      errors: Array<{
        layer: "json" | "schema" | "policy" | "content";
        code: string;
        message: string;
      }>;
    }
  | {
      kind: "created";
      session: ProposalSession;
    };

interface PromptOverride {
  enabled: boolean;
  systemPrompt?: string;
  userPrompt?: string;
}

export class CreateProposalUseCase {
  private readonly eligibilityUseCase: CheckEligibilityUseCase;
  private readonly proposalValidator: ProposalValidator;
  private readonly protectedRegionExtractor: ProtectedRegionExtractor;
  private readonly tokenUsageReporter = new TokenUsageReporter();

  constructor(
    private readonly noteRepository: ActiveNoteRepository,
    private readonly profile: WorkflowProfile,
    private readonly llmProvider: LlmProvider,
    private readonly sessionStore: ProposalSessionStore,
    private readonly promptOverride?: PromptOverride,
  ) {
    this.eligibilityUseCase = new CheckEligibilityUseCase(noteRepository, profile);
    this.proposalValidator = new ProposalValidator(profile);
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
  }

  async execute(): Promise<CreateProposalResult> {
    const activeNote = await this.eligibilityUseCase.execute();

    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      return {
        kind: "eligibility-failed",
        eligibility: activeNote,
      };
    }

    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      return {
        kind: "eligibility-failed",
        eligibility: activeNote,
      };
    }

    const protectedRegionResult = this.protectedRegionExtractor.extract(
      lookup.note.content,
      this.profile.protectedRegions.definitions[0],
    );

    if (!protectedRegionResult.ok) {
      return {
        kind: "validation-failed",
        errors: [
          {
            layer: "content",
            code: protectedRegionResult.error.code,
            message: protectedRegionResult.error.message,
          },
        ],
      };
    }

    const systemPrompt = renderPromptTemplate(
      this.promptOverride?.enabled && this.promptOverride.systemPrompt
        ? this.promptOverride.systemPrompt
        : this.profile.prompt.systemPrompt,
      lookup.note,
    );
    const userPrompt = renderPromptTemplate(
      this.promptOverride?.enabled && this.promptOverride.userPrompt
        ? this.promptOverride.userPrompt
        : this.profile.prompt.userPrompt,
      lookup.note,
    );

    let llmResponse;
    try {
      llmResponse = await this.llmProvider.generateProposal({
        workflowProfileId: "raw-refined",
        notePath: lookup.note.path,
        noteTitle: lookup.note.title,
        noteContent: lookup.note.content,
        systemPrompt,
        userPrompt,
        promptVariables: {
          notePath: lookup.note.path,
          noteTitle: lookup.note.title,
          noteContent: lookup.note.content,
        },
      });
    } catch (error) {
      return {
        kind: "provider-failed",
        message: toSafeErrorMessage(error),
      };
    }

    const validation = this.proposalValidator.validateModelOutput(llmResponse.rawText, {
      protectedRegionText: protectedRegionResult.region.text,
    });

    if (!validation.ok) {
      return {
        kind: "validation-failed",
        errors: validation.errors,
      };
    }

    const parsedFrontmatter = parseFrontmatter(lookup.note.content);
    const now = new Date().toISOString();
    const session: ProposalSession = {
      id: createSessionId(),
      workflowProfileId: "raw-refined",
      policySnapshotId: `${this.profile.id}:${this.profile.version}`,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      createdAt: now,
      updatedAt: now,
      baseFileHash: hashText(lookup.note.content),
      ...(parsedFrontmatter.hasFrontmatter
        ? { baseFrontmatterHash: hashText(JSON.stringify(parsedFrontmatter.frontmatter)) }
        : {}),
      baseProtectedRegionHash: hashText(protectedRegionResult.region.text),
      proposal: validation.proposal,
      tokenUsage: this.tokenUsageReporter.resolveUsage({
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        inputText: `${systemPrompt}\n${userPrompt}`,
        outputText: llmResponse.rawText,
        providerUsage: llmResponse.usage,
      }),
      status: "generated",
    };

    await this.sessionStore.save(session);

    return {
      kind: "created",
      session,
    };
  }
}

function createSessionId(): string {
  return `proposal-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderPromptTemplate(
  template: string,
  note: {
    path: string;
    title: string;
    content: string;
  },
): string {
  return template
    .split("{{notePath}}").join(note.path)
    .split("{{noteTitle}}").join(note.title)
    .split("{{noteContent}}").join(note.content);
}
