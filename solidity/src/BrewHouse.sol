// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IWETH9 as IWETH} from "./interfaces/IWETH9.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BrewHouse is ReentrancyGuard {
  using SafeERC20 for IERC20;

  error InsufficientCollateral();
  error OnlySequencer();
  error InvalidSignature();
  error MessageUsed();

  address public sequencer;
  IWETH public weth;

  mapping(address => uint256) public collateralBalance;
  mapping(bytes32 => bool) public usedMessages;

  event CollateralDeposited(address indexed user, uint256 amount);
  event CollateralWithdrawn(address indexed user, uint256 amount);
  event CollateralSlashed(
    address indexed user,
    uint256 amount,
    address indexed slasher
  );

  constructor(address _sequencer, address _weth) {
    sequencer = _sequencer;
    weth = IWETH(_weth);
  }

  function depositCollateral() external payable nonReentrant {
    weth.deposit{value: msg.value}();
    collateralBalance[msg.sender] += msg.value;
    emit CollateralDeposited(msg.sender, msg.value);
  }

  function withdrawWithSig(
    uint256 amount,
    uint256 deadline,
    bytes calldata sig
  ) external nonReentrant {
    require(block.timestamp <= deadline, "Expired");

    bytes32 rawMessage = keccak256(
      abi.encodePacked(msg.sender, amount, deadline, address(this))
    );

    if (usedMessages[rawMessage]) revert MessageUsed();
    if (!verifySignature(sequencer, rawMessage, sig)) revert InvalidSignature();

    if (collateralBalance[msg.sender] < amount) revert InsufficientCollateral();

    usedMessages[rawMessage] = true;
    collateralBalance[msg.sender] -= amount;
    weth.withdraw(amount);
    payable(msg.sender).transfer(amount);

    emit CollateralWithdrawn(msg.sender, amount);
  }

  function slashCollateral(
    address user,
    uint256 amount
  ) external onlySequencer {
    if (collateralBalance[user] < amount) revert InsufficientCollateral();
    collateralBalance[user] -= amount;
    weth.withdraw(amount);
    payable(sequencer).transfer(amount);
    emit CollateralSlashed(user, amount, msg.sender);
  }

  receive() external payable {}

  modifier onlySequencer() {
    if (msg.sender != sequencer) revert OnlySequencer();
    _;
  }

  function verifySignature(
    address expectedSigner,
    bytes32 rawMessage,
    bytes memory sig
  ) internal pure returns (bool) {
    bytes32 ethSignedMessage = keccak256(
      abi.encodePacked("\x19Ethereum Signed Message:\n32", rawMessage)
    );

    (bytes32 r, bytes32 s, uint8 v) = splitSignature(sig);
    address recovered = ecrecover(ethSignedMessage, v, r, s);
    return recovered == expectedSigner;
  }

  function splitSignature(
    bytes memory sig
  ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
    require(sig.length == 65, "Invalid signature length");

    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := byte(0, mload(add(sig, 96)))
    }

    // Normalize v if needed
    if (v < 27) {
      v += 27;
    }
  }
}
