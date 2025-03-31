// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IWETH9 as IWETH} from "./interfaces/IWETH9.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LattePool is ReentrancyGuard {
  address public immutable sequencer;

  mapping(address => uint256) public debtBalance;
  mapping(bytes32 => bool) public usedMessages;

  event Borrowed(address indexed user, uint256 amount);
  event Repaid(address indexed user, uint256 amount);

  error InsufficientLiquidity();
  error RepayTooMuch();
  error InvalidSignature();
  error MessageUsed();
  error Expired();

  constructor(address _sequencer) {
    sequencer = _sequencer;
  }

  receive() external payable {}

  function borrowWithSig(
    uint256 amount,
    uint256 maxDebtAllowed,
    uint256 deadline,
    bytes calldata sig
  ) external nonReentrant {
    if (block.timestamp > deadline) revert Expired();

    bytes32 rawMessage = keccak256(
      abi.encodePacked(
        msg.sender,
        amount,
        maxDebtAllowed,
        deadline,
        address(this)
      )
    );

    if (usedMessages[rawMessage]) revert MessageUsed();
    if (!verifySignature(sequencer, rawMessage, sig)) revert InvalidSignature();

    if (debtBalance[msg.sender] + amount > maxDebtAllowed) revert();
    if (address(this).balance < amount) revert InsufficientLiquidity();

    usedMessages[rawMessage] = true;
    debtBalance[msg.sender] += amount;
    payable(msg.sender).transfer(amount);

    emit Borrowed(msg.sender, amount);
  }

  function repayWithSig(
    uint256 amount,
    uint256 currentDebt,
    uint256 deadline,
    bytes calldata sig
  ) external payable nonReentrant {
    if (block.timestamp > deadline) revert Expired();
    if (msg.value != amount) revert();

    bytes32 rawMessage = keccak256(
      abi.encodePacked(msg.sender, amount, currentDebt, deadline, address(this))
    );

    if (usedMessages[rawMessage]) revert MessageUsed();
    if (!verifySignature(sequencer, rawMessage, sig)) revert InvalidSignature();

    if (amount > currentDebt) revert RepayTooMuch();

    usedMessages[rawMessage] = true;
    debtBalance[msg.sender] -= amount;

    emit Repaid(msg.sender, amount);
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
