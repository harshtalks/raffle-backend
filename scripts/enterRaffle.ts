import { ethers, getNamedAccounts } from "hardhat";

async function enterRaffle() {
  const { deployer } = await getNamedAccounts();
  const raffle = await ethers.getContract("Raffle", deployer);
  const entranceFee = await raffle.getEntranceFee();
  await raffle.enterRaffle({ value: entranceFee + 1 });
  console.log("Entered!");
}

enterRaffle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
