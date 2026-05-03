import type { App } from "obsidian";

export interface SecretStore {
  isAvailable(): boolean;
  setSecret(secretRef: string, value: string): void;
  getSecret(secretRef: string): string | null;
}

const SECRET_ID_PATTERN = /^[a-z0-9-]+$/;

export class ObsidianSecretStore implements SecretStore {
  constructor(private readonly app: App) {}

  isAvailable(): boolean {
    const maybeSecretStorage = (this.app as unknown as {
      secretStorage?: {
        getSecret?: (id: string) => string | null;
        setSecret?: (id: string, secret: string) => void;
      };
    }).secretStorage;

    return typeof maybeSecretStorage?.getSecret === "function"
      && typeof maybeSecretStorage?.setSecret === "function";
  }

  setSecret(secretRef: string, value: string): void {
    this.ensureAvailable();
    this.ensureValidSecretRef(secretRef);
    if (!value.trim()) {
      throw new Error("API key value cannot be empty.");
    }

    this.app.secretStorage.setSecret(secretRef, value);
  }

  getSecret(secretRef: string): string | null {
    this.ensureAvailable();
    this.ensureValidSecretRef(secretRef);
    return this.app.secretStorage.getSecret(secretRef);
  }

  private ensureAvailable(): void {
    if (!this.isAvailable()) {
      throw new Error("Secure secret storage is unavailable in this Obsidian environment.");
    }
  }

  private ensureValidSecretRef(secretRef: string): void {
    if (!SECRET_ID_PATTERN.test(secretRef)) {
      throw new Error("Secret reference must use lowercase letters, numbers, and dashes only.");
    }
  }
}
