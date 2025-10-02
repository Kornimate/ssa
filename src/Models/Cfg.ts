import { BlockId } from "./BlockId";
import { BasicBlock } from "./BasicBlock";

export interface CFG {
  entry: BasicBlock;
  exit: BasicBlock;
}