// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LostFoundRegistry
 * @dev Decentralized registry for recording and tracking Lost & Found items on Ethereum.
 * CSE4444: Blockchain Technology - Assignment 2
 */
contract LostFoundRegistry {
    // --- Data Structures ---
    enum ItemStatus { Lost, Found, Claimed, Resolved }

    struct Item {
        uint256 id;
        string title;
        string description;
        string location;
        string contactInfo;
        ItemStatus status;
        address reporter;
        uint256 timestamp;
        bool isResolved;
    }

    // --- State Variables ---
    address public owner;
    uint256 private _itemCounter;

    mapping(uint256 => Item) private _items;
    mapping(address => uint256[]) private _reporterItems;

    uint256 public totalLostCount;
    uint256 public totalFoundCount;
    uint256 public totalResolvedCount;

    // --- Events ---
    event ItemRegistered(
        uint256 indexed id,
        string title,
        ItemStatus indexed status,
        address indexed reporter,
        string location,
        uint256 timestamp
    );

    event ItemStatusUpdated(
        uint256 indexed id,
        ItemStatus indexed previousStatus,
        ItemStatus indexed newStatus,
        address updatedBy,
        uint256 timestamp
    );

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "LostFoundRegistry: Caller is not the contract owner");
        _;
    }

    modifier validItem(uint256 itemId) {
        require(itemId > 0 && itemId <= _itemCounter, "LostFoundRegistry: Item ID does not exist");
        _;
    }

    modifier onlyReporterOrOwner(uint256 itemId) {
        require(
            msg.sender == _items[itemId].reporter || msg.sender == owner,
            "LostFoundRegistry: Unauthorized! Only reporter or contract owner can update item"
        );
        _;
    }

    // --- Constructor ---
    constructor() {
        owner = msg.sender;
        _itemCounter = 0;
    }

    // --- Core Functions ---

    /**
     * @dev Register a newly lost item
     */
    function registerLostItem(
        string calldata title,
        string calldata description,
        string calldata location,
        string calldata contactInfo
    ) external returns (uint256) {
        return _registerItem(title, description, location, contactInfo, ItemStatus.Lost);
    }

    /**
     * @dev Register a newly found item
     */
    function registerFoundItem(
        string calldata title,
        string calldata description,
        string calldata location,
        string calldata contactInfo
    ) external returns (uint256) {
        return _registerItem(title, description, location, contactInfo, ItemStatus.Found);
    }

    /**
     * @dev Internal helper to validate and store an item record
     */
    function _registerItem(
        string calldata title,
        string calldata description,
        string calldata location,
        string calldata contactInfo,
        ItemStatus status
    ) internal returns (uint256) {
        require(bytes(title).length > 0, "LostFoundRegistry: Title cannot be empty");
        require(bytes(description).length > 0, "LostFoundRegistry: Description cannot be empty");
        require(bytes(location).length > 0, "LostFoundRegistry: Location cannot be empty");

        _itemCounter++;
        uint256 newId = _itemCounter;

        _items[newId] = Item({
            id: newId,
            title: title,
            description: description,
            location: location,
            contactInfo: contactInfo,
            status: status,
            reporter: msg.sender,
            timestamp: block.timestamp,
            isResolved: false
        });

        _reporterItems[msg.sender].push(newId);

        if (status == ItemStatus.Lost) {
            totalLostCount++;
        } else if (status == ItemStatus.Found) {
            totalFoundCount++;
        }

        emit ItemRegistered(newId, title, status, msg.sender, location, block.timestamp);
        return newId;
    }

    /**
     * @dev Mark an item as Claimed/Resolved. Restricted to the original reporter or contract owner.
     */
    function resolveItem(uint256 itemId) external validItem(itemId) onlyReporterOrOwner(itemId) {
        Item storage item = _items[itemId];
        require(!item.isResolved, "LostFoundRegistry: Item is already marked as resolved");

        ItemStatus prevStatus = item.status;
        item.status = ItemStatus.Resolved;
        item.isResolved = true;
        totalResolvedCount++;

        emit ItemStatusUpdated(itemId, prevStatus, ItemStatus.Resolved, msg.sender, block.timestamp);
    }

    // --- View / Retrieval Functions ---

    /**
     * @dev Retrieve a single item by its ID
     */
    function getItem(uint256 itemId) external view validItem(itemId) returns (Item memory) {
        return _items[itemId];
    }

    /**
     * @dev Get total number of registered items
     */
    function getItemCount() external view returns (uint256) {
        return _itemCounter;
    }

    /**
     * @dev Retrieve all registered items (for display in frontend)
     */
    function getAllItems() external view returns (Item[] memory) {
        Item[] memory list = new Item[](_itemCounter);
        for (uint256 i = 1; i <= _itemCounter; i++) {
            list[i - 1] = _items[i];
        }
        return list;
    }

    /**
     * @dev Retrieve all item IDs submitted by a specific user/reporter
     */
    function getItemsByReporter(address reporter) external view returns (uint256[] memory) {
        return _reporterItems[reporter];
    }

    /**
     * @dev Retrieve summary statistics of the registry
     */
    function getRegistryStats() external view returns (
        uint256 totalItems,
        uint256 lostCount,
        uint256 foundCount,
        uint256 resolvedCount
    ) {
        return (_itemCounter, totalLostCount, totalFoundCount, totalResolvedCount);
    }
}
