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
  configuredKeyIdPresent: boolean;
  canReadConfiguredKey: boolean;
  readValueEqualsKeyId: boolean;
  readValueLength: number | null;
  readValuePrefix: string;
  readValueSuffix: string;
}

const SECRET_ID_PATTERN = /^[a-z0-9-]+$/;

export class ObsidianSecretStore implements SecretStore {
  constructor(private readonly app: App) {}

  isAvailable(): boolean {
    return this.getDiagnostics().available;
  }

  getDiagnostics(configuredKeyId?: string): SecretStorageDiagnostics {
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

    const keyId = configuredKeyId?.trim() ?? "";
    const configuredKeyIdPresent = keyId.length > 0;
    let canReadConfiguredKey = false;
    let readValueEqualsKeyId = false;
    let readValueLength: number | null = null;
    let readValuePrefix = "(unavailable)";
    let readValueSuffix = "(unavailable)";

    if (available && configuredKeyIdPresent) {
      try {
        this.ensureValidSecretRef(keyId);
        const value = maybeSecretStorage!.getSecret!(keyId);
        if (value !== null && value !== undefined) {
          canReadConfiguredKey = true;
          readValueEqualsKeyId = value.trim() === keyId;
          readValueLength = value.length;
          readValuePrefix = redactFragment(value.slice(0, 4));
          readValueSuffix = redactFragment(value.slice(-4));
        } else {
          readValuePrefix = "(empty)";
          readValueSuffix = "(empty)";
        }
      } catch {
        readValuePrefix = "(read failed)";
        readValueSuffix = "(read failed)";
      }
    }

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
      configuredKeyIdPresent,
      canReadConfiguredKey,
      readValueEqualsKeyId,
      readValueLength,
      readValuePrefix,
      readValueSuffix,
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
      throw new Error("Key ID must use lowercase letters, numbers, and dashes only.");
    }
  }
}

function redactFragment(fragment: string): string {
  if (!fragment) return "(empty)";
  return `${fragment[0] ?? ""}${"*".repeat(Math.max(fragment.length - 1, 0))}`;
}
