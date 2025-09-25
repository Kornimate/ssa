import { parse } from "@babel/parser";
import { buildCFG, cfgToObject, cfgToDot } from "./cfgTransform";
import fs from "fs";
import path from "path";

export function useCfg(fileName: string = "input") {

    const filePath = path.resolve(`./TestMaterial/Input/${fileName}.ts`);
  const ast = parse(fs.readFileSync(filePath, "utf-8"), {
    sourceType: "module",
    plugins: ["typescript"],
  });

  const cfg = buildCFG(ast.program);

  const graphFilePath = path.resolve(
    `./TestMaterial/Output/graph.dot`
  );

  fs.writeFileSync(graphFilePath, cfgToDot(cfg), "utf-8");

  const jsonFilePath = path.resolve(
    `./TestMaterial/Output/${fileName}.json`
  );

  fs.writeFileSync(
    jsonFilePath,
    JSON.stringify(cfgToObject(cfg), null, 2),
    "utf-8"
  );
}

useCfg();
