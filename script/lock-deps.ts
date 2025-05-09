import fs from "node:fs";
import path from "node:path";

// 递归查找所有 package.json 文件
function findPackageJsonFiles(dir, found: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue; // 跳过依赖目录
      findPackageJsonFiles(fullPath, found);
    } else if (entry.name === "package.json") {
      found.push(fullPath);
    }
  }

  return found;
}

// 移除 ^、~ 等符号
function lockVersions(pkg) {
  const fields = ["dependencies", "devDependencies", "peerDependencies"];

  for (const field of fields) {
    if (!pkg[field]) continue;

    for (const dep in pkg[field]) {
      pkg[field][dep] = pkg[field][dep].replace(/^[~^]/, "");
    }
  }

  return pkg;
}

// 主执行函数
function run() {
  const files = findPackageJsonFiles(process.cwd());

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const json = JSON.parse(content);

    const updated = lockVersions(json);
    fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf-8");

    console.log(`🔒 Locked versions in: ${file}`);
  }
}

run();
