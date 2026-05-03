import type { App } from "obsidian";

export interface SecretStore {
  isAvailable(): boolean;
  setSecret(secretRef: string, value: string): void;
  getSecret(secretRef: string): string | null;
}

export interface SecretStorageDiagnostics {
  available: boolean;
  hasSecretStorage: boolean;
  secretStorageType: string;
  secretStorageConstructorName: string;
  getSecretType: string;
  setSecretType: string;
  ownKeys: string[];
  reason: string;
}

const SECRET_ID_PATTERN = /^[a-z0-9-]+$/;

export class ObsidianSecretStore implements SecretStore {
  constructor(private readonly app: App) {}

  isAvailable(): boolean {
    return this.getDiagnostics().available;
  }

  getDiagnostics(): SecretStorageDiagnostics {
    const maybeSecretStorage = (this.app as unknown as {
      secretStorage?: {
        getSecret?: (id: string) => string | null;
        setSecret?: (id: string, secret: string) => void;
      };
    }).secretStorage;
    const hasSecretStorage = maybeSecretStorage !== undefined && maybeSecretStorage !== null;
    const getSecretType = typeof maybeSecretStorage?.getSecret;
    const setSecretType = typeof maybeSecretStorage?.setSecret;
    const available = getSecretType === "function" && setSecretType === "function";

    return {
      available,
      hasSecretStorage,
      secretStorageType: maybeSecretStorage === null ? "null" : typeof maybeSecretStorage,
      secretStorageConstructorName: hasSecretStorage
        ? (maybeSecretStorage as { constructor?: { name?: string } }).constructor?.name ?? "unknown"
        : "n/a",
      getSecretType,
      setSecretType,
      ownKeys: hasSecretStorage ? Object.keys(maybeSecretStorage as object) : [],
      reason: available
        ? "secretStorage.getSecret/setSecret are both available."
        : "secretStorage is missing, or getSecret/setSecret is not exposed as functions.",
    };
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
