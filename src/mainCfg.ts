import { parse } from "@babel/parser";
import { buildCFG } from "./cfgTransform";
import { cfgToObject, cfgToDot } from "./services/VisualizationTraversals";
import fs from "fs";
import path from "path";

export function useCfg(fileName: string = "input") {
  const filePath = path.resolve(`./tests-materials/input/${fileName}.ts`);
  const ast = parse(fs.readFileSync(filePath, "utf-8"), {
    sourceType: "module",
    plugins: ["typescript"],
  });

  const cfg = buildCFG(ast.program);

  const graphFilePath = path.resolve(`./tests-materials/output/graph.dot`);

  fs.writeFileSync(graphFilePath, cfgToDot(cfg), "utf-8");

  const jsonFilePath = path.resolve(
    `./tests-materials/output/${fileName}.json`
  );

  fs.writeFileSync(
    jsonFilePath,
    JSON.stringify(cfgToObject(cfg), null, 2),
    "utf-8"
  );
}

useCfg();
