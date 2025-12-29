// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DEX is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public tokenA;
    address public tokenB;

    IERC20 private immutable tokenAContract;
    IERC20 private immutable tokenBContract;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;

        tokenAContract = IERC20(_tokenA);
        tokenBContract = IERC20(_tokenB);
    }

    // ------------------ LIQUIDITY ------------------

    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        nonReentrant
        returns (uint256 liquidityMinted)
    {
        require(amountA > 0 && amountB > 0, "Zero amount");

        tokenAContract.safeTransferFrom(msg.sender, address(this), amountA);
        tokenBContract.safeTransferFrom(msg.sender, address(this), amountB);

        if (totalLiquidity == 0) {
            liquidityMinted = _sqrt(amountA * amountB);
        } else {
            require(
                amountB * reserveA == amountA * reserveB,
                "Ratio mismatch"
            );
            liquidityMinted = (amountA * totalLiquidity) / reserveA;
        }

        require(liquidityMinted > 0, "Zero liquidity");

        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;

        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }

    function removeLiquidity(uint256 liquidityAmount)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidityAmount > 0, "Zero liquidity");
        require(liquidity[msg.sender] >= liquidityAmount, "Not enough LP");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;

        reserveA -= amountA;
        reserveB -= amountB;

        tokenAContract.safeTransfer(msg.sender, amountA);
        tokenBContract.safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }

    // ------------------ SWAPS ------------------

    function swapAForB(uint256 amountAIn)
        external
        nonReentrant
        returns (uint256 amountBOut)
    {
        require(amountAIn > 0, "Zero swap");

        tokenAContract.safeTransferFrom(
            msg.sender,
            address(this),
            amountAIn
        );

        amountBOut = getAmountOut(amountAIn, reserveA, reserveB);
        require(amountBOut > 0, "Insufficient output");

        reserveA += amountAIn;
        reserveB -= amountBOut;

        tokenBContract.safeTransfer(msg.sender, amountBOut);

        emit Swap(msg.sender, tokenA, tokenB, amountAIn, amountBOut);
    }

    function swapBForA(uint256 amountBIn)
        external
        nonReentrant
        returns (uint256 amountAOut)
    {
        require(amountBIn > 0, "Zero swap");

        tokenBContract.safeTransferFrom(
            msg.sender,
            address(this),
            amountBIn
        );

        amountAOut = getAmountOut(amountBIn, reserveB, reserveA);
        require(amountAOut > 0, "Insufficient output");

        reserveB += amountBIn;
        reserveA -= amountAOut;

        tokenAContract.safeTransfer(msg.sender, amountAOut);

        emit Swap(msg.sender, tokenB, tokenA, amountBIn, amountAOut);
    }

    // ------------------ VIEWS ------------------

    function getPrice() external view returns (uint256 price) {
        if (reserveA == 0) return 0;
        return reserveB / reserveA;
    }

    function getReserves()
        external
        view
        returns (uint256 _reserveA, uint256 _reserveB)
    {
        return (reserveA, reserveB);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Zero input");
        require(reserveIn > 0 && reserveOut > 0, "No liquidity");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    // ------------------ MATH ------------------

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
