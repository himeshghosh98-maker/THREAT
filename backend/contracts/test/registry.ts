import { expect } from "chai";
import { ethers } from "hardhat";

describe("ThreatReportRegistry", () => {
  const first = ethers.id("report one");
  const second = ethers.id("report two");
  async function fixture() {
    const [owner, reporter, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("ThreatReportRegistry");
    await registry.waitForDeployment();
    const submit = () => registry.connect(reporter).getFunction("submitReport")(first, "suspicious");
    return { registry, owner, reporter, stranger, submit };
  }
  async function timestamp(tx: any) {
    const mined = await tx.wait();
    return (await ethers.provider.getBlock(mined.blockNumber))!.timestamp;
  }
  it("stores the reporter, hash, category, status and timestamps the submission event", async () => {
    const { registry, reporter, submit } = await fixture();
    expect(await registry.connect(reporter).getFunction("submitReport").staticCall(first, "suspicious")).to.equal(0);
    const tx = await submit();
    const time = await timestamp(tx);
    await expect(tx).to.emit(registry, "ReportSubmitted").withArgs(0, first, reporter.address, "suspicious", time);
    expect(await registry.getReportCount()).to.equal(1);
    expect(Array.from(await registry.getReport(0))).to.deep.equal([first, reporter.address, BigInt(time), "suspicious", 0n, 0n]);
  });
  it("lets the reporter and owner update status and revise with ordered events", async () => {
    const { registry, reporter, submit } = await fixture();
    await submit();
    const tx = await registry.connect(reporter).getFunction("updateStatus")(0, 1);
    await expect(tx).to.emit(registry, "StatusUpdated").withArgs(0, 1, await timestamp(tx));
    await registry.updateStatus(0, 2);
    expect((await registry.getReport(0)).status).to.equal(2);
    const revise = await registry.reviseReport(0, second);
    await expect(revise).to.emit(registry, "ReportRevised").withArgs(0, first, second, await timestamp(revise));
    const report = await registry.getReport(0);
    expect([report.reportHash, report.status, report.revision]).to.deep.equal([second, 3n, 1n]);
  });
  it("rejects unauthorized updates and revisions", async () => {
    const { registry, submit, stranger } = await fixture();
    await submit();
    const other = registry.connect(stranger);
    await expect(other.getFunction("updateStatus")(0, 1)).to.be.revertedWith("not authorized");
    await expect(other.getFunction("reviseReport")(0, second)).to.be.revertedWith("not authorized");
  });
  it("rejects duplicate current and historical hashes", async () => {
    const { registry, submit } = await fixture();
    await submit();
    await expect(submit()).to.be.revertedWith("duplicate hash");
    await registry.reviseReport(0, second);
    await expect(submit()).to.be.revertedWith("duplicate hash");
    await expect(registry.reviseReport(0, first)).to.be.revertedWith("duplicate hash");
    await expect(registry.submitReport(second, "suspicious")).to.be.revertedWith("duplicate hash");
  });
  it("rejects invalid IDs, empty hashes and arbitrary category strings", async () => {
    const { registry } = await fixture();
    await expect(registry.getReport(0)).to.be.revertedWith("invalid id");
    await expect(registry.updateStatus(0, 2)).to.be.revertedWith("invalid id");
    await expect(registry.reviseReport(0, first)).to.be.revertedWith("invalid id");
    await expect(registry.submitReport(ethers.ZeroHash, "suspicious")).to.be.revertedWith("empty hash");
    await expect(registry.submitReport(first, "https://example.org")).to.be.revertedWith("invalid category");
  });
});
