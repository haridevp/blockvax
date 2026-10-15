const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("---------------------------------------------------------");
  console.log("Deploying BlockVax smart contract to network:", hre.network.name);
  console.log("---------------------------------------------------------");

  const [deployer, manufacturer, coldStorage, transporter, hospital] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  const BlockVax = await hre.ethers.getContractFactory("BlockVax");
  const blockVax = await BlockVax.deploy();

  await blockVax.waitForDeployment();
  const contractAddress = await blockVax.getAddress();

  console.log("\n>>> BlockVax deployed successfully at:", contractAddress);

  // If running on local Hardhat node or test network, assign demo roles to test accounts
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\nConfiguring mock roles for local development accounts...");
    
    // Roles: NONE=0, ADMIN=1, MANUFACTURER=2, COLD_STORAGE=3, TRANSPORTER=4, DISTRIBUTOR=5, HOSPITAL=6
    if (manufacturer) {
      await blockVax.assignRole(manufacturer.address, 2); // MANUFACTURER
      console.log(`- Assigned MANUFACTURER to: ${manufacturer.address}`);
    }
    if (coldStorage) {
      await blockVax.assignRole(coldStorage.address, 3); // COLD_STORAGE
      console.log(`- Assigned COLD_STORAGE to: ${coldStorage.address}`);
    }
    if (transporter) {
      await blockVax.assignRole(transporter.address, 4); // TRANSPORTER
      console.log(`- Assigned TRANSPORTER to: ${transporter.address}`);
    }
    if (hospital) {
      await blockVax.assignRole(hospital.address, 6); // HOSPITAL
      console.log(`- Assigned HOSPITAL to: ${hospital.address}`);
    }
  }

  // Export contract address to frontend directory
  const frontendDir = path.join(__dirname, "..", "frontend", "src");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const deploymentData = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: contractAddress,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(frontendDir, "contractAddress.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("Contract deployment info saved to frontend/src/contractAddress.json");

  // Also copy compiled artifact ABI to frontend/src/abi/BlockVax.json if available
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "BlockVax.sol", "BlockVax.json");
  const frontendAbiDir = path.join(frontendDir, "abi");
  if (fs.existsSync(artifactPath)) {
    if (!fs.existsSync(frontendAbiDir)) {
      fs.mkdirSync(frontendAbiDir, { recursive: true });
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(frontendAbiDir, "BlockVax.json"),
      JSON.stringify(artifact.abi, null, 2)
    );
    console.log("ABI copied to frontend/src/abi/BlockVax.json");
  }

  console.log("---------------------------------------------------------");
  console.log("Deployment complete!");
  console.log("---------------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
