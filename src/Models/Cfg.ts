import { BlockId } from "./BlockId";
import { Block } from "./BasicBlock";

export interface CFG {
  entry: BlockId;
  exit: BlockId;
  blocks: Map<BlockId, Block>;
}