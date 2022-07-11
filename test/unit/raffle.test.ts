import { deployments, ethers, network } from "hardhat";
import { developmentChains } from "../../network-hardha.config";
import { Raffle } from "../../typechain-types/contracts/Raffle";
import type { VRFCoordinatorV2Mock } from "../../typechain-types/@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock";
import { Address } from "hardhat-deploy/dist/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { expect, assert } from "chai";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Contract", () => {
      // required variables
      let raffleContract: Raffle;
      let vrfMockCoordinator: VRFCoordinatorV2Mock;
      let accounts: SignerWithAddress[];
      let player: SignerWithAddress;
      let raffleForPlayer: Raffle;
      let raffleEntryFee: BigNumber;
      let interval: BigNumber;
      // Before Each
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        player = accounts[1];

        // deploying all the contracts
        await deployments.fixture(["all"]);

        vrfMockCoordinator = await ethers.getContract("VRFCoordinatorV2Mock"); //VRFCoordinatorV2Mock

        raffleContract = await ethers.getContract("Raffle");

        raffleForPlayer = await raffleContract.connect(player);

        raffleEntryFee = await raffleContract.getEntranceFee();

        interval = await raffleContract.getInterval();
      });

      describe("Constructor function", () => {
        it("Initializes the constructor function correctly.", async () => {
          const raffleState = await raffleContract.getRaffleState();

          assert(raffleState.toString(), "0");
        });
      });

      describe("Enter Raffle", () => {
        it("reverting when you do not pay enough", async () => {
          await expect(raffleForPlayer.enterRaffle()).to.be.revertedWith(
            "Raffle__SendMoreToEnterRaffle"
          );
        });

        it("register player when entered successfully", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          const playerFromRaffle = await raffleForPlayer.getPlayer(0);
          expect(playerFromRaffle, player.address);
        });

        it("the method emits an event thereupon registration of a new player", async () => {
          await expect(
            raffleForPlayer.enterRaffle({ value: raffleEntryFee })
          ).to.emit(raffleForPlayer, "RaffleEnter");
        });

        it("Do not allow anyone to enter while it is calculating the winner. ", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          await network.provider.request({ method: "evm_mine", params: [] });

          await raffleForPlayer.performUpkeep([]);

          await expect(
            raffleForPlayer.enterRaffle({ value: raffleEntryFee })
          ).to.revertedWith("Raffle__RaffleNotOpen");
        });
      });

      describe("CheckUpKeep", () => {
        it("it will fail if theres nothing to give by the contract to the winner", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });

          const { upkeepNeeded } = await raffleForPlayer.checkUpkeep("0x");

          assert(!upkeepNeeded);
        });

        it("it will return false if raffle is not open", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await raffleForPlayer.performUpkeep([]);
          const raffleState = await raffleForPlayer.getRaffleState();
          const { upkeepNeeded } = await raffleForPlayer.callStatic.checkUpkeep(
            "0x"
          );
          assert.equal(raffleState.toString() === "1", upkeepNeeded === false);
        });

        it("return false if enough time hasn't passed. ", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffleForPlayer.callStatic.checkUpkeep(
            "0x"
          );
          assert(!upkeepNeeded);
        });

        it("returns true if enough time has passed, has players, has money to give, and state is open.", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffleForPlayer.callStatic.checkUpkeep(
            "0x"
          );
          assert(upkeepNeeded);
        });
      });

      describe("performUpKeep", () => {
        it("it can only run if upkeepneeded is true", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await raffleForPlayer.performUpkeep("0x");
          assert(tx);
        });

        it("reverts if the upkeepneeded is false", async () => {
          await expect(raffleForPlayer.performUpkeep("0x")).to.be.revertedWith(
            "Raffle__UpkeepNotNeeded"
          );
        });

        it("updates the raffle state and emits a requestId", async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const txRes = await raffleForPlayer.performUpkeep("0x");
          const txReceipt = await txRes.wait(1);
          const raffleState = await raffleForPlayer.getRaffleState();
          const requestId = txReceipt.events
            ? txReceipt.events[1]?.args?.requestId
            : null;

          assert(requestId.toNumber() > 0);
          assert(raffleState == 1);
        });
      });

      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });

        it("It can only be called after perform upkeep", async () => {
          await expect(
            vrfMockCoordinator.fulfillRandomWords(0, raffleForPlayer.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfMockCoordinator.fulfillRandomWords(1, raffleForPlayer.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("it picks the random winner, sends money to it and resets", async () => {
          const additionEntry = 3;
          const startingFrom = 2;
          for (let i = startingFrom; i < startingFrom + additionEntry; i++) {
            raffleForPlayer = raffleContract.connect(accounts[i]);
            await raffleForPlayer.enterRaffle({ value: raffleEntryFee });
          }

          const timeStamp = await raffleForPlayer.getLastTimeStamp();

          await new Promise<void>(async (resolve, reject) => {
            raffleForPlayer.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");

              try {
                const recentWinner = await raffleForPlayer.getRecentWinner();
                const raffleState = await raffleForPlayer.getRaffleState();
                const winnerBalance = await accounts[2].getBalance();
                const endingTime = await raffleForPlayer.getLastTimeStamp();
                await expect(raffleForPlayer.getPlayer(0)).to.be.reverted;
                console.log("winner is second dude.");
                assert.equal(recentWinner.toString(), accounts[2].address);
                console.log("raffle is ready to start again.");
                assert.equal(raffleState, 0);
                console.log("winner balance is total entry.");
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    .add(raffleEntryFee.mul(additionEntry).add(raffleEntryFee))
                    .toString()
                );
                assert(endingTime > timeStamp);
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const tx = await raffleForPlayer.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const startingBalance = await accounts[2].getBalance();
            const requestId = txReceipt.events
              ? txReceipt.events[1]?.args?.requestId
              : null;
            await vrfMockCoordinator.fulfillRandomWords(
              requestId,
              raffleForPlayer.address
            );
          });
        });
      });
    });
