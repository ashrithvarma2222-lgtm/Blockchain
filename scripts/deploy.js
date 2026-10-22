const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log("Deploying LostFoundRegistry Smart Contract...");
  console.log("==================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account Balance:", hre.ethers.formatEther(balance), "ETH");

  const LostFoundRegistry = await hre.ethers.getContractFactory("LostFoundRegistry");
  const registry = await LostFoundRegistry.deploy();

  await registry.waitForDeployment();
  const contractAddress = await registry.getAddress();

  console.log("--------------------------------------------------");
  console.log("LostFoundRegistry successfully deployed!");
  console.log("Contract Address:", contractAddress);
  console.log("Deployment Network:", hre.network.name);
  console.log("==================================================");

  // Write deployment info to a JSON file for frontend and records
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const deployOutPath = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(deployOutPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Saved deployment details to:", deployOutPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
