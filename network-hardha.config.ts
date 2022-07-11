export const networkHelper: {
  [key: number]: {
    name: string;
    subId: string;
    blockConfirmation: number;
    gasLane: string;
    keepersUpdateInterval: string;
    raffleEntranceFee: string;
    callbackGasLimit: string;
    vrfCoordinatorV2?: string;
  };
} = {
  31337: {
    name: "localhost",
    subId: "588",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntranceFee: "100000000000000000", // 0.1 ETH
    callbackGasLimit: "500000", // 500,000 gas
    blockConfirmation: 1,
  },
  4: {
    name: "rinkeby",
    subId: "8277",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntranceFee: "10000000000000", // 0.1 ETH
    callbackGasLimit: "500000", // 500,000 gas
    vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    blockConfirmation: 4,
  },
};

export const developmentChains = ["hardhat", "localhost"];
