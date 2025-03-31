// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/LattePool.sol";

contract LattePoolTest is Test {
  LattePool public pool;

  uint256 sequencerPrivateKey = 1;
  address sequencer = vm.addr(sequencerPrivateKey);
  address user = vm.addr(2);
  address anotherUser = vm.addr(3);

  function setUp() public {
    pool = new LattePool(sequencer);
    vm.deal(address(pool), 10 ether);
    vm.deal(user, 5 ether);
    vm.deal(anotherUser, 5 ether);
  }

  function testBorrowWithSig() public {
    uint256 amount = 1 ether;
    uint256 maxDebt = 2 ether;
    uint256 deadline = block.timestamp + 1 hours;

    bytes memory sig = signMessageHelper(
      sequencerPrivateKey,
      user,
      amount,
      maxDebt,
      deadline,
      address(pool)
    );

    vm.prank(user);
    pool.borrowWithSig(amount, maxDebt, deadline, sig);

    assertEq(pool.debtBalance(user), 1 ether);
    assertEq(user.balance, 6 ether); // originally 5 ether
  }

  function testBorrowInsufficientLiquidityWithSig() public {
    uint256 amount = 11 ether;
    uint256 maxDebt = 20 ether;
    uint256 deadline = block.timestamp + 1 hours;

    bytes memory sig = signMessageHelper(
      sequencerPrivateKey,
      user,
      amount,
      maxDebt,
      deadline,
      address(pool)
    );

    vm.prank(user);
    vm.expectRevert(LattePool.InsufficientLiquidity.selector);
    pool.borrowWithSig(amount, maxDebt, deadline, sig);
  }

  function testRepayWithSigPartial() public {
    // Borrow first
    uint256 borrowAmount = 2 ether;
    uint256 maxDebt = 3 ether;
    uint256 borrowDeadline = block.timestamp + 1 hours;
    bytes memory borrowSig = signMessageHelper(
      sequencerPrivateKey,
      user,
      borrowAmount,
      maxDebt,
      borrowDeadline,
      address(pool)
    );

    vm.prank(user);
    pool.borrowWithSig(borrowAmount, maxDebt, borrowDeadline, borrowSig);

    // Repay 1 ether
    uint256 repayAmount = 1 ether;
    uint256 currentDebt = 2 ether;
    uint256 repayDeadline = block.timestamp + 1 hours;
    bytes memory repaySig = signMessageHelper(
      sequencerPrivateKey,
      user,
      repayAmount,
      currentDebt,
      repayDeadline,
      address(pool)
    );

    vm.prank(user);
    pool.repayWithSig{value: repayAmount}(
      repayAmount,
      currentDebt,
      repayDeadline,
      repaySig
    );

    assertEq(pool.debtBalance(user), 1 ether);
  }

  function testRepayWithSigFull() public {
    uint256 borrowAmount = 1.5 ether;
    uint256 borrowDeadline = block.timestamp + 1 hours;

    // --- Borrow ---
    bytes memory borrowSig = signMessageHelper(
      sequencerPrivateKey,
      user,
      borrowAmount,
      borrowAmount,
      borrowDeadline,
      address(pool)
    );

    vm.prank(user);
    pool.borrowWithSig(borrowAmount, borrowAmount, borrowDeadline, borrowSig);

    // --- Repay ---
    uint256 repayDeadline = block.timestamp + 2 hours; // <- different from borrow
    bytes memory repaySig = signMessageHelper(
      sequencerPrivateKey,
      user,
      borrowAmount,
      borrowAmount,
      repayDeadline,
      address(pool)
    );

    vm.prank(user);
    pool.repayWithSig{value: borrowAmount}(
      borrowAmount,
      borrowAmount,
      repayDeadline,
      repaySig
    );

    assertEq(pool.debtBalance(user), 0);
  }

  function testRepayTooMuchWithSigShouldRevert() public {
    uint256 borrowAmount = 1 ether;
    uint256 borrowDeadline = block.timestamp + 1 hours;
    bytes memory borrowSig = signMessageHelper(
      sequencerPrivateKey,
      user,
      borrowAmount,
      borrowAmount,
      borrowDeadline,
      address(pool)
    );

    vm.prank(user);
    pool.borrowWithSig(borrowAmount, borrowAmount, borrowDeadline, borrowSig);

    uint256 repayAmount = 2 ether; // overpay
    bytes memory repaySig = signMessageHelper(
      sequencerPrivateKey,
      user,
      repayAmount,
      borrowAmount,
      block.timestamp + 1 hours,
      address(pool)
    );

    vm.prank(user);
    vm.expectRevert(LattePool.RepayTooMuch.selector);
    pool.repayWithSig{value: repayAmount}(
      repayAmount,
      borrowAmount,
      block.timestamp + 1 hours,
      repaySig
    );
  }

  function testMultipleUsersIndependentDebtWithSig() public {
    // user borrows 1 ether
    bytes memory sig1 = signMessageHelper(
      sequencerPrivateKey,
      user,
      1 ether,
      2 ether,
      block.timestamp + 1 hours,
      address(pool)
    );

    vm.prank(user);
    pool.borrowWithSig(1 ether, 2 ether, block.timestamp + 1 hours, sig1);

    // anotherUser borrows 2 ether
    bytes memory sig2 = signMessageHelper(
      sequencerPrivateKey,
      anotherUser,
      2 ether,
      3 ether,
      block.timestamp + 1 hours,
      address(pool)
    );

    vm.prank(anotherUser);
    pool.borrowWithSig(2 ether, 3 ether, block.timestamp + 1 hours, sig2);

    assertEq(pool.debtBalance(user), 1 ether);
    assertEq(pool.debtBalance(anotherUser), 2 ether);
  }

  // Shared signing helper
  function signMessageHelper(
    uint256 pk,
    address user_,
    uint256 a,
    uint256 b,
    uint256 deadline,
    address contractAddr
  ) internal pure returns (bytes memory) {
    bytes32 rawMessage = keccak256(
      abi.encodePacked(user_, a, b, deadline, contractAddr)
    );

    bytes32 ethSignedMessage = keccak256(
      abi.encodePacked("\x19Ethereum Signed Message:\n32", rawMessage)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedMessage);
    return abi.encodePacked(r, s, v);
  }
}
