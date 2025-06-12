const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying VotingSystem contract to Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Low balance! You might need more Sepolia ETH from a faucet.");
    console.log("🔗 Get Sepolia ETH: https://sepoliafaucet.com/");
  }

  // Deploy the contract
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  
  console.log("⏳ Deploying contract...");
  const votingSystem = await VotingSystem.deploy();
  
  // Wait for deployment
  console.log("⏳ Waiting for deployment confirmation...");
  await votingSystem.waitForDeployment();
  
  const contractAddress = await votingSystem.getAddress();
  const deploymentTx = votingSystem.deploymentTransaction();
  
  console.log("\n✅ VotingSystem deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🔗 Transaction hash:", deploymentTx.hash);
  console.log("👤 Owner address:", deployer.address);
  console.log("🌐 View on Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("🔍 Transaction on Etherscan:", `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`);
  
  // Verify initial state
  console.log("\n⏳ Verifying initial contract state...");
  const owner = await votingSystem.owner();
  const electionState = await votingSystem.electionState();
  const candidateCount = await votingSystem.candidateCount();
  const totalVotes = await votingSystem.totalVotes();
  
  console.log("\n📊 Initial Contract State:");
  console.log("├── Owner:", owner);
  console.log("├── Election State:", electionState.toString(), "(0=NotStarted, 1=Active, 2=Ended)");
  console.log("├── Candidate Count:", candidateCount.toString());
  console.log("└── Total Votes:", totalVotes.toString());

  // Calculate deployment cost
  const receipt = await deploymentTx.wait();
  const gasUsed = receipt.gasUsed;
  const gasPrice = deploymentTx.gasPrice;
  const deploymentCost = gasUsed * gasPrice;
  
  console.log("\n💸 Deployment Cost:");
  console.log("├── Gas Used:", gasUsed.toString());
  console.log("├── Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("└── Total Cost:", ethers.formatEther(deploymentCost), "ETH");

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contractAddress: contractAddress,
    deployer: deployer.address,
    owner: owner,
    deploymentTime: new Date().toISOString(),
    transactionHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: gasUsed.toString(),
    gasPrice: gasPrice.toString(),
    deploymentCost: ethers.formatEther(deploymentCost),
    etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
    transactionUrl: `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`
  };

  const fs = require('fs');
  const path = require('path');
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Save deployment info with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sepolia-deployment-${timestamp}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(path.join(deploymentsDir, 'latest-sepolia.json'), JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to:");
  console.log("├── Timestamped file:", filepath);
  console.log("└── Latest file: deployments/latest-sepolia.json");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify your contract (optional):");
  console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
  console.log("2. Register candidates:");
  console.log("   Use scripts/interact.js or hardhat console");
  console.log("3. Start building your frontend!");
  
  console.log("\n🔧 Quick interaction commands:");
  console.log("- Open console: npx hardhat console --network sepolia");
  console.log("- Run interaction script: npx hardhat run scripts/interact.js --network sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });