import { ethers, artifacts, network } from "hardhat";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  if (!["localhost", "sepolia"].includes(network.name)) throw new Error("Select localhost or sepolia");
  const registry = await ethers.deployContract("ThreatReportRegistry");
  await registry.waitForDeployment();
  const receipt = await registry.deploymentTransaction()!.wait();
  const { abi } = await artifacts.readArtifact("ThreatReportRegistry");
  const address = await registry.getAddress();
  const directory = resolve(__dirname, "../deployments");
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, network.name + ".json");
  const temporary = path + "." + process.pid + ".tmp";
  const manifest = { address, abi, blockNumber: receipt!.blockNumber,
                     chainId: Number((await ethers.provider.getNetwork()).chainId) };
  await writeFile(temporary, JSON.stringify(manifest, null, 2) + "\n");
  await rename(temporary, path);
  console.log(network.name + " registry " + address);
}
main().catch(() => { console.error("Registry deployment failed."); process.exitCode = 1; });
