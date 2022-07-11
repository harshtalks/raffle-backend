import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkHelper } from "../network-hardha.config";
import verify from "../utils/verification";

const DeployRaffle = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();

  const { deploy, log } = deployments;
  const FUND = "1000000000000000000000";
  const chainId = network.config.chainId;

  let subId,
    VRFAddress,
    waitConfirmationTime = 0;

  if (chainId === 31337) {
    const mockChain = await ethers.getContract("VRFCoordinatorV2Mock");
    VRFAddress = mockChain.address;
    const transactionResponse = await mockChain.createSubscription();
    const transactionReceipt = await transactionResponse.wait();
    subId = transactionReceipt.events[0].args.subId;
    await mockChain.fundSubscription(subId, FUND);
  } else {
    if (chainId) {
      VRFAddress = networkHelper[chainId].vrfCoordinatorV2;
      subId = networkHelper[chainId].subId;
      waitConfirmationTime = networkHelper[chainId].blockConfirmation;
    }
  }

  const args = chainId
    ? [
        VRFAddress,
        subId,
        networkHelper[chainId].gasLane,
        networkHelper[chainId].callbackGasLimit,
        networkHelper[chainId].raffleEntranceFee,
        networkHelper[chainId].callbackGasLimit,
      ]
    : [];

  const res = await deploy("Raffle", {
    from: deployer,
    args: args,
    waitConfirmations: waitConfirmationTime > 0 ? waitConfirmationTime : 1,
    log: true,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    const contractAddress = await res.address;
    await verify(contractAddress, args);
  }
};

DeployRaffle.tags = ["raffle", "all"];

export default DeployRaffle;
