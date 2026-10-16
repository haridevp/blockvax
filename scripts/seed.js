const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, manufacturer, coldStorage, transporter, hospital] = await hre.ethers.getSigners();
  console.log("Seeding batches using deployer:", deployer.address);

  const addressPath = path.join(__dirname, "..", "frontend", "src", "contractAddress.json");
  if (!fs.existsSync(addressPath)) {
    console.error("contractAddress.json not found.");
    return;
  }
  const { contractAddress } = JSON.parse(fs.readFileSync(addressPath, "utf8"));
  const BlockVax = await hre.ethers.getContractFactory("BlockVax");
  const contract = BlockVax.attach(contractAddress);

  const batchId = "VAX-COV-2026-001";
  const exists = await contract.batchExists(batchId);
  if (!exists) {
    console.log("Registering initial batch:", batchId);
    const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const tx = await contract.registerBatch(
      batchId,
      "Pfizer-BioNTech COVID-19",
      futureExpiry,
      20,
      80
    );
    await tx.wait();
    console.log("Batch VAX-COV-2026-001 registered successfully on-chain!");
  } else {
    console.log("Batch already exists:", batchId);
  }
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exitCode = 1;
});
