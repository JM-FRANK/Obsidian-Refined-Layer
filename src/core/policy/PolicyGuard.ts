import type { WorkflowProfile } from "../profile/WorkflowProfile";

export class PolicyGuard {
  constructor(private readonly profile: WorkflowProfile) {}

  guardRequest<TRequest>(request: TRequest): TRequest {
    void this.profile;

    return request;
  }
}
