// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/BrewHouse.sol";
import "../src/interfaces/IWETH9.sol";
import "./MockWETH.sol";

contract BrewHouseTest is Test {
  BrewHouse public brewHouse;
  MockWETH public weth;

  uint256 sequencerPrivateKey = 1;
  address sequencer = vm.addr(sequencerPrivateKey);
  address user = vm.addr(2);

  function setUp() public {
    weth = new MockWETH();
    vm.deal(user, 10 ether);
    vm.deal(sequencer, 10 ether);
    brewHouse = new BrewHouse(sequencer, address(weth));
    vm.deal(address(brewHouse), 5 ether); // for paying out withdraws
  }

  function testDepositCollateral() public {
    vm.startPrank(user);
    brewHouse.depositCollateral{value: 1 ether}();
    assertEq(brewHouse.collateralBalance(user), 1 ether);
    vm.stopPrank();
  }

  function testWithdrawWithSig() public {
    vm.startPrank(user);
    brewHouse.depositCollateral{value: 1 ether}();
    vm.stopPrank();

    uint256 amount = 0.5 ether;
    uint256 deadline = block.timestamp + 1 hours;

    bytes memory sig = signMessageHelper(
      sequencerPrivateKey,
      user,
      amount,
      deadline,
      address(brewHouse)
    );

    uint256 userBalanceBefore = user.balance;

    vm.prank(user);
    brewHouse.withdrawWithSig(amount, deadline, sig);

    assertEq(brewHouse.collateralBalance(user), 0.5 ether);
    assertGt(user.balance, userBalanceBefore);
  }

  function signMessageHelper(
    uint256 pk,
    address user_,
    uint256 amount,
    uint256 deadline,
    address contractAddress
  ) internal pure returns (bytes memory) {
    bytes32 rawMessage = keccak256(
      abi.encodePacked(user_, amount, deadline, contractAddress)
    );

    bytes32 ethSignedMessage = keccak256(
      abi.encodePacked("\x19Ethereum Signed Message:\n32", rawMessage)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedMessage);
    return abi.encodePacked(r, s, v);
  }

  function testWithdrawReplayShouldRevert() public {
    vm.prank(user);
    brewHouse.depositCollateral{value: 1 ether}();

    uint256 amount = 0.5 ether;
    uint256 deadline = block.timestamp + 1 hours;

    bytes memory sig = signMessageHelper(
      sequencerPrivateKey,
      user,
      amount,
      deadline,
      address(brewHouse)
    );

    vm.prank(user);
    brewHouse.withdrawWithSig(amount, deadline, sig);

    vm.prank(user);
    vm.expectRevert(BrewHouse.MessageUsed.selector);
    brewHouse.withdrawWithSig(amount, deadline, sig);
  }

  function testWithdrawWithInvalidSignatureShouldRevert() public {
    vm.prank(user);
    brewHouse.depositCollateral{value: 1 ether}();

    uint256 amount = 0.5 ether;
    uint256 deadline = block.timestamp + 1 hours;

    // Fake signer (not sequencer)
    bytes memory sig = signMessageHelper(
      999, // Invalid private key
      user,
      amount,
      deadline,
      address(brewHouse)
    );

    vm.prank(user);
    vm.expectRevert(BrewHouse.InvalidSignature.selector);
    brewHouse.withdrawWithSig(amount, deadline, sig);
  }

  function testWithdrawExpiredShouldRevert() public {
    vm.prank(user);
    brewHouse.depositCollateral{value: 1 ether}();

    uint256 amount = 0.5 ether;
    uint256 deadline = block.timestamp - 1; // Already expired

    bytes memory sig = signMessageHelper(
      sequencerPrivateKey,
      user,
      amount,
      deadline,
      address(brewHouse)
    );

    vm.prank(user);
    vm.expectRevert("Expired");
    brewHouse.withdrawWithSig(amount, deadline, sig);
  }

  function testOnlySequencerCanSlash() public {
    vm.startPrank(user);
    brewHouse.depositCollateral{value: 1 ether}();
    vm.stopPrank();

    address notSequencer = vm.addr(3);
    vm.startPrank(notSequencer);
    vm.expectRevert(BrewHouse.OnlySequencer.selector);
    brewHouse.slashCollateral(user, 0.5 ether);
    vm.stopPrank();
  }

  function testSequencerCanSlash() public {
    vm.prank(user);
    brewHouse.depositCollateral{value: 1 ether}();

    vm.prank(sequencer);
    brewHouse.slashCollateral(user, 0.5 ether);

    assertEq(brewHouse.collateralBalance(user), 0.5 ether);
  }
}
