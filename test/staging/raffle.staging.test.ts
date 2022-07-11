import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { Address } from "hardhat-deploy/dist/types";
import { developmentChains } from "../../network-hardha.config";
import { Raffle } from "../../typechain-types/contracts/Raffle";

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging", () => {
      let raffle: Raffle;
      let entryFee: BigNumber;
      let deployer: Address;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        entryFee = await raffle.getEntranceFee();
      });

      describe("fulfill random words", () => {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
          console.log("Setting up test...");
          const startingTimeStamp = await raffle.getLastTimeStamp();
          const accounts = await ethers.getSigners();
          console.log("Setting up Listener...");

          await new Promise<void>(async (resolve, reject) => {
            // setup listener before we enter the raffle
            // Just in case the blockchain moves REALLY fast
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                // add our asserts here
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLastTimeStamp();

                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(entryFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });

            console.log("Entering Raffle...");
            const tx = await raffle.enterRaffle({ value: entryFee });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const winnerStartingBalance = await accounts[0].getBalance();
          });
        });
      });
    });
