import type { ABlockConfig, BBlockConfig } from "./BlockConfig";

export interface BlockConfigValidationError {
  code: string;
  blockId: string;
  message: string;
}

export interface BlockConfigValidationResult {
  ok: boolean;
  errors: BlockConfigValidationError[];
}

export class BlockConfigValidator {
  validate(
    aBlocks: ABlockConfig[],
    bBlock: BBlockConfig,
    protectH1: boolean,
  ): BlockConfigValidationResult {
    const errors: BlockConfigValidationError[] = [];
    const minLevel = protectH1 ? 2 : 1;

    // Validate A blocks
    const seenIds = new Set<string>();
    for (const block of aBlocks) {
      if (seenIds.has(block.id)) {
        errors.push({
          code: "duplicate-a-block-id",
          blockId: block.id,
          message: `Duplicate A block id: ${block.id}`,
        });
      }
      seenIds.add(block.id);

      if (block.headingLevel < 1 || block.headingLevel > 6) {
        errors.push({
          code: "invalid-heading-level",
          blockId: block.id,
          message: `A block "${block.name}" (${block.id}) has invalid headingLevel=${block.headingLevel}.`,
        });
      } else if (block.headingLevel < minLevel) {
        errors.push({
          code: "a-block-heading-level-too-low",
          blockId: block.id,
          message: `A block "${block.name}" (${block.id}) headingLevel=${block.headingLevel} is below minimum ${minLevel} (protectH1=${protectH1}).`,
        });
      }
    }

    if (aBlocks.length === 0) {
      errors.push({
        code: "no-a-blocks",
        blockId: "(workflow)",
        message: "At least one A block is required.",
      });
    }

    // Validate B block
    if (bBlock.headingLevel < 1 || bBlock.headingLevel > 6) {
      errors.push({
        code: "invalid-heading-level",
        blockId: bBlock.id,
        message: `B block "${bBlock.name}" has invalid headingLevel=${bBlock.headingLevel}.`,
      });
    } else if (bBlock.headingLevel < minLevel) {
      errors.push({
        code: "b-block-heading-level-too-low",
        blockId: bBlock.id,
        message: `B block "${bBlock.name}" headingLevel=${bBlock.headingLevel} is below minimum ${minLevel} (protectH1=${protectH1}).`,
      });
    }

    return {
      ok: errors.length === 0,
      errors,
    };
  }
}
