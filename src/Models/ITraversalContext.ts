import { ICFG } from "./ICfg";
import { ITraversalContextNode } from "./ITraversalContextNode";

export interface ITraversalContext{
      cfg: ICFG;
      contexts: ITraversalContextNode[];

      current(this: ITraversalContext): ITraversalContextNode | undefined;
}