const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LostFoundRegistry Contract", function () {
  let LostFoundRegistry;
  let registry;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    LostFoundRegistry = await ethers.getContractFactory("LostFoundRegistry");
    registry = await LostFoundRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("Should deploy and assign contract owner correctly", async function () {
      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.getItemCount()).to.equal(0);
      expect(await registry.totalLostCount()).to.equal(0);
      expect(await registry.totalFoundCount()).to.equal(0);
      expect(await registry.totalResolvedCount()).to.equal(0);
    });
  });

  describe("Registering Lost and Found Items (Valid Inputs)", function () {
    it("Should register a Lost item successfully and emit event", async function () {
      const tx = await registry.connect(user1).registerLostItem(
        "Blue Leather Wallet",
        "Contains student ID card and bus pass",
        "Block C Library, 2nd Floor",
        "student1@college.edu"
      );

      await expect(tx)
        .to.emit(registry, "ItemRegistered")
        .withArgs(1, "Blue Leather Wallet", 0, user1.address, "Block C Library, 2nd Floor", (await ethers.provider.getBlock(tx.blockNumber)).timestamp);

      expect(await registry.getItemCount()).to.equal(1);
      expect(await registry.totalLostCount()).to.equal(1);
      expect(await registry.totalFoundCount()).to.equal(0);

      const item = await registry.getItem(1);
      expect(item.id).to.equal(1);
      expect(item.title).to.equal("Blue Leather Wallet");
      expect(item.description).to.equal("Contains student ID card and bus pass");
      expect(item.location).to.equal("Block C Library, 2nd Floor");
      expect(item.contactInfo).to.equal("student1@college.edu");
      expect(item.status).to.equal(0); // ItemStatus.Lost
      expect(item.reporter).to.equal(user1.address);
      expect(item.isResolved).to.equal(false);
    });

    it("Should register a Found item successfully and emit event", async function () {
      const tx = await registry.connect(user2).registerFoundItem(
        "HP Scientific Calculator",
        "Black casing with silver buttons, found under desk 14",
        "Room 304 Computer Lab",
        "student2@college.edu"
      );

      await expect(tx)
        .to.emit(registry, "ItemRegistered")
        .withArgs(1, "HP Scientific Calculator", 1, user2.address, "Room 304 Computer Lab", (await ethers.provider.getBlock(tx.blockNumber)).timestamp);

      expect(await registry.getItemCount()).to.equal(1);
      expect(await registry.totalFoundCount()).to.equal(1);
      expect(await registry.totalLostCount()).to.equal(0);
    });

    it("Should retrieve all items correctly", async function () {
      await registry.connect(user1).registerLostItem("Keys", "Keychain with red tag", "Cafeteria", "9876543210");
      await registry.connect(user2).registerFoundItem("Water Bottle", "Steel insulated flask", "Sports Ground", "9123456780");

      const allItems = await registry.getAllItems();
      expect(allItems.length).to.equal(2);
      expect(allItems[0].title).to.equal("Keys");
      expect(allItems[1].title).to.equal("Water Bottle");
    });

    it("Should retrieve items reported by a specific address", async function () {
      await registry.connect(user1).registerLostItem("Item A", "Desc A", "Loc A", "Contact A");
      await registry.connect(user2).registerFoundItem("Item B", "Desc B", "Loc B", "Contact B");
      await registry.connect(user1).registerLostItem("Item C", "Desc C", "Loc C", "Contact C");

      const user1Items = await registry.getItemsByReporter(user1.address);
      expect(user1Items.length).to.equal(2);
      expect(user1Items[0]).to.equal(1);
      expect(user1Items[1]).to.equal(3);
    });

    it("Should return correct registry statistics", async function () {
      await registry.connect(user1).registerLostItem("Item 1", "Desc", "Loc", "Contact");
      await registry.connect(user2).registerFoundItem("Item 2", "Desc", "Loc", "Contact");

      const stats = await registry.getRegistryStats();
      expect(stats.totalItems).to.equal(2);
      expect(stats.lostCount).to.equal(1);
      expect(stats.foundCount).to.equal(1);
      expect(stats.resolvedCount).to.equal(0);
    });
  });

  describe("Resolving Items & Access Control", function () {
    beforeEach(async function () {
      await registry.connect(user1).registerLostItem("Laptop Charger", "65W USB-C charger", "Auditorium", "contact@test.com");
    });

    it("Should allow the reporter to mark item as resolved", async function () {
      const tx = await registry.connect(user1).resolveItem(1);

      await expect(tx)
        .to.emit(registry, "ItemStatusUpdated")
        .withArgs(1, 0, 3, user1.address, (await ethers.provider.getBlock(tx.blockNumber)).timestamp);

      const item = await registry.getItem(1);
      expect(item.status).to.equal(3); // ItemStatus.Resolved
      expect(item.isResolved).to.equal(true);
      expect(await registry.totalResolvedCount()).to.equal(1);
    });

    it("Should allow the contract owner to mark item as resolved", async function () {
      await registry.connect(owner).resolveItem(1);
      const item = await registry.getItem(1);
      expect(item.isResolved).to.equal(true);
    });

    it("Should reject unauthorized user from resolving an item (Unauthorized Input)", async function () {
      await expect(
        registry.connect(user2).resolveItem(1)
      ).to.be.revertedWith("LostFoundRegistry: Unauthorized! Only reporter or contract owner can update item");
    });

    it("Should reject resolving an already resolved item (Invalid State Transition)", async function () {
      await registry.connect(user1).resolveItem(1);
      await expect(
        registry.connect(user1).resolveItem(1)
      ).to.be.revertedWith("LostFoundRegistry: Item is already marked as resolved");
    });
  });

  describe("Input Validation & Edge Cases (Invalid Inputs)", function () {
    it("Should revert when title is empty", async function () {
      await expect(
        registry.connect(user1).registerLostItem("", "Description here", "Location here", "Contact")
      ).to.be.revertedWith("LostFoundRegistry: Title cannot be empty");
    });

    it("Should revert when description is empty", async function () {
      await expect(
        registry.connect(user1).registerLostItem("Phone", "", "Location here", "Contact")
      ).to.be.revertedWith("LostFoundRegistry: Description cannot be empty");
    });

    it("Should revert when location is empty", async function () {
      await expect(
        registry.connect(user1).registerLostItem("Phone", "Black iPhone", "", "Contact")
      ).to.be.revertedWith("LostFoundRegistry: Location cannot be empty");
    });

    it("Should revert when querying invalid item ID (0 or non-existent)", async function () {
      await expect(
        registry.getItem(0)
      ).to.be.revertedWith("LostFoundRegistry: Item ID does not exist");

      await expect(
        registry.getItem(999)
      ).to.be.revertedWith("LostFoundRegistry: Item ID does not exist");
    });
  });
});
